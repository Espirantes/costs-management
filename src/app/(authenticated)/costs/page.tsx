import { getCategoriesWithItems } from "@/app/actions/categories";
import { CostsForm } from "./costs-form";

export default async function CostsPage() {
  const categories = await getCategoriesWithItems();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cost Entry</h1>
        <p className="text-gray-600">Enter monthly costs for each category</p>
      </div>
      <CostsForm categories={categories} />
    </div>
  );
}
