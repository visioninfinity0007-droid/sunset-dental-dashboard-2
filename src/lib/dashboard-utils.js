// ─── Date helpers ──────────────────────────────────────────────────────────

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function startOfDay(value) {
  const d = toDate(value);
  if (!d) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value) {
  const d = toDate(value);
  if (!d) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

function toDayKey(value) {
  const d = toDate(value);
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function clampScore(value) {
  const parsed = Number(value);
  if (!isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
}

function leadActivityDate(lead) {
  return (
    toDate(lead.lastInteractionAt) ||
    toDate(lead.updatedAt) ||
    toDate(lead.createdAt) ||
    toDate(lead.appointmentSlotIso)
  );
}

function leadCreatedDate(lead) {
  return toDate(lead.createdAt) || leadActivityDate(lead);
}

function messageDate(msg) {
  return toDate(msg.timestamp);
}

function inRange(date, start, end) {
  if (!start && !end) return true;
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

// ─── Public API ────────────────────────────────────────────────────────────

export function parseFilters(searchParams) {
  const intent = String(searchParams.get?.("intent") || searchParams.intent || "all").toLowerCase();
  const supported = ["all", "hot", "warm", "cold", "emergency"].includes(intent) ? intent : "all";
  return {
    startDate: String(searchParams.get?.("start") || searchParams.start || ""),
    endDate: String(searchParams.get?.("end") || searchParams.end || ""),
    minScore: clampScore(searchParams.get?.("minScore") || searchParams.minScore || 0),
    intent: supported,
  };
}

export function filterLeads(leads, filters) {
  const start = startOfDay(filters.startDate);
  const end = endOfDay(filters.endDate);

  return [...leads]
    .filter((lead) => {
      const score = Number(lead.leadScore || 0);
      const intentLevel = String(lead.intentLevel || "").toLowerCase();
      if (score < filters.minScore) return false;
      if (filters.intent !== "all" && intentLevel !== filters.intent) return false;
      return inRange(leadActivityDate(lead), start, end);
    })
    .sort((a, b) => {
      const bDate = leadActivityDate(b)?.getTime() || 0;
      const aDate = leadActivityDate(a)?.getTime() || 0;
      return bDate - aDate;
    });
}

function getVisibleRange(data, filters) {
  const leadDates = (data.leads || []).map(leadActivityDate).filter(Boolean);
  const msgDates = (data.messages || []).map(messageDate).filter(Boolean);
  const allDates = [...leadDates, ...msgDates].sort((a, b) => a - b);

  const latestDate = allDates.at(-1) || new Date();

  const start = filters.startDate ? startOfDay(filters.startDate) : addDays(latestDate, -13);
  const end = filters.endDate ? endOfDay(filters.endDate) : latestDate;

  return { start: start || addDays(latestDate, -13), end: end || latestDate };
}

function buildTrend({ leads, messages }, rangeStart, rangeEnd) {
  const points = [];
  const msgByDay = new Map();
  const leadsByDay = new Map();
  const bookedByDay = new Map();

  messages.forEach((msg) => {
    const key = toDayKey(msg.timestamp);
    if (!key) return;
    msgByDay.set(key, (msgByDay.get(key) || 0) + 1);
  });

  leads.forEach((lead) => {
    const createdKey = toDayKey(lead.createdAt || lead.lastInteractionAt);
    if (createdKey) leadsByDay.set(createdKey, (leadsByDay.get(createdKey) || 0) + 1);
    if (String(lead.appointmentStatus || "").toLowerCase() === "booked") {
      const bKey = toDayKey(lead.appointmentSlotIso) || toDayKey(lead.updatedAt) || createdKey;
      if (bKey) bookedByDay.set(bKey, (bookedByDay.get(bKey) || 0) + 1);
    }
  });

  for (
    let cursor = startOfDay(rangeStart);
    cursor <= endOfDay(rangeEnd);
    cursor = addDays(cursor, 1)
  ) {
    const key = cursor.toISOString().slice(0, 10);
    points.push({
      date: key,
      messages: msgByDay.get(key) || 0,
      newLeads: leadsByDay.get(key) || 0,
      booked: bookedByDay.get(key) || 0,
    });
  }

  return points;
}

export function buildStats(data, filters) {
  const filteredLeads = filterLeads(data.leads || [], filters);
  const allowedPhones = new Set(
    filteredLeads.map((l) => String(l.phone || "").trim()).filter(Boolean),
  );
  const { start, end } = getVisibleRange(data, filters);

  const filteredMessages = filteredLeads.length
    ? (data.messages || []).filter((msg) => {
        const phone = String(msg.phone || "").trim();
        if (allowedPhones.size && !allowedPhones.has(phone)) return false;
        return inRange(messageDate(msg), start, end);
      })
    : [];

  const daysInRange = Math.max(
    1,
    Math.round((endOfDay(end) - startOfDay(start)) / 86400000) + 1,
  );
  const bookedCount = filteredLeads.filter(
    (l) => String(l.appointmentStatus || "").toLowerCase() === "booked",
  ).length;
  const hotLeadCount = filteredLeads.filter((l) => {
    const score = Number(l.leadScore || 0);
    const intent = String(l.intentLevel || "").toLowerCase();
    return score >= 60 || intent === "hot" || intent === "emergency";
  }).length;
  const latestLeadDay = filteredLeads
    .map((l) => toDayKey(leadCreatedDate(l)))
    .filter(Boolean)
    .sort()
    .at(-1);
  const newLeadsToday = latestLeadDay
    ? filteredLeads.filter((l) => toDayKey(leadCreatedDate(l)) === latestLeadDay).length
    : 0;

  // Source breakdown
  const sourceBreakdown = {};
  filteredLeads.forEach((l) => {
    const src = l.sourceChannel || "unknown";
    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
  });

  // Funnel
  const stageMap = {};
  filteredLeads.forEach((l) => {
    const s = (l.stage || "unknown").toLowerCase();
    stageMap[s] = (stageMap[s] || 0) + 1;
  });

  return {
    generatedAt: data.generatedAt || new Date().toISOString(),
    range: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      latestLeadDay: latestLeadDay || "",
    },
    summary: {
      messagesPerDay: Number((filteredMessages.length / daysInRange).toFixed(1)),
      newLeadsToday,
      appointmentsBooked: bookedCount,
      hotLeads: hotLeadCount,
      conversionRate: filteredLeads.length
        ? Number(((bookedCount / filteredLeads.length) * 100).toFixed(1))
        : 0,
    },
    trend: buildTrend({ leads: filteredLeads, messages: filteredMessages }, start, end),
    totals: { leads: filteredLeads.length, messages: filteredMessages.length },
    sourceBreakdown,
    stageFunnel: stageMap,
  };
}

export function buildLeadsPayload(data, filters) {
  const filteredLeads = filterLeads(data.leads || [], filters);
  return {
    generatedAt: data.generatedAt || new Date().toISOString(),
    total: filteredLeads.length,
    items: filteredLeads.map((lead) => ({
      name: lead.name || "Unknown lead",
      phone: lead.phone || "",
      status: lead.appointmentStatus || lead.stage || "unknown",
      intent: lead.intentLevel || "cold",
      score: Number(lead.leadScore || 0),
      conversationSummary:
        lead.conversationSummary || lead.lastMessage || "No summary available yet.",
      lastMessage: lead.lastMessage || "",
      lastUpdated: lead.lastInteractionAt || lead.updatedAt || lead.createdAt || "",
      treatmentType: lead.treatmentType || "",
      appointmentTime: lead.appointmentTime || "",
      currentHandler: lead.currentHandler || "bot",
      sourceChannel: lead.sourceChannel || "",
      language: lead.language || "",
      noShowCount: lead.noShowCount || 0,
    })),
  };
}
