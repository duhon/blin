# blin — Project Context

## What is blin
GitHub App for automating developer routine tasks powered by Claude AI. Named after the Russian word for pancake (блин).

## Architecture
Event-driven monorepo. Gateway receives GitHub webhooks and publishes events to an in-memory event bus. Each service subscribes to relevant events.

```
GitHub Webhook → Gateway → Event Bus → Services
```

## Monorepo structure
```
blin/
├── gateway/              # Webhook receiver (Express + Octokit)
├── services/
│   ├── reviewer/         # Posts PR reviews
│   ├── analyst/          # Creates GitHub Discussions for PRs
│   ├── tester/           # Analyzes CI failures
│   ├── release-manager/  # Generates release notes, creates tags
│   └── environment-manager/  # Creates Codespace preview environments
└── packages/
    └── event-bus/        # InMemoryEventBus (IEventBus interface)
```

## Key decisions
- **TypeScript + ESM** (NodeNext modules) — required for @octokit/app v15
- **npm workspaces** — monorepo management
- **InMemoryEventBus** — simple for now, IEventBus interface allows swapping to Redis/RabbitMQ later
- **All services run in one process** during mock/dev phase
- **GitHub Discussions** — used by Analyst service instead of PR comments (keeps PRs clean)
- **GitHub Deployments API** — used by Environment Manager and Release Manager

## Current state
All services are **mocked** — they subscribe to events and post placeholder responses to GitHub. Real AI implementation comes next.

## What we're working on
Setting up local development via GitHub Codespaces:
1. ✅ Monorepo structure created
2. ✅ Event Bus implemented
3. ✅ Gateway implemented
4. ✅ Mock services created
5. ✅ Pushed to github.com/duhon/blin
6. ✅ Codespace configured (.devcontainer/devcontainer.json)
7. 🔄 Next: create .env with credentials and run the gateway

## Running the gateway
```bash
cd gateway && npm run dev
```

## Environment variables needed (gateway/.env)
```
GITHUB_APP_ID=        # from github.com/settings/apps/blin-bot
GITHUB_PRIVATE_KEY=   # contents of downloaded .pem file
GITHUB_WEBHOOK_SECRET= # secret set when creating the GitHub App
PORT=3000
```

## GitHub App
- Name: blin-bot
- Webhook URL: set to Codespace forwarded port URL (port 3000, make it public)
- Events: pull_request, pull_request_review_comment, check_run
