import type { GoalInput, GoalResponse } from "./goals";

type ErrorPayload = { error?: string };

export class GoalApiError extends Error {}

async function requestGoals(init?: RequestInit): Promise<GoalResponse> {
  const response = await fetch("/api/goals", {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as
    | GoalResponse
    | ErrorPayload
    | null;

  if (!response.ok) {
    throw new GoalApiError(
      (body as ErrorPayload | null)?.error ??
        "Chưa thể kết nối với hệ thống. Vui lòng thử lại.",
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
