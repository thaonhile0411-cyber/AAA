import type { FieldErrors, GoalInput, GoalResponse } from "./goals";

type ErrorPayload = { error?: string; errors?: FieldErrors };

export class GoalApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: FieldErrors,
  ) {
    super(message);
  }
}

async function requestGoals(init?: RequestInit): Promise<GoalResponse> {
  const response = await fetch("/api/goals", {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as
    GoalResponse | ErrorPayload | null;

  if (!response.ok) {
    throw new GoalApiError(
      (body as ErrorPayload | null)?.error ??
        "Chưa thể kết nối với hệ thống. Vui lòng thử lại.",
      response.status,
      (body as ErrorPayload | null)?.errors,
    );
  }

  return body as GoalResponse;
}

export function loadGoalsFromServer() {
  return requestGoals();
}

export function saveGoalsToServer(input: GoalInput) {
  return requestGoals({ method: "PUT", body: JSON.stringify(input) });
}
