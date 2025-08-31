import { DocWorkflowManager, Directive } from '../../src/docs/DocWorkflowManager';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as child_process from 'child_process';
import axios from 'axios';

// Mock fs and axios modules
jest.mock('fs/promises');
jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DocWorkflowManager', () => {
  let workflowManager: DocWorkflowManager;
  const testProjectRoot = '/test/project';

  beforeEach(() => {
    workflowManager = new DocWorkflowManager(testProjectRoot);
    jest.clearAllMocks();
  });

  describe('parseImplementationPlan', () => {
    it('should parse valid markdown list items as directives', async () => {
      const mockContent = `# Implementation plan

1. **download** https://example.com/file.zip
2. **unzip** documentation
3. **validate** **/*.md
4. **implement** setup_environment
`;

      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      const directives = await workflowManager.parseImplementationPlan();

      expect(directives).toHaveLength(4);
      expect(directives[0]).toEqual({
        type: 'download',
        target: 'https://example.com/file.zip',
        raw: '1. **download** https://example.com/file.zip'
      });
      expect(directives[1]).toEqual({
        type: 'unzip',
        target: 'documentation',
        raw: '2. **unzip** documentation'
      });
      expect(directives[2]).toEqual({
        type: 'validate',
        target: '**/*.md',
        raw: '3. **validate** **/*.md'
      });
      expect(directives[3]).toEqual({
        type: 'implement',
        target: 'setup_environment',
        raw: '4. **implement** setup_environment'
      });
    });

    it('should ignore non-directive list items', async () => {
      const mockContent = `# Implementation plan

1. **download** https://example.com/file.zip
2. **unknown** some command
3. **validate** **/*.md
`;

      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      const directives = await workflowManager.parseImplementationPlan();

      expect(directives).toHaveLength(2);
      expect(directives[0].type).toBe('download');
      expect(directives[1].type).toBe('validate');
    });

    it('should handle empty file', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('');

      const directives = await workflowManager.parseImplementationPlan();

      expect(directives).toHaveLength(0);
    });

    it('should handle file with no list items', async () => {
      const mockContent = `# Implementation plan

This is just some text without list items.
`;

      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      const directives = await workflowManager.parseImplementationPlan();

      expect(directives).toHaveLength(0);
    });
  });

  describe('processWorkflow', () => {
    it('should run fallback flow when implementation_plan.md not found', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT: no such file or directory'));
      
      const runFallbackSpy = jest.spyOn(workflowManager as any, 'runFallbackFlow').mockResolvedValue(true);

      const result = await workflowManager.processWorkflow();

      expect(result).toBe(true);
      expect(runFallbackSpy).toHaveBeenCalled();
    });

    it('should run fallback flow when no directives found', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('# Empty plan');
      const parseSpy = jest.spyOn(workflowManager, 'parseImplementationPlan').mockResolvedValue([]);
      const runFallbackSpy = jest.spyOn(workflowManager as any, 'runFallbackFlow').mockResolvedValue(true);

      const result = await workflowManager.processWorkflow();

      expect(result).toBe(true);
      expect(parseSpy).toHaveBeenCalled();
      expect(runFallbackSpy).toHaveBeenCalled();
    });

    it('should process directives in order', async () => {
      const directives: Directive[] = [
        { type: 'download', target: 'https://example.com/file.zip', raw: '1. **download** https://example.com/file.zip' },
        { type: 'unzip', target: 'documentation', raw: '2. **unzip** documentation' }
      ];

      (fs.readFile as jest.Mock).mockResolvedValue('mock content');
      jest.spyOn(workflowManager, 'parseImplementationPlan').mockResolvedValue(directives);
      
      const processDownloadSpy = jest.spyOn(workflowManager as any, 'processDownload').mockResolvedValue(true);
      const processUnzipSpy = jest.spyOn(workflowManager as any, 'processUnzip').mockResolvedValue(true);

      const result = await workflowManager.processWorkflow();

      expect(result).toBe(true);
      expect(processDownloadSpy).toHaveBeenCalledWith('https://example.com/file.zip');
      expect(processUnzipSpy).toHaveBeenCalledWith('documentation');
    });

    it('should stop processing on directive failure', async () => {
      const directives: Directive[] = [
        { type: 'download', target: 'https://example.com/file.zip', raw: '1. **download** https://example.com/file.zip' },
        { type: 'unzip', target: 'documentation', raw: '2. **unzip** documentation' }
      ];

      (fs.readFile as jest.Mock).mockResolvedValue('mock content');
      jest.spyOn(workflowManager, 'parseImplementationPlan').mockResolvedValue(directives);
      
      const processDownloadSpy = jest.spyOn(workflowManager as any, 'processDownload').mockResolvedValue(false);
      const processUnzipSpy = jest.spyOn(workflowManager as any, 'processUnzip').mockResolvedValue(true);

      const result = await workflowManager.processWorkflow();

      expect(result).toBe(false);
      expect(processDownloadSpy).toHaveBeenCalled();
      expect(processUnzipSpy).not.toHaveBeenCalled();
    });
  });

  describe('processDirective', () => {
    it('should call appropriate method for each directive type', async () => {
      const downloadSpy = jest.spyOn(workflowManager as any, 'processDownload').mockResolvedValue(true);
      const unzipSpy = jest.spyOn(workflowManager as any, 'processUnzip').mockResolvedValue(true);
      const validateSpy = jest.spyOn(workflowManager as any, 'processValidate').mockResolvedValue(true);
      const implementSpy = jest.spyOn(workflowManager as any, 'processImplement').mockResolvedValue(true);

      await workflowManager.processDirective({ type: 'download', target: 'url', raw: 'raw' });
      await workflowManager.processDirective({ type: 'unzip', target: 'path', raw: 'raw' });
      await workflowManager.processDirective({ type: 'validate', target: 'pattern', raw: 'raw' });
      await workflowManager.processDirective({ type: 'implement', target: 'script', raw: 'raw' });

      expect(downloadSpy).toHaveBeenCalledWith('url');
      expect(unzipSpy).toHaveBeenCalledWith('path');
      expect(validateSpy).toHaveBeenCalledWith('pattern');
      expect(implementSpy).toHaveBeenCalledWith('script');
    });

    it('should return false for unknown directive type', async () => {
      const result = await workflowManager.processDirective({ 
        type: 'unknown' as any, 
        target: 'test', 
        raw: 'raw' 
      });

      expect(result).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should manage download history', () => {
      const downloadResult = {
        url: 'https://example.com/file.zip',
        data: Buffer.from('test'),
        contentType: 'application/zip',
        isExpired: false
      };

      workflowManager.getDownloadHistory().push(downloadResult);
      expect(workflowManager.getDownloadHistory()).toHaveLength(1);

      workflowManager.clearDownloadHistory();
      expect(workflowManager.getDownloadHistory()).toHaveLength(0);
    });
  });

  describe('processDownload', () => {
    it('should successfully download binary data', async () => {
      const mockResponse = {
        data: Buffer.from('test binary data'),
        headers: { 'content-type': 'application/zip' },
        status: 200
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await (workflowManager as any).processDownload('https://example.com/file.zip');

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/file.zip', expect.any(Object));
      expect(workflowManager.getDownloadHistory()).toHaveLength(1);
      expect(workflowManager.getDownloadHistory()[0].isExpired).toBe(false);
    });

    it('should handle JSON expiry response', async () => {
      const expiryResponse = {
        message: 'URL expired',
        instructions: 'Please contact support for a new URL'
      };

      const mockResponse = {
        data: Buffer.from(JSON.stringify(expiryResponse)),
        headers: { 'content-type': 'application/json' },
        status: 200
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const consoleErrorSpy = jest.spyOn(console, 'error');
      const consoleLogSpy = jest.spyOn(console, 'log');

      const result = await (workflowManager as any).processDownload('https://example.com/expired.zip');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('URL has expired. Aborting processing.');
      expect(consoleLogSpy).toHaveBeenCalledWith('Instructions:', 'Please contact support for a new URL');
      expect(workflowManager.getDownloadHistory()).toHaveLength(1);
      expect(workflowManager.getDownloadHistory()[0].isExpired).toBe(true);
      expect(workflowManager.getDownloadHistory()[0].expiryInstructions).toBe('Please contact support for a new URL');
    });

    it('should handle HTTP errors', async () => {
      const mockError = {
        isAxiosError: true,
        response: {
          status: 404,
          statusText: 'Not Found'
        }
      };

      mockedAxios.get.mockRejectedValue(mockError);

      const consoleErrorSpy = jest.spyOn(console, 'error');

      const result = await (workflowManager as any).processDownload('https://example.com/notfound.zip');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Download failed with status 404: Not Found');
    });

    it('should handle network timeouts', async () => {
      const mockError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      };

      mockedAxios.get.mockRejectedValue(mockError);

      const consoleErrorSpy = jest.spyOn(console, 'error');

      const result = await (workflowManager as any).processDownload('https://example.com/slow.zip');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Download timed out after 30 seconds');
    });

    it('should handle invalid JSON responses gracefully', async () => {
      const mockResponse = {
        data: Buffer.from('invalid json'),
        headers: { 'content-type': 'application/json' },
        status: 200
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const consoleLogSpy = jest.spyOn(console, 'log');

      const result = await (workflowManager as any).processDownload('https://example.com/invalid.json');

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith('Response is not valid JSON, treating as binary data');
      expect(workflowManager.getDownloadHistory()).toHaveLength(1);
    });
  });

  describe('processUnzip', () => {
    it('should fail when no downloads available', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');

      const result = await (workflowManager as any).processUnzip('documentation');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('No downloads available to unzip');
    });

    it('should fail when download data is missing', async () => {
      workflowManager.getDownloadHistory().push({
        url: 'https://example.com/file.zip',
        data: null,
        contentType: 'application/zip',
        isExpired: false
      });

      const consoleErrorSpy = jest.spyOn(console, 'error');

      const result = await (workflowManager as any).processUnzip('documentation');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('No data available in latest download');
    });

    it('should fail for non-zip content types', async () => {
      workflowManager.getDownloadHistory().push({
        url: 'https://example.com/file.txt',
        data: Buffer.from('text content'),
        contentType: 'text/plain',
        isExpired: false
      });

      const consoleErrorSpy = jest.spyOn(console, 'error');

      const result = await (workflowManager as any).processUnzip('documentation');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Content type text/plain is not a zip file');
    });
  });

  describe('processValidate', () => {
    it('should fail when documentation directory does not exist', async () => {
      jest.spyOn(fs, 'access').mockRejectedValue(new Error('Directory not found'));

      const consoleErrorSpy = jest.spyOn(console, 'error');

      const result = await (workflowManager as any).processValidate('**/*.md');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Documentation directory \'documentation\' does not exist');
    });

    it('should fail when no files match pattern', async () => {
      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest.spyOn(workflowManager as any, 'glob').mockResolvedValue([]);

      const consoleErrorSpy = jest.spyOn(console, 'error');

      const result = await (workflowManager as any).processValidate('**/*.md');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('No files found matching pattern: **/*.md');
    });

    it('should succeed when files match pattern', async () => {
      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest.spyOn(workflowManager as any, 'glob').mockResolvedValue(['file1.md', 'file2.md']);

      const consoleLogSpy = jest.spyOn(console, 'log');

      const result = await (workflowManager as any).processValidate('**/*.md');

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith('Validation successful: Found 2 file(s) matching pattern \'**/*.md\'');
    });
  });

  describe('processImplement', () => {
    it('should fail when script file does not exist', async () => {
      jest.spyOn(fs, 'access').mockRejectedValue(new Error('File not found'));

      const consoleErrorSpy = jest.spyOn(console, 'error');

      const result = await (workflowManager as any).processImplement('setup_environment');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Script file not found: docs/scripts/setup_environment.js');
    });

    it('should execute script successfully', async () => {
      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest.spyOn(child_process, 'exec').mockImplementation((() => {
        return Promise.resolve({ stdout: 'Script output', stderr: '' });
      }) as any);

      const consoleLogSpy = jest.spyOn(console, 'log');

      const result = await (workflowManager as any).processImplement('setup_environment');

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith('Script execution completed successfully: docs/scripts/setup_environment.js');
    });

    it('should handle script execution failure', async () => {
      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest.spyOn(child_process, 'exec').mockImplementation((() => {
        return Promise.reject({ 
          code: 1, 
          message: 'Script failed',
          stdout: 'Output',
          stderr: 'Error message' 
        });
      }) as any);

      const consoleErrorSpy = jest.spyOn(console, 'error');

      const result = await (workflowManager as any).processImplement('failing_script');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Script execution failed with exit code 1: Script failed');
    });
  });

  describe('utility methods', () => {
    it('should match glob patterns correctly', async () => {
      const matchesPattern = (workflowManager as any).matchesPattern;

      expect(matchesPattern('file.md', '*.md')).toBe(true);
      expect(matchesPattern('file.txt', '*.md')).toBe(false);
      expect(matchesPattern('docs/file.md', 'docs/*.md')).toBe(true);
      expect(matchesPattern('other/file.md', 'docs/*.md')).toBe(false);
      expect(matchesPattern('file.md', '**/*.md')).toBe(true);
      expect(matchesPattern('docs/sub/file.md', '**/*.md')).toBe(true);
    });
  });

  describe('integration tests', () => {
    it('should process complete workflow successfully', async () => {
      const mockContent = `# Implementation plan

1. **download** https://example.com/docs.zip
2. **unzip** documentation
3. **validate** **/*.md
4. **implement** setup
`;

      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      // Mock successful download
      const mockResponse = {
        data: Buffer.from('zip file content'),
        headers: { 'content-type': 'application/zip' },
        status: 200
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      // Mock successful unzip (simplified)
      jest.spyOn(workflowManager as any, 'processUnzip').mockResolvedValue(true);

      // Mock successful validation
      jest.spyOn(workflowManager as any, 'processValidate').mockResolvedValue(true);

      // Mock successful script execution
      jest.spyOn(workflowManager as any, 'processImplement').mockResolvedValue(true);

      const result = await workflowManager.processWorkflow();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/docs.zip', expect.any(Object));
    });

    it('should handle workflow with expired URL', async () => {
      const mockContent = `# Implementation plan

1. **download** https://example.com/expired.zip
`;

      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      // Mock expired URL response
      const expiryResponse = {
        message: 'URL expired',
        instructions: 'Contact support'
      };
      const mockResponse = {
        data: Buffer.from(JSON.stringify(expiryResponse)),
        headers: { 'content-type': 'application/json' },
        status: 200
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await workflowManager.processWorkflow();

      expect(result).toBe(false);
    });

    it('should fallback when implementation_plan.md is missing', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT: no such file'));
      
      const runFallbackSpy = jest.spyOn(workflowManager as any, 'runFallbackFlow').mockResolvedValue(true);

      const result = await workflowManager.processWorkflow();

      expect(result).toBe(true);
      expect(runFallbackSpy).toHaveBeenCalled();
    });

    it('should fallback when no directives found', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('# Empty plan');
      
      const runFallbackSpy = jest.spyOn(workflowManager as any, 'runFallbackFlow').mockResolvedValue(true);

      const result = await workflowManager.processWorkflow();

      expect(result).toBe(true);
      expect(runFallbackSpy).toHaveBeenCalled();
    });
  });
});