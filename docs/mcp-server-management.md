# MCP Server Management for ChatSG

This document explains how Claude Code integrates with tmux to manage ChatSG development servers without manual terminal intervention.

## Overview

ChatSG uses tmux-mcp (Model Context Protocol) to enable Claude Code to:
- Start/stop development servers
- Monitor server logs in real-time
- Execute commands in server terminals
- Check server health and status

All without opening visible terminal windows or manual tmux attachment.

## Setup

### 1. Prerequisites
- tmux installed (`brew install tmux` on macOS)
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)
- Node.js and npm

### 2. MCP Configuration
The project includes `.mcp.json` which configures the tmux-mcp server:

```json
{
  "mcpServers": {
    "tmux": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "tmux-mcp"],
      "env": {}
    }
  }
}
```

This configuration is automatically loaded when you start Claude Code from the project directory.

## How It Works

### Server Management Scripts
The project uses tmux sessions for server management:

1. **`npm run dev`** - Starts both servers in background tmux sessions
   - Backend runs in session `chatsg-backend`
   - Frontend runs in session `chatsg-frontend`
   - No visible windows opened
   - Servers run silently in background

2. **`npm run dev:vis`** - Starts servers with tmux + visible Terminal windows (Recommended)
   - Creates persistent tmux sessions first
   - Opens Terminal windows that attach to those sessions
   - You see the output AND servers persist if windows close
   - Use Ctrl+B, D to detach without stopping servers

3. **`npm run stop`** - Stops all servers cleanly
   - Kills tmux sessions
   - Ensures ports are freed

4. **`npm run logs`** - Shows server status and recent logs

### Claude Code Integration
When you start Claude Code from the project directory:

```bash
cd /path/to/chatSG
claude
```

Claude Code automatically loads the tmux-mcp server, giving it the ability to:

#### List tmux sessions
```
List all tmux sessions
```

#### View server logs
```
Show me the backend server logs
Capture the frontend development server output
```

#### Check server status
```
Are both ChatSG servers running?
What ports are the servers using?
```

#### Execute commands
```
Restart the backend server
Run npm install in the frontend directory
```

## Available Command Templates

The project includes pre-defined commands in `.claude/commands/`:

### `/server-status`
Checks the status of both servers, including:
- Active tmux sessions
- Port availability (3000 for backend, 5174 for frontend)
- Recent log entries

### `/backend-logs`
Captures and displays current backend server output from the tmux pane.

### `/frontend-logs`
Shows frontend development server logs, including compilation status.

### `/restart-servers`
Cleanly stops and restarts both servers.

### `/test-chat`
Tests the chat API by sending a message and checking the response.

## MCP Tools Available

The tmux-mcp server provides these tools to Claude Code:

- **`list-sessions`** - List all tmux sessions
- **`find-session`** - Find a specific session by name
- **`list-windows`** - List windows in a session
- **`list-panes`** - List panes in a window
- **`capture-pane`** - Read terminal output from a pane
- **`create-session`** - Create new tmux session
- **`create-window`** - Create new window in session
- **`execute-command`** - Run commands in a specific pane
- **`get-command-result`** - Get results of executed commands

## Common Workflows

### Starting Development
1. Open terminal in project root
2. Run `claude` to start Claude Code
3. Say: "Start the development servers"
4. Claude will run `npm run dev` and confirm servers are running

### Debugging Issues
1. Say: "Show me the backend logs"
2. Claude captures tmux pane content
3. You can see errors without manual tmux attachment

### Restarting After Code Changes
1. Say: "Restart the servers"
2. Claude stops and restarts both servers
3. Confirms when ready

### Checking Status
1. Say: "Check server status" or use `/server-status`
2. Claude shows:
   - Running sessions
   - Port status
   - Recent logs
   - Any errors

## Architecture

```
┌─────────────────┐
│  Claude Code    │
│      CLI        │
└────────┬────────┘
         │ MCP Protocol
         ▼
┌─────────────────┐
│   tmux-mcp      │
│    Server       │
└────────┬────────┘
         │ Controls
         ▼
┌─────────────────┐     ┌─────────────────┐
│ tmux session:   │     │ tmux session:   │
│ chatsg-backend  │     │ chatsg-frontend │
│                 │     │                 │
│ npm run dev     │     │ npm run dev     │
│ (port 3000)     │     │ (port 5173)     │
└─────────────────┘     └─────────────────┘
         ▲                       ▲
         │                       │
    (optional)              (optional)
         │                       │
┌─────────────────┐     ┌─────────────────┐
│ Terminal Window │     │ Terminal Window │
│ (npm run dev:vis)│    │ (npm run dev:vis)│
│                 │     │                 │
│ Attached to     │     │ Attached to     │
│ tmux session    │     │ tmux session    │
└─────────────────┘     └─────────────────┘
```

Note: Frontend now runs on port 5173 (Vite default) instead of 5174.

## Troubleshooting

### MCP Server Not Connected
- Restart Claude Code after adding/modifying `.mcp.json`
- Run `claude` from the project root directory
- Check tmux is installed: `which tmux`

### Can't See Servers
- Check if tmux sessions exist: `tmux ls`
- Ensure servers were started with `npm run dev` (not manually)
- Try `/server-status` command

### Permission Issues
- The MCP server runs with your user permissions
- Ensure you have access to project directories
- Check npm permissions if install commands fail

## Security Notes

- tmux-mcp only accesses tmux sessions on your local machine
- Commands execute with your user permissions
- No external network access required
- Server logs may contain sensitive data - handle appropriately

## Benefits

1. **No Context Switching** - Manage servers without leaving Claude Code
2. **Automation** - Claude can restart servers, check logs, run tests
3. **Visibility** - See what's happening without manual terminal management
4. **Consistency** - Same commands work for everyone on the team
5. **Efficiency** - Faster debugging with instant log access

## Example Session

```
You: Start the servers and check if they're working

Claude: I'll start the ChatSG servers for you.

[Executes npm run dev]

Both servers are now running:
- Backend: Running on port 3000 (Orchestrator ready with 3 agents)
- Frontend: Running on port 5174 (Vite dev server)

Would you like me to test the chat functionality?

You: Yes, and show me any errors in the backend

Claude: [Sends test message to API]
The chat is working! I received a response from the Analytical Agent.

[Captures backend logs]
No errors found. The backend shows:
- Successful session creation
- Message saved to storage
- Agent selected and response generated

You: Great! Keep monitoring while I code

Claude: I'll keep an eye on both servers. Let me know if you need to see logs or restart anything.
```

## Contributing

When adding new MCP capabilities:
1. Update `.mcp.json` if adding new servers
2. Create command templates in `.claude/commands/`
3. Document new workflows in this file
4. Test with `claude` from project root

## Future Enhancements

- Add pm2-mcp for production-like process management
- Create custom MCP server for ChatSG-specific commands
- Add database management MCP tools
- Integrate test runner MCP capabilities