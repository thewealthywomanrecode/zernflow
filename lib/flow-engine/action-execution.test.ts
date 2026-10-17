import { describe, it, expect, vi, afterEach } from "vitest";
import { executionType } from "./node-type";
import { executeHttpRequest, executeFlow } from "./engine";
import type { FlowExecutionContext } from "./types";
import type { Database } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
const context = () => ({ variables: { message: "Hey sis, my email is test@example.com" }, incomingMessage: { text: "Hey sis, my email is test@example.com" }, workspaceId: "ws", contactId: "contact", channelId: "channel", flowId: "flow", conversationId: "conv", triggerId: "trigger" } as FlowExecutionContext);
afterEach(() => vi.unstubAllGlobals());
describe("exported action nodes", () => {
  it("dispatches the editor's generic action nodes", () => {
    expect(executionType({type:"action", data:{actionType:"httpRequest"}})).toBe("httpRequest");
    expect(executionType({type:"action", data:{actionType:"setCustomField"}})).toBe("setCustomField");
    expect(()=>executionType({type:"action", data:{actionType:"unknown"}})).toThrow();
  });
  it("runs generic Set Field and HTTP nodes in the real traversal and persists the response", async () => {
    const writes: Array<{table:string; value:unknown}> = [];
    const flow = {nodes:[{id:"trigger",type:"trigger",data:{}},{id:"field",type:"action",data:{actionType:"setCustomField",fieldSlug:"email",value:"{{captured_email}}"}},{id:"http",type:"action",data:{actionType:"httpRequest",method:"POST",url:"https://api.systeme.io/api/contacts",body:'{"email":"{{captured_email}}"}',responseVariable:"systeme_response"}}],edges:[{source:"trigger",target:"field"},{source:"field",target:"http"}]};
    const db = {from(table:string) {
      let mutation=false;
      const q: Record<string, unknown> = {};
      for(const name of ["select","eq","limit"])q[name]=()=>q;
      for(const name of ["insert","update","upsert"])q[name]=(value:unknown)=>{mutation=true;writes.push({table,value});return q;};
      q.single=async()=>({data:table==="flows"?flow:table==="flow_sessions"?(mutation?{id:"session"}:null):table==="channels"?{platform:"instagram",late_account_id:"account"}:table==="custom_field_definitions"?{id:"email-field"}:{},error:null});
      q.then=(resolve:(x:unknown)=>unknown)=>Promise.resolve({data:{},error:null}).then(resolve);
      return q;
    }} as unknown as SupabaseClient<Database,"zernflow">;
    const fetcher=vi.fn().mockResolvedValue(new Response('{"id":123}',{status:201}));vi.stubGlobal("fetch",fetcher);
    await executeFlow(db,context());
    expect(writes).toContainEqual({table:"contact_custom_fields",value:{contact_id:"contact",field_id:"email-field",value:"test@example.com"}});
    expect(fetcher).toHaveBeenCalledWith("https://api.systeme.io/api/contacts",expect.objectContaining({method:"POST",body:'{"email":"test@example.com"}'}));
    expect(writes.some(w=>w.table==="flow_sessions" && JSON.stringify(w.value).includes('"systeme_response":{"id":123}'))).toBe(true);
  });
});
describe("HTTP request failures",()=>{
 it("records a rejection and stops the success path",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response('{"error":"Invalid API key"}',{status:401})));
  const ctx=context();expect(await executeHttpRequest({method:"POST",url:"https://api.systeme.io/api/contacts",responseVariable:"response"},ctx)).toBe("handle:error");
  expect(ctx.variables?.response_status).toBe("401");expect(ctx.variables?.response).toEqual({error:"Invalid API key"});
 });
 it("records transport failure without leaking secrets",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("secret transport detail")));
  const ctx=context();expect(await executeHttpRequest({method:"POST",url:"https://api.systeme.io/api/contacts",responseVariable:"response"},ctx)).toBe("handle:error");
  expect(ctx.variables?.response_status).toBe("0");expect(String(ctx.variables?.response)).not.toContain("secret");
 });
});
