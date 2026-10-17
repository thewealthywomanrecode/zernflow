import { describe, expect, it } from "vitest";
import { captureEmailVariables, extractSingleEmail } from "./email-capture";

describe("email capture from DM replies", () => {
  it.each([
    ["jane@example.com", "jane@example.com"],
    ["Hey sis, here's my email: jane@example.com", "jane@example.com"],
    ["Please send it to <jane+wealth@Example.COM>!", "jane+wealth@example.com"],
    ['My email is "jane@example.com".', "jane@example.com"],
    ["Email jane@example.com. Thanks!", "jane@example.com"],
    ["jane@example.com or jane@example.com", "jane@example.com"],
  ])("extracts the address from %s", (message, expected) => expect(extractSingleEmail(message)).toBe(expected));
  it.each(["Hey sis!", "jane@", "jane@example", "jane@@example.com", "bad..name@example.com", ".jane@example.com", "jane@example..com", "jane@-example.com", "jane@example.com_extra", "one@example.com or two@example.com", "éjane@example.com", `${"x".repeat(65)}@example.com`])("rejects missing, malformed, or ambiguous reply %s", message => expect(extractSingleEmail(message)).toBeNull());
  it("clears previous capture values when the latest reply is invalid", () => {
    const variables = { ...captureEmailVariables("jane@example.com"), ...captureEmailVariables("actually wait") };
    expect(variables).toEqual({ captured_email: "", captured_email_valid: "false" });
  });
});
