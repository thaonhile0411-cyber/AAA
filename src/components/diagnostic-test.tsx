"use client";

import { PlacementTestContainer } from "./placement-test/placement-test-container";

export function DiagnosticTest({ reassessment = false }: { reassessment?: boolean }) {
  return <PlacementTestContainer reassessment={reassessment} />;
}

export default DiagnosticTest;
