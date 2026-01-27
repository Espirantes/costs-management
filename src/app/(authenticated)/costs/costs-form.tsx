"use client";

import { useState, useEffect, useCallback } from "react";
import { getCostEntries, upsertCostEntry } from "@/app/actions/costs";
import { createCostItem } from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

type CostItem = {
  id: string;
  name: string;
  categoryId: string;
};

type Category = {
  id: string;
  name: string;
  costItems: CostItem[];
};

type CostEntry = {
  id: string;
  costItemId: string;
  amount: number;
};

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

export function CostsForm({ categories }: { categories: Category[] }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [entries, setEntries] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCostEntries(selectedYear, selectedMonth);
      const entriesMap: Record<string, number> = {};
      data.forEach((entry: CostEntry) => {
        entriesMap[entry.costItemId] = entry.amount;
      });
      setEntries(entriesMap);
    } catch (error) {
      toast.error("Failed to load entries");
    }
    setLoading(false);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function handleSave(costItemId: string, amount: number) {
    setSaving(costItemId);
    try {
      await upsertCostEntry(costItemId, selectedYear, selectedMonth, amount);
      setEntries((prev) => ({ ...prev, [costItemId]: amount }));
      toast.success("Saved");
    } catch (error) {
      toast.error("Failed to save");
    }
    setSaving(null);
  }

  const total = Object.values(entries).reduce((sum, val) => sum + (val || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Month:</label>
          <Select
            value={String(selectedMonth)}
            onValueChange={(v) => setSelectedMonth(Number(v))}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Year:</label>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-lg font-semibold">
          Total: {total.toLocaleString("cs-CZ")} CZK
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No categories found. Admin needs to create categories first.
        </div>
      ) : (
        <div className="grid gap-4">
          {categories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              entries={entries}
              saving={saving}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  entries,
  saving,
  onSave,
}: {
  category: Category;
  entries: Record<string, number>;
  saving: string | null;
  onSave: (costItemId: string, amount: number) => void;
}) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);

  const categoryTotal = category.costItems.reduce(
    (sum, item) => sum + (entries[item.id] || 0),
    0
  );

  async function handleAddItem() {
    if (!newItemName.trim()) return;
    setAddingLoading(true);
    try {
      await createCostItem(category.id, newItemName);
      toast.success("Item added");
      setNewItemName("");
      setIsAddingItem(false);
    } catch (error) {
      toast.error("Failed to add item");
    }
    setAddingLoading(false);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{category.name}</CardTitle>
          <span className="text-sm font-medium text-gray-600">
            Subtotal: {categoryTotal.toLocaleString("cs-CZ")} CZK
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {category.costItems.map((item) => (
          <CostItemInput
            key={item.id}
            item={item}
            value={entries[item.id] || 0}
            saving={saving === item.id}
            onSave={onSave}
          />
        ))}
        {isAddingItem ? (
          <div className="flex items-center gap-2 pt-2">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="New item name"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddItem();
                if (e.key === "Escape") setIsAddingItem(false);
              }}
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleAddItem}
              disabled={addingLoading}
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAddingItem(false);
                setNewItemName("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-gray-500"
            onClick={() => setIsAddingItem(true)}
          >
            + Add Item
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function CostItemInput({
  item,
  value,
  saving,
  onSave,
}: {
  item: CostItem;
  value: number;
  saving: boolean;
  onSave: (costItemId: string, amount: number) => void;
}) {
  const [localValue, setLocalValue] = useState(value.toString());
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setLocalValue(value.toString());
    setIsDirty(false);
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setLocalValue(newValue);
    setIsDirty(newValue !== value.toString());
  }

  function handleBlur() {
    if (!isDirty) return;
    const numValue = parseFloat(localValue) || 0;
    if (numValue < 0) {
      toast.error("Amount must be non-negative");
      setLocalValue(value.toString());
      setIsDirty(false);
      return;
    }
    onSave(item.id, numValue);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  }

  return (
    <div className="flex items-center gap-4 py-2">
      <span className="flex-1 text-sm">{item.name}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-32 text-right ${isDirty ? "border-yellow-400" : ""}`}
          disabled={saving}
        />
        <span className="text-sm text-gray-500 w-10">CZK</span>
      </div>
    </div>
  );
}
