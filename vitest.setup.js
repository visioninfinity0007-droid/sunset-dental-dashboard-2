import { vi } from "vitest";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    getAll: vi.fn(),
  })),
}));

// Mock process envs for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-key";
process.env.EVOLUTION_API_URL = "https://evo.mock.com";
process.env.EVOLUTION_API_KEY = "mock-api-key";
process.env.N8N_WEBHOOK_BASE = "https://n8n.mock.com";
