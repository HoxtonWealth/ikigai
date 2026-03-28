# Session Protocol

## Starting a Session
1. Read CLAUDE.md completely
2. Read .claude/context.md
3. Read ALL 5 memory/ files
4. Read the task description (story or ad hoc)
5. Confirm understanding BEFORE writing code

## Ending a Session
1. Verify Definition of Done (list each item ✅ or ❌)
2. Update memory/progress.md
3. Update memory/decisions.md (if any new decisions)
4. Update memory/mistakes.md (if any errors encountered)
5. Update memory/patterns.md (if any new patterns discovered)
6. Update memory/dependencies.md (if any API quirks found)
7. Show memory updates to the human BEFORE closing

## Session Rules
- ONE task per session — fresh chat every time
- NEVER mix frontend and backend work in the same session
- Ask before making architecture decisions not in the docs
- Use Context7 for library docs if available
- `/compact` at 70% context usage
