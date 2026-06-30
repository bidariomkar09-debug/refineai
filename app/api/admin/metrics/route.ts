import { NextResponse } from "next/server";
import { getAdminMetrics } from "@/app/lib/db";

export async function GET() {
  try {
    const metrics = await getAdminMetrics();
    return NextResponse.json(metrics);
  } catch {
    return NextResponse.json({
      mrr: 0,
      mrrTrend: [],
      churnRate: 0,
      newSignupsThisWeek: 0,
      activeUsersDaily: 0,
      activeUsersWeekly: 0,
      activeUsersMonthly: 0,
      topApiCustomers: [],
      supportTicketsThisWeek: 0,
    });
  }
}
