import { extractSingleEmail } from './email-capture';
import type { SendMessageNodeData } from './types';
export const WEALTH_PLAN_URL = 'https://www.thewealthywomanrecode.com/wealth-plan/';
export function buildWealthPlanUrl(email?: string | null, name?: string | null) {
  const url = new URL(WEALTH_PLAN_URL);
  const value = email?.trim() || '';
  if (value && extractSingleEmail(value) === value) {
    url.searchParams.set('email', value);
    if (name?.trim()) url.searchParams.set('name', name.trim().slice(0, 100));
  }
  return url.toString();
}
function variable(path: string, variables: Record<string, unknown>): unknown {
  return path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, variables);
}
const tokens = /\{\{(\w+(?:\.\w+)*)\}\}/g;
export function interpolateLink(url: string, variables: Record<string, unknown>) {
  // A complete URL variable has already been safely constructed with URLSearchParams.
  const whole = /^\{\{(\w+(?:\.\w+)*)\}\}$/.exec(url);
  if (whole) { const result = variable(whole[1], variables); return typeof result === 'string' ? result : url; }
  return url.replace(tokens, (token, path: string) => {
    const result = variable(path, variables);
    return typeof result === 'string' || typeof result === 'number' ? encodeURIComponent(String(result)) : token;
  });
}
export function resolveMessageLinks(message: SendMessageNodeData['messages'][number], variables: Record<string, unknown>) {
  const button = (item: NonNullable<typeof message.buttons>[number]) => ({ ...item, ...(item.type === 'url' && item.url ? { url: interpolateLink(item.url, variables) } : {}) });
  return { ...message,
    ...(message.buttons ? { buttons: message.buttons.map(button) } : {}),
    ...(message.carousel ? { carousel: { ...message.carousel, elements: message.carousel.elements.map(element => ({ ...element, ...(element.buttons ? { buttons: element.buttons.map(button) } : {}) })) } } : {}),
  };
}
