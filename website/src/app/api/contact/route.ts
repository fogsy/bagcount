import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, message, order, turnstileToken } = body as {
      name?: string;
      email?: string;
      message?: string;
      order?: string;
      turnstileToken?: string;
    };

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (secret) {
      if (!turnstileToken) {
        return NextResponse.json({ error: "Captcha required" }, { status: 400 });
      }
      const verify = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret,
            response: turnstileToken,
          }),
        },
      );
      const result = await verify.json();
      if (!result.success) {
        return NextResponse.json({ error: "Captcha failed" }, { status: 400 });
      }
    }

    // Log for ops until email provider is wired (Resend/Cloudflare Email)
    console.info("[contact]", {
      name,
      email,
      order,
      message: String(message).slice(0, 2000),
      to: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@boxingai.app",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
