import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeFlow } from "./engine";
import type { FlowExecutionContext } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
const api = vi.hoisted(() => ({ privateReply: vi.fn(), message: vi.fn() }));
vi.mock("@/lib/zernio-client", () => ({ createZernioClient: () => ({ comments: { sendPrivateReplyToComment: api.privateReply }, messages: { sendInboxMessage: api.message } }) }));
function fixture(comment = true, conversation: string | null = "old-conversation") {
  const writes: Array<{ table: string; value: any }> = [];
  const flow = { nodes: [{ id: "trigger", type: "trigger", data: {} }, { id: "send", type: "sendMessage", data: { messages: [{ text: "Your wealth plan" }] } }, { id: "second", type: "sendMessage", data: { messages: [{ text: "Extra" }] } }], edges: [{ source: "trigger", target: "send" }, { source: "send", target: "second" }] };
  const db = { from(table: string) {
    let mutation = false;
    const q: Record<string, any> = {};
    for (const name of ["select", "eq", "limit"]) q[name] = () => q;
    for (const name of ["insert", "update", "upsert"]) q[name] = (value: unknown) => { mutation = true; writes.push({ table, value }); return q; };
    q.single = async () => ({ data: table === "flows" ? flow : table === "flow_sessions" ? (mutation ? { id: "session" } : null) : table === "channels" ? { platform: "facebook", late_account_id: "account" } : table === "conversations" ? { late_conversation_id: conversation } : table === "workspaces" ? { late_api_key_encrypted: "test" } : {}, error: null });
    q.then = (resolve: any) => Promise.resolve({ data: {}, error: null }).then(resolve);
    return q;
  } } as unknown as SupabaseClient<Database, "zernflow">;
  const context = { triggerId: "trigger", flowId: "flow", contactId: "contact", channelId: "channel", workspaceId: "ws", conversationId: "conv", incomingMessage: { text: "wealth plan", sender: { id: "sender", name: "Tester" } }, variables: comment ? { comment_id: "new-comment", post_id: "post" } : {}, ...(comment ? { commentReplyDelivery: { attempted: false, sent: false } } : {}) } as FlowExecutionContext;
  return { db, context, writes };
}
beforeEach(() => { vi.clearAllMocks(); api.privateReply.mockResolvedValue({}); api.message.mockResolvedValue({ data: { data: { messageId: "message" } } }); });
describe("comment first-message delivery", () => {
  it.each(["old-conversation", null])("uses one private reply with conversation %s", async conversation => {
    const { db, context } = fixture(true, conversation);
    await executeFlow(db, context);
    expect(api.privateReply).toHaveBeenCalledExactlyOnceWith({ path: { postId: "post", commentId: "new-comment" }, body: { accountId: "account", message: "Your wealth plan" } });
    expect(api.message).not.toHaveBeenCalled();
    expect(context.commentReplyDelivery?.sent).toBe(true);
  });
  it("records rejected private replies as failures", async () => {
    api.privateReply.mockRejectedValue(new Error("Meta rejected reply"));
    const { db, context, writes } = fixture();
    await executeFlow(db, context);
    expect(context.commentReplyDelivery).toEqual({ attempted: true, sent: false, error: "Meta rejected reply" });
    expect(writes.some(w => w.table === "messages" && w.value.status === "failed")).toBe(true);
    expect(writes.some(w => w.table === "messages" && w.value.status === "sent")).toBe(false);
    expect(api.message).not.toHaveBeenCalled();
  });
  it("keeps normal Messenger delivery for inbound DMs", async () => {
    const { db, context } = fixture(false);
    await executeFlow(db, context);
    expect(api.privateReply).not.toHaveBeenCalled();
    expect(api.message).toHaveBeenCalledTimes(2);
  });
});
