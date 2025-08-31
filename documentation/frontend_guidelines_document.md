# Frontend Guideline Document

This document explains how we built and styled the command-line interface (CLI) for the **Modular-MCP-for-OEM-Compatibles** project. You don’t need a deep technical background to understand it—just follow these guidelines to see how the CLI is structured, how it looks, and how it behaves.

## 1. Frontend Architecture

Our “frontend” is a text-based CLI that you run in your terminal. Here’s how it’s put together:

• **Framework & Libraries**  
  • Python + Click *or* Node.js + Commander.js for handling commands and arguments  
  • Colorama (Python) or Chalk (Node.js) for colored, easy-to-read messages  
  • JSON/YAML parsers (PyYAML or yaml-cpp/nlohmann/json) to load your configuration files

• **How it Fits Together**  
  1. When you type a command (e.g., `mcpctl start --config system.yaml`), the CLI framework parses it.  
  2. It loads your config file, checks it for mistakes, and hands the settings off to the core C++ backend.  
  3. It displays progress and results—using colors and clear text—so you always know what’s happening.

• **Scalability & Maintainability**  
  • New commands or options can be added as separate modules (files) without touching existing code  
  • Configuration lives outside the code, so you can support new hardware by editing YAML/JSON, not rewriting logic  
  • The CLI and core logic talk through a clean interface—so you can update one side without breaking the other

• **Performance**  
  • Starts in under 2 seconds on typical hardware  
  • Command-response time under 100 ms for simple operations

## 2. Design Principles

We follow three main ideas when designing the CLI:

1. **Usability**  
   • Commands use clear, consistent names (`start`, `status`, `fan set-speed`)  
   • Built-in help (`--help`) shows exactly what options are available  
   • Color-coded messages guide you: green for success, yellow for warnings, red for errors

2. **Accessibility**  
   • Avoid relying on color alone—each message also includes a clear status word (e.g., “SUCCESS”, “ERROR”)  
   • Support common terminal fonts and sizes (monospaced)  
   • Test in both light and dark backgrounds to ensure readability

3. **Responsiveness**  
   • Immediate feedback in the terminal—no waiting without a progress indicator  
   • Interactive mode for power users who want a shell-like experience

## 3. Styling and Theming

Although this is a text interface, we still apply consistent styling:

• **Styling Approach**  
  • Flat, minimal style—plain text with colored highlights  
  • No fancy graphics or animations to keep startup time low  

• **Color Palette**  
  • Success: Bright Green (`#28A745`)  
  • Warning: Bright Yellow (`#FFC107`)  
  • Error: Bright Red (`#DC3545`)  
  • Info/Neutral: Light Gray (`#AAAAAA`) on dark backgrounds or Dark Gray (`#444444`) on light backgrounds

• **Font**  
  • Monospaced terminal font (e.g., Consolas, Courier New, Menlo)  
  • Sizes and line spacing as determined by user’s terminal settings

## 4. Component Structure

We organize our CLI code in a component-based way so it’s easy to find and change things:

• **Commands Folder**  
  • Each top-level command (e.g., `start`, `status`) lives in its own file or folder  
  • Subcommands (e.g., `fan set-speed`) have their own handlers

• **Shared Utilities**  
  • Common helpers (config loader, color functions, error formatter) in a `utils` folder  
  • Keeps code DRY (Don’t Repeat Yourself)

• **Why Components Matter**  
  • You can add, remove, or update a command without touching unrelated parts  
  • Testing is simpler—each command can be tested on its own  
  • Clear separation of concerns means faster onboarding for new developers

## 5. State Management

Our CLI needs to remember a few things as you move between commands:

• **Context Object**  
  • Click/Commander.js provides a `context` where we store your loaded configuration and the connection to the core backend  
  • Passed automatically to subcommands so they all share the same data

• **Caching & Persistence**  
  • The config file is read once at startup and kept in memory  
  • Temporary command results (like last status) live only for that session—they don’t change your configuration files

## 6. Routing and Navigation

In a CLI, “routing” means parsing your input and directing it to the right handler:

• **Routing Library**  
  • Click (Python) or Commander.js (Node.js) does the heavy lifting  
  • Defines main commands, subcommands, options, and flags in a tree-like structure

• **User Flow**  
  • `mcpctl start --config system.yaml` → starts the system  
  • `mcpctl status` → shows module health  
  • `mcpctl fan set-speed 75` → routes to the fan controller module  
  • `mcpctl logs` → prints recent events

• **Help & Errors**  
  • Passing wrong arguments prints a clear error plus the right usage  
  • `--help` is available at every level to show valid commands and options

## 7. Performance Optimization

Fast feedback is key in a CLI. We use these tactics:

• **Lazy Loading**  
  • Only load command code when the user invokes it—keeps startup snappy  

• **Code Splitting**  
  • CLI logic separated from core logic; core modules are loaded by the backend only when needed  

• **Asset Optimization**  
  • No large assets—just small code files and config files  

• **Caching**  
  • Config file and help text cached in memory during a session  

## 8. Testing and Quality Assurance

To keep the CLI reliable, we test at several levels:

• **Unit Tests**  
  • Each command handler tested in isolation with mocked inputs  
  • Use pytest (Python) or Jest (Node.js) and the built-in test runners in Click/Commander.js

• **Integration Tests**  
  • Run the CLI in a temporary environment, invoke real commands, and examine output  
  • Validate config errors, successful startup, and failure modes

• **End-to-End Tests**  
  • Simulate a full session: load config, start system, issue fan command, check status  
  • Ensures the CLI and backend talk correctly

• **Continuous Integration**  
  • GitHub Actions runs all tests on push across Linux, Windows, and ARM

## 9. Conclusion and Overall Frontend Summary

Our CLI frontend is designed to be:

• **Clear & Friendly:** Simple commands, built-in help, and color-coded messages  
• **Flexible & Scalable:** Component-based commands, lazy loading, and external configuration  
• **Fast & Reliable:** Under 2-second startup, under 100 ms for basic operations, and thorough testing in place  

By following these guidelines, you ensure that the **Modular-MCP-for-OEM-Compatibles** CLI remains easy to use, easy to maintain, and easy to extend—no matter how many new hardware modules you add or how many users start relying on it.