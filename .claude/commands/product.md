You are executing the Product Research skill. The feature to research is described by the user input: $ARGUMENTS

The deliverable is a structured feature specification with acceptance criteria. Never start implementation planning or writing code — this skill produces PRODUCT requirements, not technical plans.

## Context

Tayemno is a B2B secure workspace platform. Our users are:
- **Admins** — manage the workspace, members, permissions, and security policies.
- **Members** — use the workspace daily for secure file storage, sharing, and collaboration.

Every feature must serve a clear purpose for one or both of these roles. A feature that exists "just because competitors have it" is not justified — it must solve a real problem in the secure workspace context.

## Process

### Step 1 — Understand the current state

Before any external research:
1. Investigate the existing codebase to understand the current UI structure, navigation, page layout, and relevant components. Find where this feature would naturally fit in the user flow.
2. Identify what related functionality already exists (routes, pages, components, API endpoints, database tables) — reference exact files and paths.
3. Map the current user journey that this feature would affect or extend.

### Step 2 — Competitor analysis

Research how established products handle this feature. Focus on:
- **Proton Drive / Proton for Business** — closest competitor in E2EE space
- **Tresorit** — enterprise E2EE file sharing
- **Google Workspace (Admin Console)** — industry standard for B2B admin tooling
- **Dropbox Business** — widely adopted B2B file platform
- Other relevant competitors if applicable to the specific feature

For each competitor, identify:
- What exactly they offer for this feature
- How it's accessed (where in the UI, who can access it)
- What works well and what's commonly criticized by users
- What's clearly B2B-specific vs. consumer-oriented

Use web search to find up-to-date information, documentation pages, support articles, and user reviews.

### Step 3 — Define the feature scope

Based on Steps 1-2, determine:
1. **Who benefits** — admin, member, or both? In what scenario?
2. **The core problem it solves** — one sentence, no jargon.
3. **What's essential vs. nice-to-have** — split into "must have for launch" and "can add later."
4. **What to explicitly NOT build** — features that competitors have but don't fit our context, or that add complexity without clear value.

### Step 4 — Define the user flow

Describe the concrete user experience:
- Where does the user find/access this feature? (exact location in current UI)
- What does the user see? (describe the interface, not wireframes)
- What actions can they take?
- What feedback do they get?
- Edge cases: empty states, error states, permission boundaries.

If the feature affects multiple roles (admin vs. member), describe each flow separately.

### Step 5 — Present open questions

Surface any ambiguities or decisions that need the product owner's input. For each:
- State the question clearly
- Provide your recommendation with reasoning
- Note what competitors do differently

**STOP and wait for answers before finalizing the specification.**

### Step 6 — Write the acceptance criteria

After questions are resolved, produce the final deliverable as a structured document in `docs/<feature-kebab-name>/product-spec.md`:

```
docs/<feature>/
  product-spec.md
```

#### product-spec.md structure

```markdown
# <Feature Name>

## Problem Statement
One paragraph: what problem this solves, for whom, and why it matters in a B2B secure workspace.

## User Roles
Which roles interact with this feature and how.

## Competitor Summary
Table: competitor | what they offer | key takeaway for us

## User Flow
### Admin Flow (if applicable)
Step-by-step description of the admin experience.

### Member Flow (if applicable)
Step-by-step description of the member experience.

## Acceptance Criteria
Numbered list. Each criterion is a testable statement in the format:
"Given [context], when [action], then [expected result]."

Split into:
### Must Have
(Criteria required for the feature to be considered complete)

### Nice to Have
(Criteria that add value but can ship in a follow-up)

## Out of Scope
Explicit list of what this feature does NOT include and why.

## Open Decisions
Any unresolved questions with the chosen resolution and reasoning.

## UI Placement
Where exactly in the current UI this feature lives, referencing existing components/pages.
```

## Rules

- Every claim about competitors must come from web research, not assumptions.
- Every claim about the current codebase must reference actual files/paths you inspected.
- Do not propose UI patterns that contradict existing patterns in the codebase — check first.
- Focus on WHAT and WHY, never on HOW (implementation details belong in `/plan`).
- Acceptance criteria must be specific and testable, not vague ("should be fast" is not a criterion; "audit log list loads within 2 seconds for up to 10,000 entries" is).
- Always consider the E2EE context — some features that are trivial in plaintext systems have significant implications when data is encrypted.
