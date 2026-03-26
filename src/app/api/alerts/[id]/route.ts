import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/user";

// DELETE /api/alerts/[id] — soft-delete (deactivate) an alert
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getOrCreateDbUser();

    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!alert || alert.userId !== user.id) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/alerts/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/alerts/[id] — update target price or condition
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getOrCreateDbUser();

    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert || alert.userId !== user.id) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const body = await req.json();
    const { targetPrice, condition, color } = body;

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        ...(targetPrice !== undefined && { targetPrice: parseFloat(targetPrice) }),
        ...(condition !== undefined && { condition }),
        ...(color !== undefined && { color }),
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/alerts/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
