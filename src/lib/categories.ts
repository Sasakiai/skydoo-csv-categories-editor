import { readFile } from "node:fs/promises";
import path from "node:path";

import { sortCategories } from "@/lib/category-utils";
import type { Category } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCategory(value: unknown): value is Category {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    typeof value.name === "string" &&
    typeof value.slug === "string" &&
    typeof value.parent === "number"
  );
}

export async function getCategories(): Promise<Category[]> {
  const filePath = path.join(process.cwd(), "categories.json");
  const fileContents = await readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(fileContents);

  if (!Array.isArray(parsed) || !parsed.every(isCategory)) {
    throw new Error("Invalid categories JSON shape.");
  }

  return sortCategories(parsed);
}
