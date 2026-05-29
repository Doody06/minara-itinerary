# ADR 0001 — Use `unknown` instead of `any` in sanitizers.ts

**Status:** Accepted  
**Date:** 2026-05-26  
**Decider:** Person B (resolved merge conflict)

## Context

During iteration 1 (B7: Unicode sanitizer extraction), a merge conflict arose in
`supabase/functions/generate-itinerary/sanitizers.ts`. Both sides implemented
identical runtime logic and the same Unicode-preserving regex. They differed only
in TypeScript types:

- **HEAD:** `any` for all parameters and accumulators (`out: any = {}`, `item: any`, etc.)
- **Incoming (7aa7f03):** `unknown` for parameters, `Record<string, unknown>` for
  accumulators, explicit `as` casts at each narrowing point.

## Decision

Take the incoming side in full. All sanitizer functions use `unknown` as the
parameter type and narrow with explicit type guards before accessing properties.

## Rationale

`unknown` forces explicit narrowing at every property access. If the AI response
shape changes (a non-object slips in where an object is expected), the TypeScript
compiler catches it rather than letting `any` silently propagate through. The
sanitizers are the last line of defense before AI output reaches the frontend, so
type safety here has outsized value.

No behavior difference at runtime — both sides produce identical output.

## Consequences

- If a future contributor adds a new sanitizer function, they must use `unknown`
  and narrow explicitly. `any` parameters in this file should be treated as a bug.
- The HEAD branch's looser types are gone. If any downstream code was relying on
  the `any` return type for implicit casting, it will now need an explicit cast.
