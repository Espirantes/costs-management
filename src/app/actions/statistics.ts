"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/organization-context";

interface MonthlyData {
  month: string; // "2026-01", "2026-02", etc.
  [key: string]: number | string; // category names or "total"
}

export async function getStatistics(
  viewType: "ORGANIZATION" | "SHOP",
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

  // Filter by shop if SHOP view
  if (viewType === "SHOP" && shopId) {
    whereClause.shopId = shopId;
  } else if (viewType === "ORGANIZATION") {
    // For organization view, we want all shops
    whereClause.costItem.category.scope = "ORGANIZATION";
  }

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

  // Initialize all months with 0 values
  months.forEach(({ year, month }) => {
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    monthlyDataMap.set(monthKey, { month: monthKey });
  });

  if (groupBy === "total") {
    // Sum all costs per month
    entries.forEach((entry) => {
      const monthKey = `${entry.year}-${String(entry.month).padStart(2, "0")}`;
      const monthData = monthlyDataMap.get(monthKey);
      if (monthData) {
        const currentTotal = (monthData.total as number) || 0;
        monthData.total = currentTotal + Number(entry.amount);
      }
    });
  } else {
    // Group by categories
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
  viewType: "ORGANIZATION" | "SHOP",
  shopId?: string
): Promise<string[]> {
  const { organizationId } = await requireOrganization();

  const whereClause: any = {
    organizationId,
  };

  if (viewType === "ORGANIZATION") {
    whereClause.scope = "ORGANIZATION";
  } else if (viewType === "SHOP" && shopId) {
    whereClause.OR = [{ scope: "ORGANIZATION" }, { scope: "SHOP", shopId }];
  }

  const categories = await prisma.category.findMany({
    where: whereClause,
    select: { name: true },
    distinct: ["name"],
  });

  return categories.map((c) => c.name);
}
