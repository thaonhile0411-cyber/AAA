import { NextResponse } from "next/server";
import { getProviderHealthReport } from "@/lib/ai-provider-manager";
import { getAiUsageSummary } from "@/lib/ai-cost-tracker";

export async function GET() {
  const healthReport = getProviderHealthReport();
  const usageSummary = getAiUsageSummary();

  const response = {
    timestamp: new Date().toISOString(),
    systemStatus: healthReport.status,
    activeProvidersCount: healthReport.activeProvidersCount,
    providers: healthReport.providers,
    budget: {
      isExceeded: healthReport.isBudgetExceeded,
      monthlyBudgetUsd: usageSummary.monthlyBudgetUsd,
      currentMonthSpentUsd: usageSummary.totalCostUsd,
      remainingBudgetUsd: Math.max(
        0,
        usageSummary.monthlyBudgetUsd - usageSummary.totalCostUsd,
      ),
      totalRequests: usageSummary.totalCalls,
      successfulRequests: Object.values(usageSummary.providers).reduce(
        (sum, p) => sum + p.successfulCalls,
        0,
      ),
    },
  };

  const httpStatus = healthReport.status === "unconfigured" ? 503 : 200;
  return NextResponse.json(response, { status: httpStatus });
}
