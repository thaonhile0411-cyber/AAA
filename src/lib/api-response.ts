export function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function apiFailure(error: unknown) {
  console.error(
    "AAA API failure",
    error instanceof Error ? error.name : "UnknownError",
  );
  return json(
    { error: "Chưa thể kết nối hệ thống. Vui lòng thử lại sau." },
    503,
  );
}
