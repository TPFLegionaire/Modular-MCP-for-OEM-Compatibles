declare module 'yauzl' {
  export interface Entry {
    fileName: string;
    extraFields: { id: number; data: Buffer }[];
    comment: string;
    versionMadeBy: number;
    versionNeededToExtract: number;
    generalPurposeBitFlag: number;
    compressionMethod: number;
    lastModFileTime: number;
    lastModFileDate: number;
    crc32: number;
    compressedSize: number;
    uncompressedSize: number;
    internalFileAttributes: number;
    externalFileAttributes: number;
    relativeOffsetOfLocalHeader: number;
  }

  export interface ZipFile {
    readEntry(): void;
    openReadStream(entry: Entry, callback: (err: Error | null, readStream: NodeJS.ReadableStream) => void): void;
    close(): void;
    on(event: 'entry', listener: (entry: Entry) => void): void;
    on(event: 'end', listener: () => void): void;
    on(event: 'error', listener: (error: Error) => void): void;
    on(event: string, listener: (...args: any[]) => void): void;
  }

  export interface Options {
    lazyEntries?: boolean;
    autoClose?: boolean;
  }

  export function open(path: string, options: Options, callback: (err: Error | null, zipfile: ZipFile) => void): void;
  export function open(path: string, callback: (err: Error | null, zipfile: ZipFile) => void): void;
}