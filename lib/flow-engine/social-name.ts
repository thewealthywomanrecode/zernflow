/** Social platforms supply a display name, not verified first/last names. */
export function socialNameVariables(displayName?: string | null) {
  const parts = (displayName ?? "").trim().split(/\s+/u).filter(Boolean);
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ");
  const fields: Array<{ slug: string; value: string }> = [];
  if (firstName) fields.push({ slug: "first_name", value: firstName });
  if (lastName) fields.push({ slug: "surname", value: lastName });
  return { social_first_name: firstName, social_last_name: lastName, social_contact_fields: fields };
}
