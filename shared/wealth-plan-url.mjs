import { extractSingleEmail } from './email-capture.mjs';
export const WEALTH_PLAN_URL = 'https://www.thewealthywomanrecode.com/wealth-plan/';
export function buildWealthPlanUrl(email, name) {
    const url = new URL(WEALTH_PLAN_URL);
    const value = email?.trim() || '';
    if (value && extractSingleEmail(value) === value) {
        url.searchParams.set('email', value);
        if (name?.trim())
            url.searchParams.set('name', name.trim().slice(0, 100));
    }
    return url.toString();
}
