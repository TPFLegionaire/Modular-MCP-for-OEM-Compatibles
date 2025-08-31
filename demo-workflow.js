const { DocWorkflowManager } = require('./dist/docs/DocWorkflowManager');

async function demo() {
  console.log('=== DocWorkflowManager Demo ===\n');
  
  const manager = new DocWorkflowManager();
  
  // Test 1: Parse implementation plan
  console.log('1. Testing implementation plan parsing...');
  
  // Create a test implementation_plan.md content
  const testPlan = `# Test Implementation Plan

1. **download** https://httpbin.org/json
2. **unzip** test-docs
3. **validate** **/*.md
4. **implement** test-script
`;
  
  // Mock the file reading
  const fs = require('fs/promises');
  const originalReadFile = fs.readFile;
  fs.readFile = async () => testPlan;
  
  try {
    const directives = await manager.parseImplementationPlan();
    console.log(`   Found ${directives.length} directives:`);
    directives.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.type} -> ${d.target}`);
    });
    console.log('   ✓ Directive parsing works!\n');
  } catch (error) {
    console.log('   ✗ Directive parsing failed:', error.message);
  }
  
  // Restore original readFile
  fs.readFile = originalReadFile;
  
  // Test 2: Download functionality
  console.log('2. Testing download functionality...');
  
  // Mock axios for testing
  const axios = require('axios');
  const originalGet = axios.get;
  
  // Mock successful download
  axios.get = async () => ({
    data: Buffer.from('test zip content'),
    headers: { 'content-type': 'application/zip' },
    status: 200
  });
  
  try {
    const result = await manager.processDownload('https://example.com/test.zip');
    console.log(`   Download result: ${result}`);
    console.log(`   Download history: ${manager.getDownloadHistory().length} items`);
    console.log('   ✓ Download functionality works!\n');
  } catch (error) {
    console.log('   ✗ Download functionality failed:', error.message);
  }
  
  // Restore original axios
  axios.get = originalGet;
  
  console.log('=== Demo Completed ===');
}

demo().catch(console.error);