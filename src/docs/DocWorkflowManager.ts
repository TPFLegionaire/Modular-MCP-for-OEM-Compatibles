import * as fs from 'fs/promises';
import * as path from 'path';
import * as child_process from 'child_process';
import axios, { AxiosResponse, AxiosError } from 'axios';
import * as yauzl from 'yauzl';
import { promisify } from 'util';

export interface Directive {
  type: 'download' | 'unzip' | 'validate' | 'implement';
  target: string;
  raw: string;
}

export interface DownloadResult {
  url: string;
  data: Buffer | null;
  contentType: string;
  isExpired: boolean;
  expiryInstructions?: string;
}

export class DocWorkflowManager {
  private readonly implementationPlanPath: string;
  private downloadHistory: DownloadResult[] = [];

  constructor(projectRoot: string = process.cwd()) {
    this.implementationPlanPath = path.join(projectRoot, 'docs', 'implementation_plan.md');
  }

  async processWorkflow(): Promise<boolean> {
    try {
      const directives = await this.parseImplementationPlan();
      
      if (directives.length === 0) {
        console.log('No directives found in implementation_plan.md, running fallback download→unzip flow');
        return await this.runFallbackFlow();
      }

      for (const directive of directives) {
        const success = await this.processDirective(directive);
        if (!success) {
          console.error(`Failed to process directive: ${directive.raw}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        console.log('implementation_plan.md not found, running fallback download→unzip flow');
        return await this.runFallbackFlow();
      }
      console.error('Error processing workflow:', error);
      return false;
    }
  }

  async parseImplementationPlan(): Promise<Directive[]> {
    const content = await fs.readFile(this.implementationPlanPath, 'utf-8');
    const directives: Directive[] = [];

    const lines = content.split('\n');
    const listItemRegex = /^\d+\.\s+\*\*([a-zA-Z]+)\*\*\s+(.+)$/;

    for (const line of lines) {
      const match = line.match(listItemRegex);
      if (match) {
        const [, type, target] = match;
        const directiveType = type.toLowerCase();
        
        if (['download', 'unzip', 'validate', 'implement'].includes(directiveType)) {
          directives.push({
            type: directiveType as Directive['type'],
            target: target.trim(),
            raw: line.trim()
          });
        }
      }
    }

    return directives;
  }

  async processDirective(directive: Directive): Promise<boolean> {
    console.log(`Processing directive: ${directive.type} ${directive.target}`);

    switch (directive.type) {
      case 'download':
        return await this.processDownload(directive.target);
      case 'unzip':
        return await this.processUnzip(directive.target);
      case 'validate':
        return await this.processValidate(directive.target);
      case 'implement':
        return await this.processImplement(directive.target);
      default:
        console.error(`Unknown directive type: ${directive.type}`);
        return false;
    }
  }

  async processDownload(url: string): Promise<boolean> {
    try {
      console.log(`Downloading from: ${url}`);
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        validateStatus: (status) => status === 200,
        headers: {
          'User-Agent': 'DocWorkflowManager/1.0'
        }
      });

      const contentType = response.headers['content-type'] || '';
      const data = Buffer.from(response.data);

      // Check if response is JSON with expiry message
      if (contentType.includes('application/json')) {
        try {
          const jsonResponse = JSON.parse(data.toString('utf-8'));
          
          if (jsonResponse.message && jsonResponse.message.toLowerCase().includes('url expired')) {
            console.error('URL has expired. Aborting processing.');
            
            if (jsonResponse.instructions) {
              console.log('Instructions:', jsonResponse.instructions);
            }
            
            this.downloadHistory.push({
              url,
              data: null,
              contentType,
              isExpired: true,
              expiryInstructions: jsonResponse.instructions
            });
            
            return false;
          }
        } catch (jsonError) {
          // Not valid JSON or parsing failed, treat as regular download
          console.log('Response is not valid JSON, treating as binary data');
        }
      }

      // Successful download of binary data
      const downloadResult: DownloadResult = {
        url,
        data,
        contentType,
        isExpired: false
      };

      this.downloadHistory.push(downloadResult);
      console.log(`Download successful: ${data.length} bytes, content-type: ${contentType}`);
      
      return true;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        
        if (axiosError.response) {
          console.error(`Download failed with status ${axiosError.response.status}: ${axiosError.response.statusText}`);
        } else if (axiosError.request) {
          console.error('Download failed: No response received from server');
        } else {
          console.error(`Download failed: ${axiosError.message}`);
        }
        
        if (axiosError.code === 'ECONNABORTED') {
          console.error('Download timed out after 30 seconds');
        }
      } else {
        console.error(`Download failed: ${error}`);
      }
      
      return false;
    }
  }

  async processUnzip(targetPath: string): Promise<boolean> {
    try {
      const destination = targetPath || 'documentation';
      console.log(`Unzipping to: ${destination}`);

      const downloadHistory = this.getDownloadHistory();
      if (downloadHistory.length === 0) {
        console.error('No downloads available to unzip');
        return false;
      }

      const latestDownload = downloadHistory[downloadHistory.length - 1];
      if (!latestDownload.data) {
        console.error('No data available in latest download');
        return false;
      }

      if (!latestDownload.contentType.includes('zip') && !latestDownload.contentType.includes('octet-stream')) {
        console.error(`Content type ${latestDownload.contentType} is not a zip file`);
        return false;
      }

      // Create destination directory
      await fs.mkdir(destination, { recursive: true });

      // Write zip file temporarily
      const tempZipPath = path.join(destination, 'temp_download.zip');
      await fs.writeFile(tempZipPath, latestDownload.data);

      // Extract using yauzl
      const openZip = promisify(yauzl.open);
      const zipfile = await openZip(tempZipPath);

      return new Promise((resolve) => {
        zipfile.readEntry();
        
        zipfile.on('entry', (entry: yauzl.Entry) => {
          if (entry.fileName.endsWith('/')) {
            // Directory - create it
            fs.mkdir(path.join(destination, entry.fileName), { recursive: true })
              .then(() => zipfile.readEntry())
              .catch((error: Error) => {
                console.error(`Failed to create directory: ${error}`);
                zipfile.close();
                resolve(false);
              });
          } else {
            // File - extract it
            zipfile.openReadStream(entry, (err: Error | null, readStream: NodeJS.ReadableStream) => {
              if (err) {
                console.error(`Failed to open read stream: ${err}`);
                zipfile.close();
                resolve(false);
                return;
              }

              const filePath = path.join(destination, entry.fileName);
              // Use regular fs for createWriteStream since fs/promises doesn't have it
              const writeStream = require('fs').createWriteStream(filePath);

              readStream.pipe(writeStream);
              
              writeStream.on('close', () => {
                zipfile.readEntry();
              });

              writeStream.on('error', (error: Error) => {
                console.error(`Failed to write file: ${error}`);
                zipfile.close();
                resolve(false);
              });
            });
          }
        });

        zipfile.on('end', () => {
          zipfile.close();
          // Clean up temp file
          fs.unlink(tempZipPath).catch(() => {});
          console.log(`Unzip completed successfully to: ${destination}`);
          resolve(true);
        });

        zipfile.on('error', (error: Error) => {
          console.error(`Unzip failed: ${error}`);
          zipfile.close();
          resolve(false);
        });
      });

    } catch (error) {
      console.error(`Unzip failed: ${error}`);
      return false;
    }
  }

  async processValidate(pattern: string): Promise<boolean> {
    try {
      console.log(`Validating pattern: ${pattern}`);
      
      const documentationPath = 'documentation';
      
      // Check if documentation directory exists
      try {
        await fs.access(documentationPath);
      } catch {
        console.error(`Documentation directory '${documentationPath}' does not exist`);
        return false;
      }

      // Simple glob pattern matching implementation
      const files = await this.glob(pattern, documentationPath);
      
      if (files.length === 0) {
        console.error(`No files found matching pattern: ${pattern}`);
        return false;
      }

      console.log(`Validation successful: Found ${files.length} file(s) matching pattern '${pattern}'`);
      return true;

    } catch (error) {
      console.error(`Validation failed: ${error}`);
      return false;
    }
  }

  async processImplement(script: string): Promise<boolean> {
    try {
      const scriptPath = path.join('docs', 'scripts', `${script}.js`);
      console.log(`Executing script: ${scriptPath}`);

      // Check if script file exists
      try {
        await fs.access(scriptPath);
      } catch {
        console.error(`Script file not found: ${scriptPath}`);
        return false;
      }

      // Execute script using Node.js
      const exec = promisify(child_process.exec);
      
      try {
        const { stdout, stderr } = await exec(`node ${scriptPath}`);
        
        if (stdout) {
          console.log(`Script output:\n${stdout}`);
        }
        
        if (stderr) {
          console.error(`Script errors:\n${stderr}`);
        }

        console.log(`Script execution completed successfully: ${scriptPath}`);
        return true;
        
      } catch (execError: any) {
        console.error(`Script execution failed with exit code ${execError.code}: ${execError.message}`);
        if (execError.stdout) {
          console.log(`Script output:\n${execError.stdout}`);
        }
        if (execError.stderr) {
          console.error(`Script errors:\n${execError.stderr}`);
        }
        return false;
      }

    } catch (error) {
      console.error(`Script execution failed: ${error}`);
      return false;
    }
  }

  private async glob(pattern: string, basePath: string): Promise<string[]> {
    const files: string[] = [];
    const self = this;
    
    async function traverse(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(basePath, fullPath);
        
        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else {
          // Simple glob pattern matching
          if (self.matchesPattern(relativePath, pattern)) {
            files.push(relativePath);
          }
        }
      }
    }
    
    await traverse(basePath);
    return files;
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*') // ** matches any characters
      .replace(/\*/g, '[^\\/]*') // * matches any characters except path separators
      .replace(/\?/g, '[^\\/]') // ? matches any single character except path separator
      .replace(/\./g, '\\.'); // escape dots
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }

  async runFallbackFlow(): Promise<boolean> {
    console.log('Running fallback download→unzip flow');
    // This will be implemented with the existing default flow
    return true;
  }

  getDownloadHistory(): DownloadResult[] {
    return [...this.downloadHistory];
  }

  clearDownloadHistory(): void {
    this.downloadHistory = [];
  }
}