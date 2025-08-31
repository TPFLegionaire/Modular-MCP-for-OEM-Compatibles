#!/usr/bin/env node

import { DocWorkflowManager } from './docs/DocWorkflowManager.js';

async function main() {
  console.log('Starting documentation workflow processing...');
  
  const workflowManager = new DocWorkflowManager();
  const success = await workflowManager.processWorkflow();
  
  if (success) {
    console.log('Documentation workflow completed successfully.');
    process.exit(0);
  } else {
    console.error('Documentation workflow failed.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});