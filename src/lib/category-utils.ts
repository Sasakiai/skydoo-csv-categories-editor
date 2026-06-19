import type { Category, CategoryNode } from "@/lib/types";

const collator = new Intl.Collator("pl", {
  sensitivity: "base",
  numeric: true,
});

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((left, right) => collator.compare(left.name, right.name));
}

export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const byId = new Map<number, CategoryNode>();

  for (const category of categories) {
    byId.set(category.id, {
      category,
      children: [],
    });
  }

  const roots: CategoryNode[] = [];

  for (const node of byId.values()) {
    const parentNode = byId.get(node.category.parent);

    if (parentNode) {
      parentNode.children.push(node);
      continue;
    }

    roots.push(node);
  }

  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((left, right) => collator.compare(left.category.name, right.category.name));

    for (const node of nodes) {
      sortNodes(node.children);
    }
  };

  sortNodes(roots);

  return roots;
}

export function buildCategoryPathMap(categories: Category[]): Map<number, string> {
  const byId = new Map<number, Category>();

  for (const category of categories) {
    byId.set(category.id, category);
  }

  const cache = new Map<number, string>();

  const buildPath = (categoryId: number): string => {
    const cached = cache.get(categoryId);

    if (cached) {
      return cached;
    }

    const category = byId.get(categoryId);

    if (!category) {
      return "";
    }

    if (category.parent === 0) {
      cache.set(category.id, category.name);
      return category.name;
    }

    const parentPath = buildPath(category.parent);
    const pathLabel = parentPath ? `${parentPath} > ${category.name}` : category.name;

    cache.set(category.id, pathLabel);

    return pathLabel;
  };

  for (const category of categories) {
    buildPath(category.id);
  }

  return cache;
}

export function buildCategoryLabel(categoryIds: number[], pathMap: Map<number, string>): string {
  const labels = categoryIds
    .map((categoryId) => pathMap.get(categoryId) ?? "")
    .filter((label) => label.length > 0)
    .sort((left, right) => collator.compare(left, right));

  return labels.join(", ");
}

export function pruneAncestorCategoryIds(categoryIds: number[], categories: Category[]): number[] {
  const categoryById = new Map<number, Category>();

  for (const category of categories) {
    categoryById.set(category.id, category);
  }

  const selectedIds = new Set(categoryIds);

  return categoryIds.filter((categoryId) => {
    for (const selectedId of selectedIds) {
      if (selectedId === categoryId) {
        continue;
      }

      let currentParentId = categoryById.get(selectedId)?.parent ?? 0;

      while (currentParentId !== 0) {
        if (currentParentId === categoryId) {
          return false;
        }

        currentParentId = categoryById.get(currentParentId)?.parent ?? 0;
      }
    }

    return true;
  });
}

export function filterCategoryTree(
  nodes: CategoryNode[],
  query: string,
  pathMap: Map<number, string>,
): CategoryNode[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("pl");

  if (!normalizedQuery) {
    return nodes;
  }

  const walk = (items: CategoryNode[]): CategoryNode[] => {
    return items.flatMap((item) => {
      const children = walk(item.children);
      const path = (pathMap.get(item.category.id) ?? item.category.name).toLocaleLowerCase("pl");
      const isMatch = path.includes(normalizedQuery);

      if (!isMatch && children.length === 0) {
        return [];
      }

      return [
        {
          category: item.category,
          children,
        },
      ];
    });
  };

  return walk(nodes);
}
