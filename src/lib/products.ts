import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ProductRecord } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProductRecord(value: unknown): value is ProductRecord {
  if (!isRecord(value)) {
    return false;
  }

  const id = value["Identyfikator"];
  const type = value["Rodzaj"];
  const sku = value["SKU"];
  const name = value["Nazwa"];
  const categories = value["Kategorie"];
  const productUrl = value["URL produktu"];

  return (
    typeof id === "number" &&
    typeof type === "string" &&
    (typeof sku === "string" || typeof sku === "number") &&
    typeof name === "string" &&
    typeof categories === "string" &&
    typeof productUrl === "string"
  );
}

export async function getProducts(): Promise<ProductRecord[]> {
  const filePath = path.join(process.cwd(), "biznesowe-inspiracje_bez-kategorii.json");
  const fileContents = await readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(fileContents);

  if (!Array.isArray(parsed) || !parsed.every(isProductRecord)) {
    throw new Error("Invalid products JSON shape.");
  }

  return parsed;
}
