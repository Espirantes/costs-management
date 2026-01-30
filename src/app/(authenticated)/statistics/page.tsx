"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getStatistics, getStatisticsCategories } from "@/app/actions/statistics";
import { getShops } from "@/app/actions/shops";
import { toast } from "sonner";

interface Shop {
  id: string;
  name: string;
  displayName: string | null;
}

interface MonthlyData {
  month: string;
  [key: string]: number | string;
}

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#8dd1e1",
  "#d084d0",
  "#ffb347",
  "#a8e6cf",
  "#ff6b9d",
  "#c9c9ff",
];

export default function StatisticsPage() {
  const [viewType, setViewType] = useState<"ORGANIZATION" | "SHOP">("ORGANIZATION");
  const [groupBy, setGroupBy] = useState<"total" | "categories">("total");
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [shops, setShops] = useState<Shop[]>([]);
  const [data, setData] = useState<MonthlyData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load shops on mount
  useEffect(() => {
    async function loadShops() {
      try {
        const shopsData = await getShops();
        setShops(shopsData);
        if (shopsData.length > 0) {
          setSelectedShop(shopsData[0].id);
        }
      } catch (error) {
        console.error("Failed to load shops:", error);
        toast.error("Failed to load shops");
      }
    }
    loadShops();
  }, []);

  // Load statistics data whenever filters change
  const loadData = useCallback(async () => {
    if (viewType === "SHOP" && !selectedShop) {
      return;
    }

    setLoading(true);
    try {
      const [statsData, categoriesData] = await Promise.all([
        getStatistics(viewType, selectedShop || undefined, groupBy),
        groupBy === "categories"
          ? getStatisticsCategories(viewType, selectedShop || undefined)
          : Promise.resolve([]),
      ]);

      setData(statsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Failed to load statistics:", error);
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  }, [viewType, selectedShop, groupBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
    }).format(value);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
        <p className="text-muted-foreground">
          Cost trends over the last 12 months
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* View Type Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="view-type">View Type</Label>
              <p className="text-sm text-muted-foreground">
                {viewType === "ORGANIZATION"
                  ? "Organization-wide costs"
                  : "Individual shop costs"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={viewType === "ORGANIZATION" ? "font-medium" : "text-muted-foreground"}>
                Organization
              </span>
              <Switch
                id="view-type"
                checked={viewType === "SHOP"}
                onCheckedChange={(checked) =>
                  setViewType(checked ? "SHOP" : "ORGANIZATION")
                }
              />
              <span className={viewType === "SHOP" ? "font-medium" : "text-muted-foreground"}>
                E-shop
              </span>
            </div>
          </div>

          {/* Shop Selector - Only visible in SHOP view */}
          {viewType === "SHOP" && (
            <div className="space-y-2">
              <Label htmlFor="shop-select">Select Shop</Label>
              <Select value={selectedShop} onValueChange={setSelectedShop}>
                <SelectTrigger id="shop-select">
                  <SelectValue placeholder="Select a shop" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.displayName || shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Group By Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="group-by">Group By</Label>
              <p className="text-sm text-muted-foreground">
                {groupBy === "total"
                  ? "Total costs per month"
                  : "Costs broken down by categories"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={groupBy === "total" ? "font-medium" : "text-muted-foreground"}>
                Total
              </span>
              <Switch
                id="group-by"
                checked={groupBy === "categories"}
                onCheckedChange={(checked) =>
                  setGroupBy(checked ? "categories" : "total")
                }
              />
              <span className={groupBy === "categories" ? "font-medium" : "text-muted-foreground"}>
                Categories
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-[400px]">
              <p className="text-muted-foreground">No data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                {groupBy === "total" ? (
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke={COLORS[0]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Total Costs"
                  />
                ) : (
                  categories.map((category, index) => (
                    <Line
                      key={category}
                      type="monotone"
                      dataKey={category}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name={category}
                    />
                  ))
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
