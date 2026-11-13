import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.info("[link-visit]", {
      path: body.path,
      utm: body.utm,
      referer: req.headers.get("referer"),
      ua: req.headers.get("user-agent"),
      at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
