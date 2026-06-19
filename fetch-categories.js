import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.WOO_BASE_URL;
const KEY = process.env.WOO_CONSUMER_KEY;
const SECRET = process.env.WOO_CONSUMER_SECRET;

async function fetchAllCategories() {
  if (!BASE_URL || !KEY || !SECRET) {
    throw new Error("Set WOO_BASE_URL, WOO_CONSUMER_KEY and WOO_CONSUMER_SECRET first.");
  }

  const all = [];
  let page = 1;

  while (true) {
    const url =
      `${BASE_URL}/wp-json/wc/v3/products/categories` +
      `?per_page=100&page=${page}&consumer_key=${KEY}&consumer_secret=${SECRET}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} page ${page}`);
    }

    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) {
      break;
    }

    all.push(
      ...items.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        parent: item.parent,
      }))
    );

    page += 1;
  }

  return all;
}

async function main() {
  const categories = await fetchAllCategories();
  await writeFile(
    "categories.json",
    JSON.stringify(categories, null, 2),
    "utf8"
  );
  console.log(`Saved ${categories.length} categories`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
