# Zep MCP Server

Simple MCP server that wraps Zep Cloud API (v3) for use with Claude Code.

Enables Claude Code to store and retrieve memories using Zep's thread-based memory system.

## Installation
```bash
git clone https://github.com/yourusername/zep-mcp-server.git
cd zep-mcp-server
npm install
npm run build
```

## Configuration

Add to your `~/.claude.json`:
```json
{
  "mcpServers": {
    "zep": {
      "command": "node",
      "args": ["/absolute/path/to/zep-mcp-server/dist/index.js"],
      "env": {
        "ZEP_API_KEY": "z_your_zep_api_key"
      }
    }
  }
}
```

Get your Zep API key from https://www.getzep.com

## Usage

Three tools available in Claude Code:

### zep_store_memory
Store information in a Zep session.

### zep_search_memory
Search for information in a Zep session.

### zep_get_memory
Get recent memories from a session with pagination and filtering support.

**Parameters:**
- `session_id` (required): Thread/Session ID to retrieve
- `lastn` (optional): Number of most recent messages to return (e.g., 50, 100, 200)
- `limit` (optional): Limit the number of results returned (alternative to lastn)
- `cursor` (optional): Cursor for pagination (used with limit)
- `role_filter` (optional): Filter by message role: "user", "assistant", or "system"

**Examples:**
```
# Get last 50 messages from a large session
zep_get_memory(session_id="esme", lastn=50)

# Get only assistant messages
zep_get_memory(session_id="esme", lastn=100, role_filter="assistant")

# Use cursor-based pagination
zep_get_memory(session_id="esme", limit=50, cursor=0)
```

## Thread/Session Naming Convention

- Global knowledge: `global`
- Project-specific: `project-{name}`
- User-specific: `user-{username}`

Note: This server uses Zep Cloud v3 API which uses "threads" instead of "sessions". The tools still accept `session_id` for backwards compatibility.

## Example
```
Store in session 'global':
Title: Building Multi-Agent Systems
Content: [article content]
```

## License

MIT
