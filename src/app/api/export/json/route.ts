import { NextResponse } from "next/server";

import { getAssignments } from "@/lib/assignments";
import { isAccessAllowed } from "@/lib/auth";
import { getCategories } from "@/lib/categories";
import { buildExportedProducts } from "@/lib/exporters";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAccessAllowed(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [products, categories, assignments] = await Promise.all([
    getProducts(),
    getCategories(),
    getAssignments(),
  ]);

  const exportedProducts = buildExportedProducts(products, categories, assignments);

  return new Response(JSON.stringify(exportedProducts, null, 2), {
    headers: {
      "Content-Disposition": 'attachment; filename="skydoo-products-categories.json"',
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
