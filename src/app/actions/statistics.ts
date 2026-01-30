"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/organization-context";

interface MonthlyData {
  month: string; // "2026-01", "2026-02", etc.
  [key: string]: number | string; // category names or "total"
}

/**
 * viewType:
 *   "ALL"    — all costs in the organization (fixed + all shops)
 *   "FIXED"  — only fixed costs (entries with shopId = null)
 *   "ESHOP"  — costs for a specific shop (entries with shopId = shopId)
 */
export async function getStatistics(
  viewType: "ALL" | "FIXED" | "ESHOP",
  shopId?: string,
  groupBy: "total" | "categories" = "total"
): Promise<MonthlyData[]> {
  const { organizationId } = await requireOrganization();

  // Get the last 12 months
  const now = new Date();
  const months: { year: number; month: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    });
  }

  // Build where clause
  const whereClause: any = {
    costItem: {
      category: {
        organizationId,
      },
    },
    OR: months.map((m) => ({ year: m.year, month: m.month })),
  };

  if (viewType === "FIXED") {
    // Only entries with shopId = null (fixed costs)
    whereClause.shopId = null;
  } else if (viewType === "ESHOP" && shopId) {
    // Only entries for the selected shop
    whereClause.shopId = shopId;
  }
  // "ALL" — no additional filter, returns everything

  // Fetch cost entries with category info
  const entries = await prisma.costEntry.findMany({
    where: whereClause,
    include: {
      costItem: {
        include: {
          category: true,
        },
      },
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  // Group data by month
  const monthlyDataMap = new Map<string, MonthlyData>();

  // Initialize all months
  months.forEach(({ year, month }) => {
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    monthlyDataMap.set(monthKey, { month: monthKey });
  });

  if (groupBy === "total") {
    entries.forEach((entry) => {
      const monthKey = `${entry.year}-${String(entry.month).padStart(2, "0")}`;
      const monthData = monthlyDataMap.get(monthKey);
      if (monthData) {
        const currentTotal = (monthData.total as number) || 0;
        monthData.total = currentTotal + Number(entry.amount);
      }
    });
  } else {
    entries.forEach((entry) => {
      const monthKey = `${entry.year}-${String(entry.month).padStart(2, "0")}`;
      const categoryName = entry.costItem.category.name;
      const monthData = monthlyDataMap.get(monthKey);
      if (monthData) {
        const currentAmount = (monthData[categoryName] as number) || 0;
        monthData[categoryName] = currentAmount + Number(entry.amount);
      }
    });
  }

  return Array.from(monthlyDataMap.values());
}

export async function getStatisticsCategories(
  viewType: "ALL" | "FIXED" | "ESHOP",
  shopId?: string
): Promise<string[]> {
  const { organizationId } = await requireOrganization();

  const whereClause: any = {
    organizationId,
  };

  if (viewType === "FIXED") {
    whereClause.scope = "FIXED";
  } else if (viewType === "ESHOP") {
    whereClause.scope = "VARIABLE";
  }
  // "ALL" — no scope filter, returns all categories

  const categories = await prisma.category.findMany({
    where: whereClause,
    select: { name: true },
    distinct: ["name"],
  });

  return categories.map((c) => c.name);
}
