const { DocWorkflowManager } = require('./dist/docs/DocWorkflowManager');

async function testBasic() {
  console.log('Testing basic functionality...');
  
  const manager = new DocWorkflowManager();
  
  // Test directive parsing
  console.log('Testing directive parsing...');
  
  // Test download history
  console.log('Testing download history management...');
  manager.getDownloadHistory().push({
    url: 'test://example.com',
    data: Buffer.from('test'),
    contentType: 'text/plain',
    isExpired: false
  });
  
  console.log('Download history length:', manager.getDownloadHistory().length);
  manager.clearDownloadHistory();
  console.log('Cleared history length:', manager.getDownloadHistory().length);
  
  console.log('Basic functionality test completed!');
}

testBasic().catch(console.error);