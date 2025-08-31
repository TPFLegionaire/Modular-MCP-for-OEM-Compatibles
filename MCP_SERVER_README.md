# MCP Document Workflow Server

A **Model Context Protocol (MCP) server** that provides document workflow and project management capabilities to AI assistants.

## 🚀 Features

This MCP server provides AI assistants with powerful tools for:

### 🔧 Tools
- **`download_file`** - Download files from URLs
- **`extract_archive`** - Extract ZIP archives to specified directories
- **`validate_patterns`** - Validate files against glob patterns (e.g., `*.md`, `**/*.js`)
- **`execute_script`** - Execute implementation scripts
- **`process_workflow`** - Process complete workflows from markdown files

### 📚 Resources
- **`workflow://download-history`** - Access download history as JSON
- **`project://documentation`** - Browse project documentation

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 20+ 
- npm or yarn

### Install Dependencies
```bash
npm install
```

### Build the Server
```bash
npm run build
```

### Run the Server
```bash
npm start
# or for development
npm run dev
```

## 🔌 Usage

### As an MCP Server
The server communicates via JSON-RPC 2.0 over stdio. It's designed to be used by AI assistants that support the Model Context Protocol.

### Example Tool Calls

#### Download a File
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "download_file",
    "arguments": {
      "url": "https://example.com/file.zip"
    }
  }
}
```

#### Extract Archive
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "extract_archive",
    "arguments": {
      "targetPath": "documentation"
    }
  }
}
```

#### Validate File Patterns
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "validate_patterns",
    "arguments": {
      "pattern": "**/*.md"
    }
  }
}
```

### Demo
Run the included demo to see the server in action:
```bash
node demo-mcp-server.js
```

## 🏗️ Architecture

### Core Components
- **MCP Server** (`src/server.ts`) - Main MCP protocol handler
- **DocWorkflowManager** (`src/docs/DocWorkflowManager.ts`) - Core workflow processing logic
- **Tool Handlers** - Individual tool implementations
- **Resource Handlers** - Resource access providers

### Workflow Processing
The server can process workflows defined in markdown files with directives like:
- `**Download** <URL>` - Download files
- `**Unzip** <path>` - Extract archives  
- `**Validate** <pattern>` - Validate file patterns
- `**Implement** <script>` - Execute scripts

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

## 📁 Project Structure

```
src/
├── server.ts              # MCP server entry point
├── main.ts                # Standalone workflow processor
└── docs/
    └── DocWorkflowManager.ts # Core workflow logic

dist/                       # Compiled JavaScript
documentation/              # Project documentation
demo-mcp-server.js         # Server demo script
```

## 🔧 Development

### Adding New Tools
1. Define the tool schema in `setupToolHandlers()`
2. Add the tool handler in the switch statement
3. Implement the core logic in `DocWorkflowManager` if needed

### Adding New Resources
1. Define the resource in `setupResourceHandlers()`
2. Add the resource handler in the switch statement
3. Implement data access logic

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please ensure:
- TypeScript types are properly defined
- Tests are included for new functionality
- MCP protocol compliance is maintained