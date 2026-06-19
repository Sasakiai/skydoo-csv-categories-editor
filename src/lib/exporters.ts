import {
  buildCategoryLabel,
  buildCategoryPathMap,
  pruneAncestorCategoryIds,
} from "@/lib/category-utils";
import type { Assignments, Category, ProductRecord } from "@/lib/types";

function escapeCsvCell(value: string | number): string {
  const stringValue = String(value);
  const escapedValue = stringValue.replaceAll('"', '""');

  if (
    escapedValue.includes(",") ||
    escapedValue.includes("\n") ||
    escapedValue.includes('"')
  ) {
    return `"${escapedValue}"`;
  }

  return escapedValue;
}

export function buildExportedProducts(
  products: ProductRecord[],
  categories: Category[],
  assignments: Assignments,
): ProductRecord[] {
  const pathMap = buildCategoryPathMap(categories);

  return products.map((product) => {
    const assignedCategoryIds = assignments[String(product.Identyfikator)] ?? [];
    const exportCategoryIds = pruneAncestorCategoryIds(assignedCategoryIds, categories);
    const categoryLabel = buildCategoryLabel(exportCategoryIds, pathMap);

    return {
      ...product,
      Kategorie: categoryLabel,
    };
  });
}

export function buildWooCsv(
  products: ProductRecord[],
  categories: Category[],
  assignments: Assignments,
): string {
  const pathMap = buildCategoryPathMap(categories);
  const header = ["ID", "SKU", "Categories"];
  const rows = products.map((product) => {
    const assignedCategoryIds = assignments[String(product.Identyfikator)] ?? [];
    const exportCategoryIds = pruneAncestorCategoryIds(assignedCategoryIds, categories);
    const categoryLabel = buildCategoryLabel(exportCategoryIds, pathMap);

    return [
      escapeCsvCell(product.Identyfikator),
      escapeCsvCell(product.SKU),
      escapeCsvCell(categoryLabel),
    ].join(",");
  });

  return [header.join(","), ...rows].join("\n");
}
