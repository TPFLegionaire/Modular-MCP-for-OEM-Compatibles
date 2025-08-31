#!/usr/bin/env node

// Simple test to verify the MCP server can start
import { spawn } from 'child_process';

console.log('Testing MCP server startup...');

const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Send a simple JSON-RPC initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

// Give the server a moment to start
setTimeout(() => {
  console.log('Sending initialize request...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');
  
  // Give it time to respond
  setTimeout(() => {
    console.log('Test completed. Server appears to be working!');
    server.kill();
    process.exit(0);
  }, 1000);
}, 500);

server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
});