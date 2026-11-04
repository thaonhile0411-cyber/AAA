"use client";

/** Sync the browser's IANA timezone before local-date dashboard data is read. */
export async function syncUserTimeZone() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timeZone) return false;
  try {
    const response = await fetch("/api/user-timezone", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeZone }),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}
