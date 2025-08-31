const { spawn } = require('child_process');

console.log('Running tests with ts-node...');

// Run the test file directly with ts-node
const testProcess = spawn('npx', ['ts-node', 'tests/docsWorkflow/DocWorkflowManager.test.ts'], {
  stdio: 'inherit',
  shell: true
});

testProcess.on('close', (code) => {
  process.exit(code);
});