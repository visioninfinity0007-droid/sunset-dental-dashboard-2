"use client";

import { usePathname } from "next/navigation";

export default function Logo({ size = 36, withText = true }) {
  const pathname = usePathname();
  
  let href = "/login";
  if (pathname?.startsWith("/dashboard/")) {
    const slug = pathname.split("/")[2];
    href = `/dashboard/${slug}`;
  } else if (pathname?.startsWith("/admin/")) {
    href = "/admin/overview";
  }

  return (
    <a href={href} className="inline-flex items-center gap-2.5">
      <img
        src="/logo.png"
        alt="Vision Infinity"
        style={{ height: size, width: "auto" }}
      />
      {withText && (
        <span className="font-poppins font-semibold text-white tracking-tight">
          Vision Infinity
        </span>
      )}
    </a>
  );
}
