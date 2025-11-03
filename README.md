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
Get all recent memories from a session.

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
