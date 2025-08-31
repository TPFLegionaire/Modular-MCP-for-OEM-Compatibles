#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';

import { DocWorkflowManager } from './docs/DocWorkflowManager.js';

/**
 * MCP Server for Document Workflows and Project Management
 * 
 * This server provides tools for:
 * - Downloading files from URLs
 * - Extracting archives (ZIP files)
 * - File pattern validation
 * - Script execution
 * - Workflow processing from markdown
 */
class MCPDocWorkflowServer {
  private server: Server;
  private workflowManager: DocWorkflowManager;

  constructor() {
    this.server = new Server(
      {
        name: 'doc-workflow-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.workflowManager = new DocWorkflowManager();
    this.setupToolHandlers();
    this.setupResourceHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'download_file',
            description: 'Download a file from a URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The URL to download from',
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'extract_archive',
            description: 'Extract a ZIP archive to a specified directory',
            inputSchema: {
              type: 'object',
              properties: {
                targetPath: {
                  type: 'string',
                  description: 'Directory to extract to (default: documentation)',
                },
              },
            },
          },
          {
            name: 'validate_patterns',
            description: 'Validate files against a pattern',
            inputSchema: {
              type: 'object',     
              properties: {
                pattern: {
                  type: 'string',
                  description: 'Glob pattern to match files against (e.g., "*.md", "**/*.js")',
                },
                basePath: {
                  type: 'string',
                  description: 'Base directory to search in (default: documentation)',
                },
              },
              required: ['pattern'],
            },
          },
          {
            name: 'execute_script',
            description: 'Execute an implementation script',
            inputSchema: {
              type: 'object',
              properties: {
                scriptName: {
                  type: 'string',
                  description: 'Name of the script to execute (without .js extension)',
                },
              },
              required: ['scriptName'],
            },
          },
          {
            name: 'process_workflow',
            description: 'Process a complete workflow from implementation_plan.md',
            inputSchema: {
              type: 'object',
              properties: {
                planPath: {
                  type: 'string',
                  description: 'Path to implementation plan file (optional)',
                },
              },
            },
          },
        ] as Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'download_file':
            const downloadSuccess = await this.workflowManager.processDownload(args.url);
            return {
              content: [
                {
                  type: 'text',
                  text: downloadSuccess 
                    ? `Successfully downloaded from ${args.url}`
                    : `Failed to download from ${args.url}`,
                },
              ],
            };

          case 'extract_archive':
            const extractSuccess = await this.workflowManager.processUnzip(args.targetPath || 'documentation');
            return {
              content: [
                {
                  type: 'text',
                  text: extractSuccess
                    ? `Successfully extracted archive to ${args.targetPath || 'documentation'}`
                    : 'Failed to extract archive',
                },
              ],
            };

          case 'validate_patterns':
            const validateSuccess = await this.workflowManager.processValidate(args.pattern);
            return {
              content: [
                {
                  type: 'text',
                  text: validateSuccess
                    ? `Pattern validation successful for: ${args.pattern}`
                    : `Pattern validation failed for: ${args.pattern}`,
                },
              ],
            };

          case 'execute_script':
            const scriptSuccess = await this.workflowManager.processImplement(args.scriptName);
            return {
              content: [
                {
                  type: 'text',
                  text: scriptSuccess
                    ? `Script execution successful: ${args.scriptName}`
                    : `Script execution failed: ${args.scriptName}`,
                },
              ],
            };

          case 'process_workflow':
            const workflowSuccess = await this.workflowManager.processWorkflow();
            return {
              content: [
                {
                  type: 'text',
                  text: workflowSuccess
                    ? 'Workflow processing completed successfully'
                    : 'Workflow processing failed',
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'workflow://download-history',
            name: 'Download History',
            description: 'History of downloaded files',
            mimeType: 'application/json',
          },
          {
            uri: 'project://documentation',
            name: 'Project Documentation',
            description: 'Access to project documentation files',
            mimeType: 'text/plain',
          },
        ] as Resource[],
      };
    });

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'workflow://download-history':
          const history = this.workflowManager.getDownloadHistory();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(history, null, 2),
              },
            ],
          };

        case 'project://documentation':
          return {
            contents: [
              {
                uri,
                mimeType: 'text/plain',
                text: 'Project documentation access - use validate_patterns tool to explore files',
              },
            ],
          };

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Doc Workflow Server running on stdio');
  }
}

// Start the server
const server = new MCPDocWorkflowServer();
server.run().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});