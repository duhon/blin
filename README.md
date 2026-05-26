# blin

GitHub App for automated developer workflow.

## What it does

A GitHub App that automates routine developer tasks — code review, testing, releases, and preview environments. Each capability is handled by a dedicated service that can be configured per repository.

## Configuration

Each repository can configure blin via `.github/blin.yml`:
- Enable or disable services per repository
- Define custom rules and instructions for AI per repository

---

## Services

### Reviewer
#### Review code
- When explicitly requested as a reviewer
- On demand via the "Re-request review" button

#### Discuss
- Reply to comments in review threads

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

