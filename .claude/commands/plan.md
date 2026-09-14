You are executing the Multi-Phase Planning skill. The task to plan is described by the user input: $ARGUMENTS

The deliverable is DOCS, not code. Never start implementing during this process, even if the plan seems simple enough to just do.

## Stage 1 — Investigate, then present a high-level plan

1. **Investigate the codebase first.** Every claim must be a verified fact, not an assumption. Before proposing anything: find the exact files and line numbers involved, grep for how many call sites/consumers an existing thing has, read the closest existing "sibling" feature that already solves a similar problem (naming convention, folder structure, how it wires into the rest of the system) so the plan imitates a proven pattern instead of inventing a new one. If you assumed something (e.g. "there's probably a helper for X") and haven't verified it, say so explicitly or go verify it — never let an unverified guess become a plan step.

2. **Surface open decisions instead of picking silently.** If the task has ambiguity — semantics, scope boundaries, trade-offs, or something that changes user-visible behavior — list each one explicitly with your recommendation, and ask me to rule on it (one clarifying question per ambiguity, batched together) BEFORE finalizing the plan. Don't bury a judgment call inside the plan as if it were settled.

3. **Break the work into phases.** Each phase must be independently shippable and independently reviewable — normally its own PR. Order by dependency and say which phases require earlier ones merged. Prefer a few substantial phases over many tiny slivers.

4. **Present:** goal, the key verified findings (with file/line references), the decisions that need my ruling (with your recommendation for each), a phase table (number / name / one-line content / depends-on), and what's explicitly OUT of scope.

5. **STOP and wait for my approval.** Do not write any files before I approve the phase breakdown and rule on the open decisions.

## Stage 2 — After I approve: write the docs

Create a folder (e.g. `docs/<initiative-kebab-name>/`) with:

```
docs/<initiative>/
  README.md
  phase-1-<name>/plan.md
  phase-1-<name>/opus-prompt.md
  phase-2-<name>/...
```

Write `plan.md` + `opus-prompt.md` for EVERY phase up front, not just phase 1 — even though I'll execute them one at a time in separate fresh sessions, so each phase needs to be fully specified now while you still have all this context loaded.

### README.md

- Title + one-paragraph summary of what changes and why.
- Decisions — numbered, each ending "Approved" (what I ruled on in Stage 1).
- Verified findings — the front-loaded facts: exact files/lines, patterns the plan relies on, and WHY (so a cold session can re-verify instead of trusting it blindly).
- Behavioral changes — anything observably different after this ships.
- Phase table — linking each phase's plan.md, noting dependencies.
- Out of scope — explicit non-goals, so an executing session doesn't "helpfully" expand.

### plan.md (per phase)

- One line stating this phase's size/shape, and a short "why this approach is sufficient — don't add anything beyond this" section anywhere the design might tempt scope creep or unnecessary abstraction.
- Numbered steps, each with the exact file path and, for edits to EXISTING files, before/after code blocks or precise instructions on what changes. For NEW files, specify the exact shape (fields, function signatures, which existing sibling pattern to copy).
- Call out anywhere the plan is deliberately offering two valid options instead of picking one — the executing session must stop and ask, not guess.

### opus-prompt.md (per phase)

Written to be pasted verbatim into a FRESH session that has none of this conversation's context. Structure:

1. One-paragraph framing: what phase of what initiative, working from the repo root.
2. If this phase depends on an earlier phase: a "Step 0 — verify prerequisites" section listing the exact files/things the earlier phase should have produced, with an instruction to STOP and report if anything is missing rather than improvising it.
3. Read first, in this exact order — the sibling plan.md, this project's relevant convention/rule files, and the specific existing files whose patterns this phase imitates.
4. The task — condensed numbered steps referencing the plan.md sections; "follow the plan exactly."
5. Explicitly forbidden in this phase — hard scope locks: neighboring phases' files/concerns, tempting related cleanups, anything marked out-of-scope in the README.
6. Hard rules — this project's non-negotiables (formatting/edit discipline, don't touch certain shared/dangerous things, don't commit/push, don't run destructive commands).
7. Verify — the exact build/lint/test commands for what this phase touches, plus a "git diff scope check" listing which files/folders should appear in the diff and nothing else.
8. Report — what to summarize when done, ending "then stop — the user reviews before the next phase."

## Non-negotiables throughout

- Never implement during Stage 1 — investigation and questions only.
- Never write the docs before I've approved the phase breakdown.
- Every fact in the docs must be traceable to something you actually read, not inferred.
- A plan step that says "probably" or "should" without having checked is not finished — go check it.
