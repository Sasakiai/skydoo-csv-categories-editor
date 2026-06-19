import { get, put } from "@vercel/blob";

import type { Assignments } from "@/lib/types";

const ASSIGNMENTS_PATHNAME = process.env.BLOB_ASSIGNMENTS_PATH?.trim() || "assignments.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAssignments(value: unknown): value is Assignments {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(
    (entry) => Array.isArray(entry) && entry.every((item) => typeof item === "number"),
  );
}

function normalizeAssignments(assignments: Assignments): Assignments {
  const normalized: Assignments = {};

  for (const [productId, categoryIds] of Object.entries(assignments)) {
    const uniqueCategoryIds = [...new Set(categoryIds)].sort((left, right) => left - right);

    if (uniqueCategoryIds.length > 0) {
      normalized[productId] = uniqueCategoryIds;
    }
  }

  return normalized;
}

export async function getAssignments(): Promise<Assignments> {
  const result = await get(ASSIGNMENTS_PATHNAME, {
    access: "private",
  });

  if (!result) {
    return {};
  }

  if (result.statusCode !== 200) {
    throw new Error("Unable to read assignments blob.");
  }

  const parsed: unknown = JSON.parse(await new Response(result.stream).text());

  if (!isAssignments(parsed)) {
    throw new Error("Invalid assignments JSON shape.");
  }

  return normalizeAssignments(parsed);
}

export async function saveAssignments(assignments: Assignments): Promise<Assignments> {
  const normalized = normalizeAssignments(assignments);

  await put(ASSIGNMENTS_PATHNAME, JSON.stringify(normalized, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
  });

  return normalized;
}

export async function saveProductAssignments(
  productId: number,
  categoryIds: number[],
): Promise<Assignments> {
  const currentAssignments = await getAssignments();
  const nextAssignments: Assignments = {
    ...currentAssignments,
  };

  const normalizedCategoryIds = [...new Set(categoryIds)].sort((left, right) => left - right);

  if (normalizedCategoryIds.length === 0) {
    delete nextAssignments[String(productId)];
  } else {
    nextAssignments[String(productId)] = normalizedCategoryIds;
  }

  return saveAssignments(nextAssignments);
}
