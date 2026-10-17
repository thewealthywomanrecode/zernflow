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

The upstream cron configuration runs once per minute and requires a Vercel plan that supports this frequency. Do not activate a paid plan without the owner's approval. The existing cron configuration has not been changed to slower scheduling, because that would affect delays and sequences.

Enter the Zernio API key through the application's Settings. Connecting a Zernio profile can change where its webhook is delivered. Only reconnect the production Instagram profile after testing the deployment and deliberately switching from the hosted service.

## Flow behavior and regression checks

Generic action nodes (`type: action`, `data.actionType: httpRequest` etc.) now resolve to their real executor. The same resolution is used for response persistence and simulation.

The HTTP node saves its response in the configured variable and saves status in `<variable>_status`. Non-2xx responses and transport errors follow the `error` handle; without an error edge the flow ends before the success message. Transport errors use status `0`. Requests time out after 15 seconds.

Run `npm ci`, `npm test`, `npx tsc --noEmit`, and `npm run build`. Tests use mocked HTTP requests; they do not create real Systeme.io contacts.

For the real smoke test, import the owner's flows without embedding API keys in committed files. Use POST https://api.systeme.io/api/contacts with X-API-Key and a JSON body containing the captured email. Test one new address controlled by the owner, inspect the HTTP response, verify exactly one Systeme.io contact, and test a failure path before enabling the public flow. Default Reply still needs email validation and appropriate routing before handling arbitrary customer messages.
