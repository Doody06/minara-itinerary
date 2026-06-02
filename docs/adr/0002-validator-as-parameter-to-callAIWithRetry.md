# ADR 0002 — Pass validator as a parameter to `callAIWithRetry`

**Status:** Accepted  
**Date:** 2026-05-28  
**Decider:** Person B (iteration 2 grilling session)

## Context

Iteration 2 (B2) introduces structural validation of the AI response before it
reaches the frontend. There were two candidate locations for this validation:

**Option A — inside the retry loop (validator passed as a parameter):**
```ts
async function callAIWithRetry(
  messages, tools, gatewayUrl, apiKey, maxRetries,
  validate: (data: unknown) => boolean
)
```
A validation failure is treated identically to a parse failure: the loop
continues if attempts remain, exhausts retries if not.

**Option B — outside the retry loop, in the main handler:**
```ts
const result = await callAIWithRetry(...);
if (!isValidFullResponse(result.data)) {
  return structured error;  // retries already spent
}
```
Simpler call site, but validation failures cannot consume remaining retry budget.

## Decision

Option A. The validator is injected as a parameter into `callAIWithRetry` and
called immediately after the AI response is parsed. A validation failure is
treated as a retry-eligible failure — it consumes one retry attempt and the loop
continues if budget remains.

## Rationale

The purpose of retries is to recover from transient AI misbehaviour. An invalid
response shape (e.g. `days` is empty) is exactly the kind of transient failure
retries are meant to handle — the next call may return a valid shape. Option B
discards that recovery opportunity: by the time validation runs, all retry
attempts are gone.

The cost is a slightly more complex signature for `callAIWithRetry`. This is
acceptable because the function is an internal implementation detail called in
one place; iteration 4 (B1) will extract it into its own module anyway.

## Consequences

- `callAIWithRetry` takes a `validate` function parameter. Callers must supply
  the correct validator for their response mode (full generation, targeted adjust,
  whole-itinerary adjust).
- Both parse failures and validation failures share the same retry path. They are
  distinguished only by log message, not by code path. If finer-grained retry
  logic is needed per failure type in the future, the signature will need to
  change (e.g. accept `{ shouldRetry: boolean }` from the validator).
- The `validate` parameter makes the function's contract explicit: a caller that
  passes a validator that always returns `true` opts out of structural validation.
  This is intentional — tests can use it to isolate retry-count behaviour from
  shape validation.
