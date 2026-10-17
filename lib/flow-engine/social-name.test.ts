import { describe, expect, it } from "vitest";
import { socialNameVariables } from "./social-name";

describe("social display names", () => {
  it.each([
    ["Sarah Taylor", "Sarah", "Taylor"],
    ["  María   de la Cruz  ", "María", "de la Cruz"],
    ["D'Angelo Taylor-Jones", "D'Angelo", "Taylor-Jones"],
    ['Sarah "Sally" Taylor', "Sarah", '"Sally" Taylor'],
    ["Jasmine", "Jasmine", ""],
    ["", "", ""],
    [undefined, "", ""],
  ])("maps %s without inventing a surname", (name, first, last) => {
    const result = socialNameVariables(name);
    expect(result.social_first_name).toBe(first);
    expect(result.social_last_name).toBe(last);
    expect(result.social_contact_fields).toEqual([
      ...(first ? [{ slug: "first_name", value: first }] : []),
      ...(last ? [{ slug: "surname", value: last }] : []),
    ]);
    expect(JSON.parse(JSON.stringify(result.social_contact_fields))).toEqual(result.social_contact_fields);
  });
});
