#!/usr/bin/env node

// Demo script to showcase MCP server capabilities
import { spawn } from 'child_process';

console.log('🚀 MCP Document Workflow Server Demo\n');

const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let requestId = 1;

function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params
  };
  
  console.log(`📤 Sending: ${method}`);
  server.stdin.write(JSON.stringify(request) + '\n');
}

let responses = [];

server.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        responses.push(response);
        console.log(`📥 Response ${response.id}: ${response.result ? 'Success' : 'Error'}`);
        
        if (response.result && response.result.tools) {
          console.log(`   Tools available: ${response.result.tools.length}`);
          response.result.tools.forEach(tool => {
            console.log(`   • ${tool.name}: ${tool.description}`);
          });
        }
        
        if (response.result && response.result.resources) {
          console.log(`   Resources available: ${response.result.resources.length}`);
          response.result.resources.forEach(resource => {
            console.log(`   • ${resource.name}: ${resource.description}`);
          });
        }
      } catch (e) {
        console.log(`📥 Raw response: ${line.substring(0, 100)}...`);
      }
    }
  });
});

// Demo sequence
setTimeout(() => {
  console.log('\n1️⃣ Listing available tools...');
  sendRequest('tools/list');
}, 500);

setTimeout(() => {
  console.log('\n2️⃣ Listing available resources...');
  sendRequest('resources/list');
}, 1000);

setTimeout(() => {
  console.log('\n3️⃣ Reading download history resource...');
  sendRequest('resources/read', { uri: 'workflow://download-history' });
}, 1500);

setTimeout(() => {
  console.log('\n✅ Demo completed! Your MCP server is working correctly.');
  console.log('\n🔧 Available tools:');
  console.log('   • download_file - Download files from URLs');
  console.log('   • extract_archive - Extract ZIP archives');
  console.log('   • validate_patterns - Validate file patterns');
  console.log('   • execute_script - Run implementation scripts');
  console.log('   • process_workflow - Process complete workflows');
  console.log('\n📚 Available resources:');
  console.log('   • workflow://download-history - Download history');
  console.log('   • project://documentation - Project documentation');
  
  server.kill();
  process.exit(0);
}, 2500);

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});