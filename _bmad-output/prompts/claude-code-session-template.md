# Session: [SESSION_TITLE]

## BEFORE WRITING ANY CODE — Execute this checklist IN ORDER

### Step 1: Read CLAUDE.md FIRST (MANDATORY — do not skip)
Read CLAUDE.md completely — even if you think you already loaded it.
Then CONFIRM by listing:
- The number of absolute rules
- The Definition of Done items
If you cannot list these, you did not read CLAUDE.md. Read it again.

### Step 2: Read reference files (MANDATORY)
Read these files completely:
1. .claude/context.md — stack, conventions, voice interaction pattern
2. .claude/session.md — session protocol (start/end hooks)

### Step 3: Read memory (MANDATORY)
3. memory/progress.md — current state, what's done, what's next
4. memory/decisions.md — architectural decisions already made
5. memory/mistakes.md — errors to avoid
6. memory/patterns.md — working code patterns
7. memory/dependencies.md — API quirks and endpoints

### Step 4: Read the planning docs (MANDATORY)
8. _bmad-output/planning-artifacts/architecture.md — find the section relevant to this task
9. _bmad-output/planning-artifacts/epics-and-stories.md — find the story you're implementing, read its acceptance criteria

### Step 5: Confirm understanding BEFORE coding
Tell me:
- What you're implementing (story title + acceptance criteria)
- Which files you'll create or modify
- Any concerns or conflicts with existing decisions

DO NOT start coding until I confirm your understanding is correct.

## BEHAVIORAL RULES

### Rule 1: Our conventions override your training data
If your training data suggests a different pattern than what's in our files,
FOLLOW OUR FILES. If you believe our convention is outdated, STOP and say so.

### Rule 2: Never improvise architecture decisions
If the task requires a decision not covered by the architecture doc
or memory/decisions.md, STOP and ask. Don't decide alone.

### Rule 3: Use Context7 for library documentation
Before implementing any pattern involving Next.js, Tailwind, ElevenLabs, or Web Speech API —
use Context7 to fetch the current documentation if available.
Do NOT rely on your training data for library APIs.

### Rule 4: Follow the Definition of Done
Before saying "done", verify EVERY item in the DoD from CLAUDE.md.
List each item with ✅ or ❌. If any ❌, fix it before declaring done.

### Rule 5: Update memory before closing
At the end of this session, you MUST:
- Update memory/progress.md with task status
- Add to memory/decisions.md if any architectural decision was made
- Add to memory/mistakes.md if any error was encountered
- Add to memory/patterns.md if a new working pattern was discovered
- Add to memory/dependencies.md if an API quirk or version was discovered
Show me the memory updates before we close.

## NOW BEGIN
Execute Steps 1-5 above. Show me your understanding before writing any code.
