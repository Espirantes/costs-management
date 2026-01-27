"use client";

import { useState } from "react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createCostItem,
  updateCostItem,
  deleteCostItem,
} from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type CostItem = {
  id: string;
  name: string;
  categoryId: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
};

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  costItems: CostItem[];
};

export function CategoriesManager({ categories }: { categories: Category[] }) {
  return (
    <div className="space-y-4">
      <CreateCategoryDialog />
      <div className="grid gap-4">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}

function CreateCategoryDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createCategory(name);
      toast.success("Category created");
      setOpen(false);
      setName("");
    } catch (error) {
      toast.error("Failed to create category");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Category</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const [editName, setEditName] = useState(category.name);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (editName === category.name) {
      setIsEditing(false);
      return;
    }
    setLoading(true);
    try {
      await updateCategory(category.id, editName);
      toast.success("Category updated");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update category");
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this category and all its items?")) return;
    setLoading(true);
    try {
      await deleteCategory(category.id);
      toast.success("Category deleted");
    } catch (error) {
      toast.error("Failed to delete category");
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="max-w-md"
              />
              <Button size="sm" onClick={handleSave} disabled={loading}>
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditName(category.name);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <CardTitle className="text-lg">{category.name}</CardTitle>
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  Delete
                </Button>
              </div>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {category.costItems.map((item) => (
            <CostItemRow key={item.id} item={item} />
          ))}
          <AddItemButton categoryId={category.id} />
        </div>
      </CardContent>
    </Card>
  );
}

function CostItemRow({ item }: { item: CostItem }) {
  const [name, setName] = useState(item.name);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (name === item.name) {
      setIsEditing(false);
      return;
    }
    setLoading(true);
    try {
      await updateCostItem(item.id, name);
      toast.success("Item updated");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update item");
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this item?")) return;
    setLoading(true);
    try {
      await deleteCostItem(item.id);
      toast.success("Item deleted");
    } catch (error) {
      toast.error("Failed to delete item");
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
      {isEditing ? (
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-md"
          />
          <Button size="sm" onClick={handleSave} disabled={loading}>
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsEditing(false);
              setName(item.name);
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <span>{item.name}</span>
          <div className="space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600"
              onClick={handleDelete}
              disabled={loading}
            >
              Delete
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function AddItemButton({ categoryId }: { categoryId: string }) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createCostItem(categoryId, name);
      toast.success("Item added");
      setName("");
      setIsAdding(false);
    } catch (error) {
      toast.error("Failed to add item");
    }
    setLoading(false);
  }

  if (!isAdding) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setIsAdding(true)}
      >
        + Add Item
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") setIsAdding(false);
        }}
        autoFocus
      />
      <Button size="sm" onClick={handleAdd} disabled={loading}>
        Add
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setIsAdding(false);
          setName("");
        }}
      >
        Cancel
      </Button>
    </div>
  );
}
