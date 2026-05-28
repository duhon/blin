export default `
# Basic Code Review Knowledge

A thorough review covers four dimensions. Apply all of them to every PR.

Every comment must carry a severity prefix on the first line:
- **[critical]** — blocks merge; incorrect, insecure, or will cause an outage
- **[major]** — should be fixed in this PR; real problem but not an immediate blocker
- **[minor]** — suggestion or nit; the author may address it at their discretion

**By default, only post [critical] comments. Skip [major] and [minor] unless the project configuration explicitly enables them.**

**Test code (files in test/spec/Test directories) can NEVER have [critical] issues. Tests do not run in production. The worst a bad test can do is give false confidence — that is [major] at most.**

---

## 1. Correctness

The code must do what it claims to do, handle all paths, and not break under edge cases.

Critical:
- Unhandled exceptions or error paths that will crash the service
- Missing await on async calls that causes data loss or incorrect behavior
- Race conditions or unsafe shared state mutations
- Logic errors that produce wrong results on valid input

Major:
- Off-by-one errors or boundary conditions that affect real use cases
- Edge cases (empty input, zero, null) that are unhandled but don't crash
- Missing tests for new non-trivial logic

Minor:
- Tests that assert implementation details instead of behavior
- Redundant conditions or unreachable branches

---

## 2. Security

Flag anything that could be exploited or leak sensitive data.

Critical:
- Secrets, tokens, passwords, or PII written to logs or responses
- User-controlled input concatenated into shell commands, SQL, or file paths
- Missing authentication or authorization on a new endpoint or action
- Hardcoded credentials in source

Major:
- Missing input validation at a system boundary (user input, external API response)
- Internal error details (stack traces, db errors) exposed to external callers
- Insecure deserialization, path traversal, or open redirect risk

Minor:
- Sensitive config that could move to environment variables but isn't harmful yet
- Missing security headers on responses that don't handle sensitive data

---

## 3. Performance

Flag patterns that will cause problems at scale, not micro-optimizations.

Critical:
- N+1 query inside a loop over a user-facing collection with no upper bound
- Unbounded collection loaded fully into memory (missing pagination/streaming)
- Synchronous blocking I/O in a hot path that will stall the event loop

Major:
- Repeated expensive computation that could be hoisted or memoized
- Large payloads returned to clients without size limits

Minor:
- Unnecessary work that could be skipped but has negligible impact at current scale

---

## 4. Architecture

The change should fit the existing design and not introduce structural debt.

Critical:
- Business logic placed directly in a transport layer (controller, handler, route)
- Direct access to another module's internals, bypassing its public interface
- Breaking change to a public API (removed/renamed/reordered parameters) without versioning

Major:
- Duplication across multiple call sites that will need to be kept in sync
- Shared mutable state or a new singleton without clear justification
- Public interface that is easy to misuse — missing precondition validation

Minor:
- Dead code, commented-out blocks, or TODO stubs left in production code
- Magic numbers or strings that should be named constants
`.trim();
