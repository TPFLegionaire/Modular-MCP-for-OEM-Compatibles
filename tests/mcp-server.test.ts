import { spawn, ChildProcess } from 'child_process';
import { DocWorkflowManager } from '../src/docs/DocWorkflowManager.js';

describe('MCP Server', () => {
  let server: ChildProcess;
  
  beforeEach(() => {
    server = spawn('node', ['dist/server.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
  });
  
  afterEach(() => {
    if (server && !server.killed) {
      server.kill();
    }
  });

  test('should respond to tools/list request', (done) => {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };

    server.stdout?.on('data', (data) => {
      const response = JSON.parse(data.toString());
      expect(response.id).toBe(1);
      expect(response.result.tools).toBeDefined();
      expect(response.result.tools.length).toBeGreaterThan(0);
      done();
    });

    server.stdin?.write(JSON.stringify(request) + '\n');
  });

  test('should respond to resources/list request', (done) => {
    const request = {
      jsonrpc: '2.0',
      id: 2,
      method: 'resources/list',
      params: {}
    };

    server.stdout?.on('data', (data) => {
      const response = JSON.parse(data.toString());
      expect(response.id).toBe(2);
      expect(response.result.resources).toBeDefined();
      expect(response.result.resources.length).toBeGreaterThan(0);
      done();
    });

    server.stdin?.write(JSON.stringify(request) + '\n');
  });
});

describe('DocWorkflowManager', () => {
  let manager: DocWorkflowManager;
  
  beforeEach(() => {
    manager = new DocWorkflowManager();
  });

  test('should initialize without errors', () => {
    expect(manager).toBeDefined();
  });

  test('should return empty download history initially', () => {
    const history = manager.getDownloadHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(0);
  });

  test('should clear download history', () => {
    manager.clearDownloadHistory();
    const history = manager.getDownloadHistory();
    expect(history.length).toBe(0);
  });
});