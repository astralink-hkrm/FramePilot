import { NextResponse } from "next/server";

import { inngest } from "@/inngest/client";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    projectId?: string;
    shapeCount?: number;
    savedAt?: number;
  };

  if (!body.projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  try {
    await inngest.send({
      name: "project/autosave.requested",
      data: {
        projectId: body.projectId,
        shapeCount: body.shapeCount ?? 0,
        savedAt: body.savedAt ?? Date.now(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("Inngest autosave event skipped", error);
    return NextResponse.json({ ok: true, inngest: "skipped" });
  }
}