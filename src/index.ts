#!/usr/bin/env node
/**
 * Simple Zep Cloud MCP Server
 * 
 * Wraps Zep Cloud API for use with Claude Code
 * 
 * Setup:
 *   npm install @modelcontextprotocol/sdk zep-cloud
 * 
 * Usage in ~/.claude.json:
 *   {
 *     "mcpServers": {
 *       "zep": {
 *         "command": "node",
 *         "args": ["/path/to/zep-mcp-server/dist/index.js"],
 *         "env": {
 *           "ZEP_API_KEY": "z_your_key"
 *         }
 *       }
 *     }
 *   }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ZepClient } from '@getzep/zep-cloud';

const zepApiKey = process.env.ZEP_API_KEY;
if (!zepApiKey) {
  console.error('ZEP_API_KEY environment variable required');
  process.exit(1);
}

const zep = new ZepClient({ apiKey: zepApiKey });

const server = new Server(
  {
    name: 'zep-cloud',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'zep_store_memory',
        description: 'Store information in Zep Cloud memory for a specific session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Session ID (e.g., "global" or "project-my-app")',
            },
            content: {
              type: 'string',
              description: 'Content to store',
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata (category, tags, etc.)',
            },
          },
          required: ['session_id', 'content'],
        },
      },
      {
        name: 'zep_search_memory',
        description: 'Search Zep Cloud memory in a specific session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Session ID to search',
            },
            query: {
              type: 'string',
              description: 'Search query',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 10)',
              default: 10,
            },
          },
          required: ['session_id', 'query'],
        },
      },
      {
        name: 'zep_get_memory',
        description: 'Get all recent memories from a session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Session ID to retrieve',
            },
          },
          required: ['session_id'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'zep_store_memory': {
        const { session_id, content, metadata = {} } = args as {
          session_id: string;
          content: string;
          metadata?: Record<string, any>;
        };

        // Store as messages in a Zep thread
        await zep.thread.addMessages(session_id, {
          messages: [
            {
              role: 'user',
              content: 'Store this information',
            },
            {
              role: 'assistant',
              content: content,
              metadata: {
                ...metadata,
                stored_at: new Date().toISOString(),
              },
            },
          ],
        });

        return {
          content: [
            {
              type: 'text',
              text: `✓ Stored in thread "${session_id}"`,
            },
          ],
        };
      }

      case 'zep_search_memory': {
        const { session_id, query, limit = 10 } = args as {
          session_id: string;
          query: string;
          limit?: number;
        };

        // Search the graph for relevant information
        const searchResults = await zep.graph.search({
          query: query,
          userId: session_id,
          limit: limit,
        });

        const formatted = searchResults.edges
          ?.map((edge: any, i: number) => {
            const fact = edge.fact || 'N/A';
            const source = edge.source?.name || 'Unknown';
            const target = edge.target?.name || 'Unknown';
            return `${i + 1}. ${fact}\n   Source: ${source} → Target: ${target}`;
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: formatted || 'No results found',
            },
          ],
        };
      }

      case 'zep_get_memory': {
        const { session_id } = args as { session_id: string };

        // Get messages from the thread
        const messageList = await zep.thread.get(session_id);
        const messages = messageList.messages || [];

        const formatted = messages
          .filter((msg: any) => msg.role === 'assistant')
          .map((msg: any, i: number) => {
            return `${i + 1}. ${msg.content}\n   ${JSON.stringify(msg.metadata || {})}`;
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: formatted || 'No memories found in this thread',
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Zep Cloud MCP Server running');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
