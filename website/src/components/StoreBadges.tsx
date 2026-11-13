import { getAppStoreUrl, getPlayStoreUrl } from "@/lib/storeUrls";

export function StoreBadges({
  appStoreLabel,
  playStoreLabel,
  stacked = false,
}: {
  appStoreLabel: string;
  playStoreLabel: string;
  stacked?: boolean;
}) {
  const appStore = getAppStoreUrl();
  const playStore = getPlayStoreUrl();

  const className = stacked
    ? "flex flex-col gap-3 w-full max-w-xs"
    : "flex flex-col sm:flex-row gap-3";

  return (
    <div className={className}>
      {appStore ? (
        <a
          href={appStore}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-zinc-100 transition"
          aria-label={appStoreLabel}
        >
          <AppleIcon />
          <span className="text-left leading-tight">
            <span className="block text-[10px] font-normal opacity-70">
              Download on the
            </span>
            App Store
          </span>
        </a>
      ) : (
        <span
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/80 px-5 py-3 text-sm font-semibold text-black opacity-60 cursor-not-allowed"
          title="App Store link coming soon"
          aria-disabled
        >
          <AppleIcon />
          <span className="text-left leading-tight">
            <span className="block text-[10px] font-normal opacity-70">
              Coming soon on the
            </span>
            App Store
          </span>
        </span>
      )}
      {playStore ? (
        <a
          href={playStore}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text hover:bg-surface-elevated transition"
          aria-label={playStoreLabel}
        >
          <PlayIcon />
          <span className="text-left leading-tight">
            <span className="block text-[10px] font-normal text-text-muted">
              Get it on
            </span>
            Google Play
          </span>
        </a>
      ) : (
        <span
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text opacity-60 cursor-not-allowed"
          title="Google Play link coming soon"
          aria-disabled
        >
          <PlayIcon />
          <span className="text-left leading-tight">
            <span className="block text-[10px] font-normal text-text-muted">
              Coming soon on
            </span>
            Google Play
          </span>
        </span>
      )}
    </div>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.3 1 8.4.7 1 1.5 2.2 2.6 2.1 1 0 1.4-.7 2.7-.7s1.6.7 2.7.7c1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.2-3.3zM14.6 6.3c.6-.7 1-1.7.9-2.7-0.9.1-1.9.6-2.5 1.3-.6.6-1.1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M3 20.5V3.5L14.5 12 3 20.5z" />
      <path fill="#FBBC04" d="M3 3.5l8.2 6.7L3 20.5V3.5z" opacity=".0" />
      <path fill="#4285F4" d="M14.5 12L3 3.5l11.2 4.8L21 9l-6.5 3z" />
      <path fill="#34A853" d="M14.5 12L21 15l-6.8 2.8L3 20.5 14.5 12z" />
      <path fill="#FBBC04" d="M14.5 12L3 20.5l8.2-6.7L14.5 12z" />
    </svg>
  );
}
