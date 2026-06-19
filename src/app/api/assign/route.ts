import { NextResponse } from "next/server";

import { saveAssignments } from "@/lib/assignments";
import { isAccessAllowed } from "@/lib/auth";
import type { AssignPayload } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAssignPayload(value: unknown): value is AssignPayload {
  if (!isRecord(value)) {
    return false;
  }

  const assignments = value.assignments;

  if (!isRecord(assignments)) {
    return false;
  }

  return Object.values(assignments).every(
    (entry) => Array.isArray(entry) && entry.every((item) => typeof item === "number"),
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

  const assignments = await saveAssignments(payload.assignments);

  return NextResponse.json({ assignments });
}
