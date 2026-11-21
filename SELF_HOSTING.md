# Wealth Flow Zernflow installation

This fork is a single-operator installation that shares Wealth Flow App's Supabase project. It uses only the `zernflow` database schema. The original `public` app tables are not migration targets.

## Database

The live Wealth Flow project already has the isolated schema, owner membership, and Email custom field installed. Do not rerun the installer on that project. `supabase/install/zernflow-single-admin.sql` documents the clean-install schema for an empty target schema; it deliberately has no signup trigger and no automatic administrator enrollment.

The administrator must be explicitly assigned by a trusted database operator in `zernflow.administrators` and `zernflow.workspace_members`. Public signup and GitHub OAuth signup have been removed from this app. Use the existing Wealth Flow owner login. Other Wealth Flow users have no automation access.

In Supabase Data API settings, append `zernflow` to Exposed schemas, preserving every existing entry. Do not remove `public` or change the main site's authentication URLs. Only add the new deployment's authentication callback URL if required.

Database separation is logical: authentication, capacity, backups and project-wide server credentials remain shared. Store server credentials only in private Vercel environment variables.

## Vercel

Create a separate Vercel project from this repository. Configure:

- `NEXT_PUBLIC_SUPABASE_URL`: the Wealth Flow project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the project's publishable/legacy anon key (public client credential).
- `SUPABASE_SERVICE_ROLE_KEY`: project server secret; never prefix with NEXT_PUBLIC.
- `CRON_SECRET`: a new random secret for this installation.
- `NEXT_PUBLIC_APP_URL`: the deployed application's URL.

Vercel cron schedules are disabled for the owner's Hobby deployment. Immediate webhook-driven DM flows and HTTP lead submissions do not need the scheduler. Timed delays, scheduled broadcasts, and drip sequences require an external scheduler to call /api/cron/jobs and /api/cron/sequences with the CRON_SECRET bearer token; they must not be treated as operational until that scheduler is configured and verified. Do not activate a paid Vercel plan without the owner's approval.

Enter the Zernio API key through the application's Settings. Connecting a Zernio profile can change where its webhook is delivered. Only reconnect the production Instagram profile after testing the deployment and deliberately switching from the hosted service.

## Flow behavior and regression checks

Generic action nodes (`type: action`, `data.actionType: httpRequest` etc.) now resolve to their real executor. The same resolution is used for response persistence and simulation.

The HTTP node saves its response in the configured variable and saves status in `<variable>_status`. Non-2xx responses and transport errors follow the `error` handle; without an error edge the flow ends before the success message. Transport errors use status `0`. Requests time out after 15 seconds.

Run `npm ci`, `npm test`, `npx tsc --noEmit`, and `npm run build`. Tests use mocked HTTP requests; they do not create real Systeme.io contacts.

For the real smoke test, import the owner's flows without embedding API keys in committed files. Use POST https://api.systeme.io/api/contacts with X-API-Key and a JSON body containing the captured email. Test one new address controlled by the owner, inspect the HTTP response, verify exactly one Systeme.io contact, and test a failure path before enabling the public flow. Default Reply still needs email validation and appropriate routing before handling arbitrary customer messages.

## Private Wealth Plan and Wealth Flow offers

Both comment offers collect email before delivering a link. `wealth flow` marks
`wealth_plan_pending`; `wealth plan` marks `private_wealth_plan_pending`. Each
entry clears the other pending tag, so the most recently requested offer owns
the next email reply. Both use the single published `Systeme.io Webhook` default
reply handler, its email validation, stored Email field, and social-name sync.

After contact creation and name sync, the handler branches by pending tag:

- Wealth Flow preserves its existing lead tag and `/wealthflow-demo` destination.
- Wealth Plan calls the website's existing `/api/wealth-plan-lead` endpoint to
  apply `Wealth Plan Started`, then sends `{{wealth_plan_url}}` with the
  `BUILD MY $5K+ PLAN` button. The URL carries the captured email and available
  social first name, allowing the website to bypass its Page 7 capture gate.

Each offer has independent approved message copy. Failed requests retain the
pending tag and send a retry prompt; a delivery message requires successful
contact creation, name sync, and offer tagging. Existing Systeme.io email
campaigns must listen to the corresponding offer tag; saving a contact does not
itself prove that an email campaign delivered a message.

Direct website visitors still start immediately and provide first name, last
name, and email at Page 7. URL email identification does not require a name.

`scripts/private-wealth-plan-flows.sql` records the initial split.
`scripts/offer-lead-first-flows.sql` applies the subsequent lead-first routing
and approved copy. Both check expected versions and snapshot before/after states;
they intentionally refuse to reapply against a changed configuration. Neither
script contains API credentials or customer records.
