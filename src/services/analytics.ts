type Props = Record<string, string | number | boolean | null | undefined>;

const buffer: { name: string; props?: Props; at: string }[] = [];

export function track(name: string, props?: Props): void {
  buffer.push({ name, props, at: new Date().toISOString() });
  if (__DEV__) {
    console.log('[analytics]', name, props ?? {});
  }
}

export function getAnalyticsBuffer(): readonly {
  name: string;
  props?: Props;
  at: string;
}[] {
  return buffer;
}

export function clearAnalyticsBuffer(): void {
  buffer.length = 0;
}
