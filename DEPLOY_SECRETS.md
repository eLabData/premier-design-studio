# GitHub Secrets — eLabData/premier-design-studio

Configure these at: https://github.com/eLabData/premier-design-studio/settings/secrets/actions

## VPS / SSH
VPS_HOST=72.60.1.200
SSH_USER=deploy-git
SSH_PRIVATE_KEY=<cicd_deploy private key (ed25519, same as KOA V2)>

## Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

## OpenRouter / AI
NEXT_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-...

## Stripe
STRIPE_SECRET_KEY=<from Stripe dashboard>
STRIPE_WEBHOOK_SECRET=<from Stripe webhook config>

## Optional
OPENAI_API_KEY=<for Whisper direct, if used>
PEXELS_API_KEY=<from pexels.com/api>

## Note: NEXT_PUBLIC_APP_URL is hardcoded to https://studio.elabdata.com.br in the deploy workflow.
