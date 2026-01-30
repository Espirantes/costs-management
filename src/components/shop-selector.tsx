"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getShops } from "@/app/actions/shops";
import { Store } from "lucide-react";

type Shop = {
  id: string;
  name: string;
  displayName: string | null;
};

type ShopSelectorProps = {
  value: string;
  onValueChange: (shopId: string) => void;
  disabled?: boolean;
};

export function ShopSelector({ value, onValueChange, disabled }: ShopSelectorProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadShops() {
      try {
        const data = await getShops();
        setShops(data);
        // Auto-select first shop if no value
        if (!value && data.length > 0) {
          onValueChange(data[0].id);
        }
      } catch (error) {
        console.error("Failed to load shops:", error);
      } finally {
        setLoading(false);
      }
    }

    loadShops();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Store className="h-4 w-4" />
        <span>Loading shops...</span>
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Store className="h-4 w-4" />
        <span>No shops available</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-[200px]">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4" />
          <SelectValue placeholder="Select view" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {shops.map((shop) => (
          <SelectItem key={shop.id} value={shop.id}>
            {shop.displayName || shop.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
