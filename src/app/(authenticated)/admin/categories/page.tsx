import { getCategories } from "@/app/actions/categories";
import { CategoriesManager } from "./categories-manager";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-gray-600">Manage cost categories and items</p>
      </div>
      <CategoriesManager categories={categories} />
    </div>
  );
}
