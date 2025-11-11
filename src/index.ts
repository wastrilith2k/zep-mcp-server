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
              description: 'Thread/Session ID (e.g., "global" or "project-my-app")',
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
              description: 'Thread/Session ID to search',
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
        description: 'Get recent memories from a session with pagination and filtering support',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Thread/Session ID to retrieve',
            },
            lastn: {
              type: 'number',
              description: 'Number of most recent messages to return (e.g., 50, 100, 200). Useful for large sessions.',
            },
            limit: {
              type: 'number',
              description: 'Limit the number of results returned (alternative to lastn)',
            },
            cursor: {
              type: 'number',
              description: 'Cursor for pagination (used with limit)',
            },
            role_filter: {
              type: 'string',
              description: 'Filter by message role: "user", "assistant", or "system"',
              enum: ['user', 'assistant', 'system'],
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'zep_get_graph_nodes',
        description: 'Get all nodes (entities) from the user knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of nodes to return (default: 50)',
              default: 50,
            },
          },
        },
      },
      {
        name: 'zep_get_graph_edges',
        description: 'Get all edges (relationships) from the user knowledge graph',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of edges to return (default: 50)',
              default: 50,
            },
          },
        },
      },
      {
        name: 'zep_get_node_details',
        description: 'Get detailed information about a specific node including its edges and episodes',
        inputSchema: {
          type: 'object',
          properties: {
            node_uuid: {
              type: 'string',
              description: 'UUID of the node to retrieve',
            },
          },
          required: ['node_uuid'],
        },
      },
      {
        name: 'zep_get_thread_context',
        description: 'Get relevant context from ALL past threads based on recent messages in current thread. Automatically pulls in relevant memories from entire conversation history.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Thread/Session ID to get context for',
            },
            mode: {
              type: 'string',
              description: 'Mode: "summary" (default, more detailed) or "basic" (faster, less latency)',
              enum: ['summary', 'basic'],
              default: 'summary',
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

        // Ensure user exists (create if it doesn't)
        try {
          await zep.user.add({
            userId: 'default_user',
            email: 'default@example.com',
            firstName: 'Claude',
            lastName: 'Code'
          });
        } catch (error: any) {
          // Ignore errors - user might already exist
          // We'll let subsequent operations fail if there's a real issue
        }

        // Ensure thread exists (create if it doesn't)
        try {
          await zep.thread.create({
            threadId: session_id,
            userId: 'default_user'
          });
        } catch (error: any) {
          // Ignore errors - thread might already exist
          // We'll let subsequent operations fail if there's a real issue
        }

        // Store as a message in Zep thread
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

        // Use graph search to search across user's memory
        const results = await zep.graph.search({
          userId: 'default_user',
          query: query,
          limit: limit,
        });

        const formatted = (results.edges || [])
          .map((edge: any, i: number) => {
            return `${i + 1}. ${edge.fact || edge.name || 'N/A'}`;
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
        const { session_id, lastn, limit, cursor, role_filter } = args as {
          session_id: string;
          lastn?: number;
          limit?: number;
          cursor?: number;
          role_filter?: 'user' | 'assistant' | 'system';
        };

        // Build request options for pagination
        const requestOptions: any = {};
        if (lastn !== undefined) {
          requestOptions.lastn = lastn;
        } else {
          if (limit !== undefined) requestOptions.limit = limit;
          if (cursor !== undefined) requestOptions.cursor = cursor;
        }

        const response = await zep.thread.get(session_id, requestOptions);
        let messages = response.messages || [];

        // Apply role filter if specified
        if (role_filter) {
          messages = messages.filter((msg: any) => msg.role === role_filter);
        }

        const formatted = messages
          .map((msg: any, i: number) => {
            const role = msg.role ? `[${msg.role}]` : '';
            const metadata = msg.metadata && Object.keys(msg.metadata).length > 0
              ? `\n   ${JSON.stringify(msg.metadata)}`
              : '';
            return `${i + 1}. ${role} ${msg.content}${metadata}`;
          })
          .join('\n\n');

        // Add pagination info to response
        let resultText = formatted || 'No memories found in this thread';
        if (lastn !== undefined) {
          resultText = `Showing last ${lastn} messages:\n\n${resultText}`;
        } else if (limit !== undefined) {
          resultText = `Showing up to ${limit} messages${cursor ? ` (cursor: ${cursor})` : ''}:\n\n${resultText}`;
        }

        return {
          content: [
            {
              type: 'text',
              text: resultText,
            },
          ],
        };
      }

      case 'zep_get_graph_nodes': {
        const { limit = 50 } = args as { limit?: number };

        const nodes = await zep.graph.node.getByUserId('default_user', {
          limit: limit,
        });

        const formatted = nodes
          .map((node: any, i: number) => {
            const name = node.name || 'Unnamed';
            const labels = node.labels?.join(', ') || 'Unknown';
            const uuid = node.uuid || 'N/A';
            return `${i + 1}. **${name}** (${labels})\n   UUID: ${uuid}`;
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: formatted || 'No nodes found in the knowledge graph',
            },
          ],
        };
      }

      case 'zep_get_graph_edges': {
        const { limit = 50 } = args as { limit?: number };

        const edges = await zep.graph.edge.getByUserId('default_user', {
          limit: limit,
        });

        const formatted = edges
          .map((edge: any, i: number) => {
            const fact = edge.fact || 'No fact';
            const name = edge.name || 'Unnamed';
            const sourceNode = edge.sourceNodeName || 'Unknown';
            const targetNode = edge.targetNodeName || 'Unknown';
            return `${i + 1}. ${sourceNode} → ${targetNode}\n   Fact: ${fact}\n   Name: ${name}`;
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: formatted || 'No edges found in the knowledge graph',
            },
          ],
        };
      }

      case 'zep_get_node_details': {
        const { node_uuid } = args as { node_uuid: string };

        const node = await zep.graph.node.get(node_uuid);
        const edges = await zep.graph.node.getEdges(node_uuid);
        const episodes = await zep.graph.node.getEpisodes(node_uuid);

        let result = `# Node: ${node.name || 'Unnamed'}\n\n`;
        result += `**Labels:** ${node.labels?.join(', ') || 'Unknown'}\n`;
        result += `**UUID:** ${node.uuid}\n`;
        result += `**Summary:** ${node.summary || 'No summary'}\n\n`;

        if (edges && edges.length > 0) {
          result += `## Relationships (${edges.length})\n\n`;
          edges.forEach((edge: any, i: number) => {
            const target = edge.targetNodeName || 'Unknown';
            const fact = edge.fact || 'No fact';
            result += `${i + 1}. → ${target}: ${fact}\n`;
          });
          result += '\n';
        }

        if (episodes && episodes.episodes && episodes.episodes.length > 0) {
          result += `## Mentioned In (${episodes.episodes.length} episodes)\n\n`;
          episodes.episodes.slice(0, 5).forEach((episode: any, i: number) => {
            const content = episode.content?.substring(0, 100) || 'No content';
            result += `${i + 1}. ${content}...\n`;
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'zep_get_thread_context': {
        const { session_id, mode = 'summary' } = args as {
          session_id: string;
          mode?: 'summary' | 'basic';
        };

        const contextResponse = await zep.thread.getUserContext(session_id, {
          mode: mode as any,
        });

        const result = `# Relevant Context for Thread: ${session_id}\n\n${
          contextResponse.context ||
          'No relevant context found from past conversations.'
        }`;

        return {
          content: [
            {
              type: 'text',
              text: result,
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
          text: `Error: ${error.message || JSON.stringify(error)}`,
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
