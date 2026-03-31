---
name: Premier Design Studio — Project Status
description: Full project status, architecture, what's built, what's pending, credentials, and next steps for Premier Design Studio
type: project
---

# Premier Design Studio — Status Completo (2026-03-31)

## Repos
- **App**: https://github.com/eLabData/premier-design-studio
- **Working dir**: /Users/rafaelpizzutto/Dev/KOA/premier-design-studio
- **Domain**: https://studio.elabdata.com.br (LIVE, deployed via GitHub Actions)
- **Postiz fork** (NAO USADO): https://github.com/eLabData/postiz-app — decidimos portar o codigo nativo

## Stack
- Next.js 16 + Tailwind v4 + shadcn/ui + Zustand
- Remotion (video compositions, animated captions)
- Fabric.js (canvas post designer)
- FFmpeg WASM (video processing)
- OpenRouter (AI — Claude, Whisper, GPT-4o-mini)
- Supabase (auth, DB, storage, edge functions)
- Stripe (billing — codigo pronto, produtos nao criados ainda)

## Supabase
- **Project URL**: https://vhkkkdcjbexqgutnbkde.supabase.co
- **Project ref**: vhkkkdcjbexqgutnbkde
- **DB Password**: (ver memory do Claude)
- **Tabelas**: profiles, projects, usage_events, processing_sessions, scheduled_posts, social_integrations, social_posts, oauth_states
- **Edge Functions**: generate-logo, generate-store-assets (live, usando OpenRouter)
- **Storage bucket**: media (public read, owner write)

## Deploy
- **VPS**: 72.60.1.200 (deploy-git, cicd_deploy key)
- **CI/CD**: GitHub Actions → SSH → Docker compose
- **Container**: premier-web na porta 3001
- **Nginx**: SSL via certbot, proxy para premier-web:3000
- **GitHub Secrets setados**: VPS_HOST, SSH_USER, SSH_PRIVATE_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_OPENROUTER_API_KEY, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET

## Usuario Admin
- **Email**: rafael@elabdata.com.br
- **Senha**: (ver memory do Claude)
- **Plano**: business (acesso full)
- **ID**: e717b3ee-6cd2-4139-9983-f3ae8aa34cce

## Modulos (23 rotas)

### Funcionando
- **/** — Homepage/dashboard com cards dos modulos + conectores sociais + versao v0.1.0
- **/login** — Login com email/senha
- **/register** — Cadastro
- **/settings** — Perfil, planos, conectores inline, logout
- **/settings/connections** — Gerenciar redes sociais conectadas (YouTube OK)
- **/terms** — Termos de Servico
- **/privacy** — Politica de Privacidade
- **/editor** — Editor de video (FFmpeg WASM, timeline, preview, toolbar, auto-edit AI pipeline, Remotion compositions)
- **/designer** — Designer de posts (Fabric.js canvas, templates, formatos por plataforma)
- **/photos** — Editor de fotos (CSS filters, AI chat)
- **/studio** — Studio AI (logos, mockups, store assets via Edge Functions)
- **/scheduler** — Agendador (calendario, fila, integracoes reais via Postiz API / nativo)
- **/library** — Biblioteca de projetos (localStorage)
- **/analytics** — Painel de custos e uso de IA (mock data)

### API Routes
- **/api/social/connect/[provider]** — Inicia OAuth
- **/api/social/callback/[provider]** — Callback OAuth (YouTube tem seletor de canal)
- **/api/social/integrations** — GET lista, DELETE desconecta
- **/api/social/publish** — POST publica/agenda em plataformas
- **/api/social/youtube-channels** — Lista canais YouTube
- **/api/ai/chat** — Proxy OpenRouter pra chat nos editores
- **/api/stripe/checkout** — Cria sessao Stripe
- **/api/stripe/portal** — Portal do cliente Stripe
- **/api/stripe/webhook** — Webhook Stripe (sync plano)
- **/api/auth/logout** — Logout server-side (limpa cookies, redireciona)

## Social Media Providers (codigo nativo, portado do Postiz)
- **YouTube** — FUNCIONANDO (OAuth OK, seletor de canal, upload video)
- **Instagram** — Codigo pronto, app Meta em andamento (App Review pendente)
- **Facebook** — Codigo pronto, app Meta em andamento
- **TikTok** — Codigo pronto, app criado (falta keys no deploy)
- **X/Twitter** — Codigo pronto, falta criar app
- **LinkedIn** — Codigo pronto, falta criar app

## Keys/Credentials no .env.local
Veja `.env.local.example` para as variaveis. Valores reais nos GitHub Secrets e na memory do Claude (`premier_project_status.md`).

## Remotion Skills
- Instaladas via `npx skills add remotion-dev/skills`
- 38 arquivos de referencia em `.agents/skills/remotion-best-practices/`
- Skills: animations, audio, captions, charts, compositions, fonts, rendering, etc.

## Planos
- **Free** (R$0): Editor basico, Designer basico, 5 videos/mes, Legendas IA, Marca d'agua
- **Pro** (R$49/mes): + Studio AI, Agendador, Analytics, Auto-edit IA, B-roll, Sem marca, 50 videos/mes
- **Business** (R$149/mes): + Export 4K, API, Time/colaboracao, Videos ilimitados, Suporte prioritario

## O que falta fazer (proximos passos)
1. **Meta App Review** — submeter pra aprovacao (Instagram + Facebook)
2. **TikTok** — colocar Client Key/Secret no deploy
3. **X/Twitter** — criar app em developer.x.com
4. **LinkedIn** — criar app em linkedin.com/developers
5. **Stripe** — criar produtos/precos no Stripe Dashboard
6. **Remotion templates** — criar templates de video baseados nos prompts da Sabrina Ramonov (explainer, product demo, testimonial, data viz, avatar overlays)
7. **Editor de video** — testar FFmpeg WASM end-to-end em producao
8. **Analytics** — trocar mock data por dados reais do Supabase
9. **Library** — migrar de localStorage pra Supabase
10. **Mobile** — ja responsivo, testar end-to-end

## Decisoes de Arquitetura
- **Social publishing**: nativo (portado do Postiz open-source), sem intermediario
- **AI**: tudo via OpenRouter (endpoint unico pra todos os modelos)
- **Video**: FFmpeg WASM no browser + Remotion pra composicoes
- **Auth**: Supabase Auth com SSR + middleware
- **Deploy**: Docker standalone no VPS, GitHub Actions CI/CD
- **Logout**: GET /api/auth/logout (server-side cookie clear + redirect)
