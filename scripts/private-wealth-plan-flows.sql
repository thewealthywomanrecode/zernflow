-- Apply only after the website and ZernFlow link resolver are deployed.
-- No credentials, customer data, existing offer URLs or Systeme tag names change.
begin;
do $migration$
declare
  original zernflow.flows%rowtype;
  reply zernflow.flows%rowtype;
  new_id uuid;
  source_trigger jsonb;
  new_message jsonb;
  flow_keywords jsonb := '[{"value":"wealth flow","matchType":"contains"}]'::jsonb;
  plan_keywords jsonb := '[{"value":"wealth plan","matchType":"contains"}]'::jsonb;
begin
  select * into strict original from zernflow.flows where id='02b54e75-866f-4636-a357-38eb0b7a3b35' for update;
  select * into strict reply from zernflow.flows where id='7edcff18-8b62-49c3-966a-65625671dc15' for update;
  if exists(select 1 from zernflow.flows where workspace_id=original.workspace_id and name='Lead Capture — Wealth Plan') then
    raise exception 'New offer already exists: inspect before applying again';
  end if;
  if original.version<>6 or reply.version<>25 then raise exception 'Source flow changed: review before applying'; end if;
  if (select count(*) from zernflow.triggers where flow_id=original.id and type='comment_keyword' and is_active)<>1 then
    raise exception 'Unexpected source trigger configuration';
  end if;
  select n into strict source_trigger from jsonb_array_elements(original.nodes) n where n->>'type'='trigger';
  source_trigger := jsonb_set(source_trigger,'{data,keywords}',plan_keywords);
  source_trigger := jsonb_set(source_trigger,'{data,label}','"Wealth Plan Trigger"');
  select n into strict new_message from jsonb_array_elements(original.nodes) n where n->>'id'='msg-email';
  new_message := jsonb_set(new_message,'{id}','"msg-private-plan"');
  new_message := jsonb_set(new_message,'{data}',jsonb_build_object('label','Open Private Wealth Plan','messages',jsonb_build_array(jsonb_build_object(
    'text',E'Hey sis! 💚 Here’s your private Wealth Plan. Start with your own numbers, find money to redirect, and make your first wealth move.\n\nOpen your plan: {{wealth_plan_url}}',
    'buttons',jsonb_build_array(jsonb_build_object('type','url','title','BUILD MY WEALTH PLAN','url','{{wealth_plan_url}}'))))));
  insert into zernflow.flows(workspace_id,name,description,status,nodes,edges,viewport,version,published_at)
  values(original.workspace_id,'Lead Capture — Wealth Plan','Independent copy of Lead Capture (02b54e75-866f-4636-a357-38eb0b7a3b35) for the interactive Private Wealth Plan. Known contact email travels in the link; unknown visitors capture email at Page 7.','published',jsonb_build_array(source_trigger,new_message),
    '[{"id":"private-plan-entry","source":"trigger-1","target":"msg-private-plan"}]'::jsonb,original.viewport,1,now()) returning id into new_id;
  insert into zernflow.triggers(flow_id,channel_id,type,config,priority,is_active)
  select new_id,channel_id,type,jsonb_set(config,'{keywords}',plan_keywords),priority,is_active
  from zernflow.triggers where flow_id=original.id and type='comment_keyword';
  update zernflow.flows set name='Lead Capture — Wealth Flow',nodes=(
    select jsonb_agg(case
      when n->>'type'='trigger' then jsonb_set(n,'{data,keywords}',flow_keywords)
      when n->>'id'='msg-email' then jsonb_set(n,'{data,messages}',(
        select jsonb_agg(jsonb_set(m,'{text}',to_jsonb(regexp_replace(m->>'text','wealth plan','Wealth Flow','gi')))) from jsonb_array_elements(n#>'{data,messages}') m))
      else n end order by ordinal) from jsonb_array_elements(original.nodes) with ordinality a(n,ordinal)
    ),version=version+1,updated_at=now() where id=original.id;
  update zernflow.triggers set config=jsonb_set(config,'{keywords}',flow_keywords)
    where flow_id=original.id and type='comment_keyword';
  -- Only rename the old public confirmation text. Preserve its existing HTTP
  -- nodes, API headers, tags, email validation, edges and wealthflow-demo URL.
  update zernflow.flows set nodes=(
    select jsonb_agg(case when n->>'id'='node_1792266611424_7' then jsonb_set(n,'{data,messages}',(
      select jsonb_agg(jsonb_set(m,'{text}',to_jsonb(regexp_replace(m->>'text','wealth plan','Wealth Flow','gi')))) from jsonb_array_elements(n#>'{data,messages}') m))
      else n end order by ordinal) from jsonb_array_elements(reply.nodes) with ordinality a(n,ordinal)
    ),version=version+1,updated_at=now() where id=reply.id;
end;
$migration$;
commit;
