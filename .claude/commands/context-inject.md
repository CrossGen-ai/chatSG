---
command: context-inject
description: Inject project context from CLAUDE.md for new Claude Code sessions
output_title: "Project Context Loaded"
---

# Load Project Context

This command reads and displays the CLAUDE.md file to provide Claude with essential project context when starting a new session or after clearing the conversation.

## Project Context from CLAUDE.md:

```
{{shellExec: cat /Users/crossgenai/sg/chatSG/CLAUDE.md}}
```

## Additional Context Files:

### Current Working Directory:
```
{{shellExec: pwd}}
```

### Git Status:
```
{{shellExec: git status --short 2>/dev/null || echo "Not a git repository"}}
```

---

**Context successfully loaded!** Claude now has access to:
- Project overview and architecture
- Current development status
- Key features and implementation details
- Important file locations
- Development guidelines

You can now proceed with your tasks with full project context.