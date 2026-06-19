import { NextResponse } from "next/server";

import { saveProductAssignments } from "@/lib/assignments";
import { isAccessAllowed } from "@/lib/auth";

type AssignPayload = {
  productId: number;
  categoryIds: number[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAssignPayload(value: unknown): value is AssignPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.productId === "number" &&
    Array.isArray(value.categoryIds) &&
    value.categoryIds.every((item) => typeof item === "number")
  );
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAccessAllowed(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload: unknown = await request.json();

  if (!isAssignPayload(payload)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const assignments = await saveProductAssignments(payload.productId, payload.categoryIds);

  return NextResponse.json({ assignments });
}
