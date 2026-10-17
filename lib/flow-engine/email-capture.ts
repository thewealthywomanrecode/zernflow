/** Extract one unambiguous ASCII email from a conversational reply.
 * Syntax validation only: this does not prove that a mailbox exists.
 */
export function extractSingleEmail(text: string): string | null {
  const pattern = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+/gi;
  const addresses = new Set<string>();
  for (const match of text.matchAll(pattern)) {
    const before = text[(match.index ?? 0) - 1] ?? "";
    const after = text[(match.index ?? 0) + match[0].length] ?? "";
    if ((before && /[\w@\u0080-\uffff]/.test(before)) || (after && /[\w@\u0080-\uffff-]/.test(after))) return null;
    const address = match[0].replace(/\.+$/, "");
    const [local, domain] = address.split("@");
    if (!local || !domain || address.length > 254 || local.length > 64 || domain.length > 253 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
    const labels = domain.split(".");
    if (labels.length < 2 || !/^[a-z]{2,63}$/i.test(labels.at(-1) ?? "") || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) return null;
    addresses.add(local + "@" + domain.toLowerCase());
  }
  return addresses.size === 1 ? [...addresses][0] : null;
}

export function captureEmailVariables(text: string) {
  const email = extractSingleEmail(text);
  return { captured_email: email ?? "", captured_email_valid: String(email !== null) };
}
