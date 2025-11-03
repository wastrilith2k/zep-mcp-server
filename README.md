# Zep MCP Server

Simple MCP server that wraps Zep Cloud API for use with Claude Code.

## Installation
```bash
git clone https://github.com/yourusername/zep-mcp-server.git
```

Files are built so you don't have to build them.

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

## Session Naming Convention

- Global knowledge: `global`
- Project-specific: `project-{name}`

## Example
```
Store in session 'global':
Title: Building Multi-Agent Systems
Content: [article content]
```

## License

MIT
