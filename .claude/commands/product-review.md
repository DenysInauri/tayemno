You are executing the Product Review skill. The feature to review is described by the user input: $ARGUMENTS

This skill evaluates an EXISTING implementation against its product specification. The deliverable is a structured review with a verdict and actionable items. Never start fixing or implementing anything — this skill produces an AUDIT, not code.

## Prerequisites

There must be an existing product spec at `docs/<feature>/product-spec.md` (created by the `/product` skill). If the spec does not exist, STOP immediately and tell the user to run `/product` first.

## Process

### Step 1 — Load the spec

Read the product spec (`docs/<feature>/product-spec.md`) thoroughly. Extract:
- All "Must Have" acceptance criteria
- All "Nice to Have" acceptance criteria
- The defined user flows (admin and/or member)
- UI placement expectations
- Out of scope boundaries (to verify nothing out-of-scope crept in)

### Step 2 — Audit the implementation

Investigate the codebase to find everything related to this feature:
- Frontend: pages, components, hooks, API calls, routes, i18n keys, CSS modules
- Backend: routes, services, repositories, database schema, migrations
- Shared: types, enums, constants

For each piece found, note the exact file path and what it does.

### Step 3 — Criteria check

Go through EVERY acceptance criterion from the spec and evaluate:

For each criterion, assign one of:
- **PASS** — implemented correctly and completely
- **PARTIAL** — implemented but incomplete or deviating from spec
- **FAIL** — not implemented or fundamentally broken
- **SKIPPED** — intentionally not done (needs justification)

For PARTIAL and FAIL, describe exactly:
- What was expected (from the spec)
- What exists now (with file references)
- What's missing or wrong

### Step 4 — UX consistency check

Evaluate the implementation against the broader product:
1. **Pattern consistency** — does it follow the same UI patterns as the rest of the app? (navigation, layout, component usage, interactions)
2. **Flow completeness** — can the user complete the full flow without dead ends, confusing states, or missing feedback?
3. **Empty states** — what happens when there's no data? Is it handled gracefully?
4. **Error states** — what happens when things fail? Are errors clear and actionable?
5. **Edge cases** — boundary conditions from the spec — are they handled?
6. **Accessibility** — keyboard navigation, focus management, readable labels

### Step 5 — Scope check

Verify boundaries:
- Was anything built that the spec explicitly marked as "Out of Scope"? Flag it.
- Was anything built that wasn't in the spec at all? Flag it — it may be useful but needs to be acknowledged.
- Are there "Nice to Have" items that were implemented? Note them positively.

### Step 6 — Competitor delta (optional)

If the original spec included competitor analysis, quickly re-check:
- Have competitors shipped updates since the spec was written?
- Is our implementation on par with the baseline the spec defined?

Use web search only if the spec is older than a few weeks or the user specifically asks for this.

### Step 7 — Present the review

**STOP and present the full review to the user before writing any files.** Wait for their feedback and approval.

Structure the review as follows:

---

## Feature Review: <Feature Name>

### Summary Verdict

One of:
- **SHIP** — all Must Have criteria pass, UX is consistent, no critical issues
- **NEEDS WORK** — some Must Have criteria are PARTIAL/FAIL, fixable without rearchitecting
- **RETHINK** — fundamental gaps that require revisiting the approach or the spec itself

One paragraph explaining the verdict.

### Criteria Scorecard

| # | Criterion (short) | Status | Notes |
|---|-------------------|--------|-------|
| 1 | ...               | PASS   |       |
| 2 | ...               | PARTIAL| ...   |

**Must Have:** X/Y passing
**Nice to Have:** X/Y passing

### Critical Issues

Items that MUST be fixed before the feature is considered complete. Each with:
- What's wrong (reference to criterion)
- Where in the code (file paths)
- What the fix should achieve (not how to implement it)

### Improvements

Items that aren't blocking but would significantly improve the feature. Each with:
- What could be better
- Why it matters for the user
- Priority: HIGH / MEDIUM / LOW

### Scope Observations

- Out-of-scope items that crept in (if any)
- Unspecified additions (if any)
- Nice-to-haves that were implemented (positive note)

### Recommended Next Steps

Ordered list of what to do next, grouped as:
1. **Fix** — critical issues to resolve
2. **Improve** — high-priority improvements
3. **Consider** — things to think about for a future iteration

---

### Step 8 — Write the review document

After the user approves the review, save it to `docs/<feature>/product-review.md`.

If a previous review exists, rename it to `product-review-<date>.md` as a historical record before writing the new one.

## Rules

- Every finding must reference exact file paths in the codebase.
- Never propose implementation details — say WHAT needs to change, not HOW.
- Be honest about the verdict. A feature with failing Must Have criteria is "NEEDS WORK" regardless of how much effort was put in.
- Distinguish between "not built yet" and "built wrong" — these require different responses.
- Don't penalize for missing "Nice to Have" items — they're explicitly optional.
- If the spec itself seems wrong or outdated based on what you see in the implementation, flag it as "spec may need updating" rather than marking the implementation as wrong.
- Consider the E2EE context — encrypted data has different testing implications than plaintext.
- This review feeds into `/plan` for the next iteration — make the actionable items clear enough to be directly converted into plan phases.
