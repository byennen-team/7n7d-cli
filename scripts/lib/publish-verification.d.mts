export interface VerifyPublishableOptions {
  run: (command: string, args?: string[], opts?: Record<string, unknown>) => string
  root?: string
  tmpDir?: string
  platform?: NodeJS.Platform
}

export declare function verifyPublishable(options: VerifyPublishableOptions): string
