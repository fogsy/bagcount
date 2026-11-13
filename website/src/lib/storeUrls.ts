export function getAppStoreUrl(): string | null {
  return process.env.NEXT_PUBLIC_APP_STORE_URL || null;
}

export function getPlayStoreUrl(): string | null {
  return process.env.NEXT_PUBLIC_PLAY_STORE_URL || null;
}

export function getSupportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@boxingai.app";
}

export function getLegalEntity(): { name: string; address: string } {
  return {
    name: process.env.LEGAL_ENTITY_NAME || "BoxingAI",
    address:
      process.env.LEGAL_ENTITY_ADDRESS || "Address pending — update before launch",
  };
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://boxingai.app";
}
