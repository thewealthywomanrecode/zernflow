import type { NodeType } from "@/lib/types/database";
const actionTypes = new Set(["addTag", "removeTag", "setCustomField", "httpRequest", "goToFlow", "humanTakeover", "subscribe", "unsubscribe", "abSplit", "smartDelay", "enrollSequence"]);
export function executionType(node: { type?: string; data: unknown }): NodeType {
  if (node.type !== "action") return node.type as NodeType;
  const type = (node.data as { actionType?: string })?.actionType;
  if (!type || !actionTypes.has(type)) throw new Error("Unsupported flow action");
  return type as NodeType;
}
