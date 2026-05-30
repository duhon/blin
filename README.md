# blin

GitHub App for automated developer workflow.

## What it does

A GitHub App that automates routine developer tasks — code review, testing, releases, and preview environments. Each capability is handled by a dedicated service that can be configured per repository.

## Getting started

1. Install the [blin-bot](https://github.com/apps/blin-bot) GitHub App on your repository
2. Optionally create `.github/blin.yml` to configure blin for your repo:

```yaml
reviewer:
  enabled: true
  knowledge:
    - magento   # enable Magento 2 knowledge pack
  context_files:
    - .github/CONVENTIONS.md   # project-specific conventions
```

That's it. Mention `@duhon` in any PR comment — blin will understand what you need and route it to the right service.

---

## Architecture

```
GitHub Webhook → AWS Lambda → InMemoryEventBus → Services → GitHub API
```

- **Gateway** — receives webhooks, routes events to services via event bus
- **Butler** — AI dispatcher: classifies intent from PR mentions and routes to the right service
- **Reviewer** — agentic loop: reads project conventions, explores PR context, posts inline comments
- **Event Bus** — in-memory, interface allows swapping to Redis/RabbitMQ later
- **AI** — AWS Bedrock (Claude Sonnet)
- **Knowledge packs** — global best practices (e.g. Magento 2) bundled into the service, enabled per repo via `blin.yml`
- **Semantic memory** — per-repo knowledge accumulated across reviews, stored in S3

## Configuration

Each repository can configure blin via `.github/blin.yml`:
- Enable or disable services per repository
- Define custom rules and instructions for AI per repository

---

## Services

### Butler
Natural language dispatcher — the entry point for all interactions.

Mention `@duhon` in any PR comment with a natural language request:
- `@duhon can you review this?` → triggers Reviewer
- `@duhon how does this module work?` → triggers Analyst

---

### Reviewer
#### Review code
- When requested via `@duhon` mention
- When explicitly requested as a reviewer via GitHub UI

#### Review plan
Follows a fixed plan and submits one final review summarising the general findings (plus inline comments for line-level issues):
1. Understand the PR from its description and verify it actually fixes the described problem — _blocks merge if it doesn't_
2. Compare with how it would fix the problem itself; suggest an alternative only if substantially better (non-blocking)
3. Critical line-level review against the project conventions — inline comments _block merge_
4. Verify CI tests ran and passed — _blocks merge if they failed_
5. Verify a test covering the fix is added/updated (non-blocking note if missing)

#### Discuss
- Reply to comments in review threads

#### Learn
- When a PR is closed, learn retrospectively from the whole review: the submitted verdicts, the inline-comment threads, the diff, and whether it was **merged (accepted)** or **closed without merge (rejected)**. Distil reusable lessons into the repo memory — what gets fixed, what was dismissed (so future reviews stop re-flagging it), with human-to-human discussions weighted highest.

---

### Analyst
#### Create a Discussion for each PR
- Automatically when a PR is opened
- Post a summary of what the PR changes

#### Answer questions
- When mentioned in a Discussion thread
- Responds in the same Discussion, not in the PR

---

### Tester
#### Run tests
- Via external CI (e.g. Jenkins)
- _(optional)_ Via Codespace instead of external CI

#### Analyze failures
- Read failure logs from GitHub Checks
- Suggest fixes as a PR comment

---

### Release Manager
#### Generate release notes
- Based on merged PRs

#### Publish release
- Create a git tag
- Publish the package to Packagist
- Create a GitHub Deployment to track the release status across environments

---

### Environment Manager
#### Create preview environment
- Spin up a Codespace for the PR branch
- Create a GitHub Deployment so the environment link is visible natively in the PR

