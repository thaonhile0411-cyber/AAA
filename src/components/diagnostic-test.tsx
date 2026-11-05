"use client";

import { PlacementTestContainer } from "./placement-test/placement-test-container";

export function DiagnosticTest({
  reassessment = false,
  userId,
}: {
  reassessment?: boolean;
  userId: string;
}) {
  return <PlacementTestContainer key={userId} reassessment={reassessment} userId={userId} />;
}

export default DiagnosticTest;
