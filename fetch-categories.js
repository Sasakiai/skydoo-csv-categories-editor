const fs = require("fs/promises");

const BASE_URL = "https://biznesowe-inspiracje.skydoo.com.pl/";
const KEY = "ck_85d95867e31104f32e31fd8762188adb5c6ddcf4";
const SECRET = "cs_f74a85fed94236008a0da70f887f82525d20fc90";

async function fetchAllCategories() {
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
  await fs.writeFile(
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
