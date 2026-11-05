import { loadLatestWritingSubmission, submitWritingAssessment } from "@/features/writing/submit-assessment";

export const maxDuration = 15;

export async function GET(request: Request) {
  return loadLatestWritingSubmission(request);
}

export async function POST(request: Request) {
  return submitWritingAssessment(request, "practice");
}
