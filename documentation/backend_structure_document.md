# Backend Structure Document

This document outlines the backend setup for the **Modular-MCP-for-OEM-Compatibles** project. It explains how the system is built, how it runs, and how all its pieces fit together, using simple language so anyone can follow along.

## 1. Backend Architecture

Overall, the backend is a **modular, event-driven** system written in C++, with a companion Command-Line Interface (CLI) built in Python or Node.js. Here’s how it works:

• **Core Manager**  
  • Acts as the conductor: it loads modules, wires up dependencies, and routes commands and events.  
  • Uses a lightweight Dependency Injection (DI) setup to give each module exactly what it needs.  

• **Modules**  
  • Each module handles one responsibility, such as talking to a fan controller, reading a sensor, or running a thermal algorithm.  
  • There are two main types:  
    – **HAL (Hardware Abstraction Layer) modules** (I2C, SPI, UART handlers)  
    – **Functionality modules** (FanController, ThermalManager, PowerSequencer)  

• **Event Bus**  
  • A simple publish/subscribe system inside the process.  
  • Modules post events (e.g., temperature reading) and subscribe to ones they care about (e.g., “TemperatureExceeded”).  

This architecture supports:  
- **Scalability** by letting you add or replace modules without touching the core code.  
- **Maintainability** since each module lives in its own folder with clear interfaces.  
- **Performance** thanks to C++ for low-level hardware access and a streamlined event bus.

## 2. Database Management

This project doesn’t use a traditional database. Instead, it relies on:

• **Configuration files**  
  • JSON or YAML files define which modules to load, their parameters, and how they connect.  
  • Parsed at startup by the configuration parser (using nlohmann/json or yaml-cpp in C++).  

• **In-memory state**  
  • The Core Manager and modules keep runtime state in memory for fast access.  

• **Log files**  
  • Structured text logs (using spdlog) record events, errors, and status messages.  

If a lightweight persistence layer is ever needed—for example, to record historical events—you could add an embedded database like SQLite. But for version 1.0, flat files and memory are sufficient.

## 3. Database Schema

Since we’re not using a full database, there is no formal schema. Instead:

• **Configuration Schema**  
  • Validated against a JSON Schema or YAML specification during startup.  

• **Log Format**  
  • Timestamp, module name, severity, message  
  • Example: `2024-06-01T12:00:00Z [FanController] INFO: Fan speed set to 75%`

If you choose to add SQLite later, you might have tables such as:  
```
Modules(ModuleID, Name, Version, Status)
Events(EventID, ModuleID, Timestamp, Type, Payload)
Logs(LogID, ModuleID, Timestamp, Severity, Message)
```

## 4. API Design and Endpoints

Instead of a web API, we provide a **Command-Line Interface (CLI)**. It offers a straightforward way to talk to the backend:

• **Key commands**  
  • `mcpctl start --config <file>`: Launch the control panel with your config.  
  • `mcpctl stop`: Shut down all modules cleanly.  
  • `mcpctl status`: Show which modules are running and any warnings or errors.  
  • `mcpctl <module> <action> [params]`: Send a direct command, like `mcpctl fan set-speed 75` or `mcpctl temp read`.  

• **Interactive Mode**  
  • Drop into a shell where you can type commands one after another without retyping `mcpctl` each time.  

Behind the scenes, each CLI command calls into the Core Manager’s APIs (in C++), which handle routing, execution, and feedback.

## 5. Hosting Solutions

This is a local, on-premises tool meant to run on the hardware you’re controlling, so:

• **Target platforms**  
  • Linux (x86_64, ARM)  
  • Windows  
  • Embedded Linux distributions  

• **No cloud or remote servers**  
  • Everything runs on the same device or a connected controller.  
  • This minimizes network latency and removes external dependencies.  

• **Optional containerization**  
  • You can package the C++ core and CLI into a Docker container for consistent environments.  

The benefit: low cost, zero cloud complexity, and full control over your hardware environment.

## 6. Infrastructure Components

Even though this runs locally, several internal components work together:

• **Load Balancing**  
  • Not needed—there’s a single process that manages modules.  

• **Caching**  
  • Modules can cache recent sensor values in memory to avoid redundant bus reads.  

• **Content Delivery Network (CDN)**  
  • Not used. All code and binaries live on your device or are downloaded via GitHub Releases.  

• **Message Routing**  
  • The in-process event bus ensures that messages reach subscribers without polling or tight loops.  

These components keep the system fast and lightweight, focusing on real-time hardware control rather than networked scalability.

## 7. Security Measures

Because this tool runs locally, the main security focus is on safe inputs and error handling:

• **Input Validation**  
  • Configuration files are strictly validated against a schema before any modules load.  
  • CLI arguments are parsed and checked (no unescaped shell injections).  

• **Local-Only Access**  
  • There is no network listener in version 1.0, so outside attacks are effectively blocked.  

• **Error Handling & Exit Codes**  
  • On any failure—bad config, missing module, hardware error—the CLI returns a nonzero exit code.  
  • Clear error messages guide you to the problem line or module.  

Future phases that add a network API should include TLS encryption, user authentication, and role-based access control.

## 8. Monitoring and Maintenance

Keeping the backend healthy involves both built-in tools and external processes:

• **Logging**  
  • spdlog writes timestamped logs to a file or console.  
  • You can configure log levels (INFO, WARN, ERROR) in your config file.  

• **Status Command**  
  • `mcpctl status` shows module health, last event times, and error counts.  

• **Automated Testing (CI/CD)**  
  • GitHub Actions automatically builds and runs unit tests (Google Test) and CLI tests (pytest or Jest) on Linux, Windows, and ARM.  
  • Any failure blocks merges, ensuring code quality.  

• **Maintenance Practices**  
  • Use RAII patterns and Clang-Tidy/Clang-Format for C++ to prevent memory leaks and enforce style.  
  • Regularly review and update dependencies (e.g., nlohmann/json, yaml-cpp, spdlog) to pick up security patches.  

## 9. Conclusion and Overall Backend Summary

The **Modular-MCP** backend is a high-performance, low-overhead system tailored for direct control of OEM hardware. By combining:

- A **C++ core** for speed and direct bus access  
- A **modular architecture** with Dependency Injection and an Event Bus  
- A **human-friendly CLI** in Python or Node.js  
- **Config-driven** behavior with JSON/YAML files  
- **Local hosting** and simple infrastructure components  

…it delivers a reliable, extensible control panel you can tailor to any hardware setup. You add new modules by dropping in a driver, tweak settings in plain-text files, and interact through clear commands. This design meets the project goals of flexibility, ease of integration, and robust operation in real-world environments.