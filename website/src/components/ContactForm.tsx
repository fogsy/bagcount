"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export function ContactForm() {
  const t = useTranslations("contact");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setStatus("idle");
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          order: data.get("order"),
          message: data.get("message"),
          turnstileToken: data.get("cf-turnstile-response") || "",
        }),
      });
      if (!res.ok) throw new Error("fail");
      setStatus("ok");
      form.reset();
    } catch {
      setStatus("err");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4 max-w-lg">
      <Field name="name" label={t("name")} required />
      <Field name="email" label={t("email")} type="email" required />
      <Field name="order" label={t("order")} />
      <div>
        <label className="block text-sm text-text-secondary mb-1" htmlFor="message">
          {t("message")}
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2"
        />
      </div>
      {/* Turnstile widget mounts when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set */}
      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <div
          className="cf-turnstile"
          data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        />
      )}
      <button type="submit" className="btn-accent px-6 py-3 text-sm" disabled={pending}>
        {t("send")}
      </button>
      {status === "ok" && <p className="text-emerald-400 text-sm">{t("success")}</p>}
      {status === "err" && <p className="text-danger text-sm">{t("error")}</p>}
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-text-secondary mb-1" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2"
      />
    </div>
  );
}
