/**
 * Generator type definitions
 */

/**
 * Options for the template generator
 */
export interface GeneratorOptions {
  /** Output directory for generated files */
  outputDir: string;
  /** Project name for templates */
  projectName?: string;
  /** Whether to use TypeScript */
  useTypeScript?: boolean;
  /** Component file extension */
  componentExtension?: '.jsx' | '.tsx' | '.js' | '.ts';
}

/**
 * Generated file result
 */
export interface GeneratedFile {
  /** Relative path from output directory */
  path: string;
  /** File content */
  content: string;
  /** Template name that generated this file */
  templateName: string;
  /** Whether file was successfully written */
  written: boolean;
}

/**
 * Template context for rendering
 */
export interface TemplateContext {
  /** Project name */
  projectName: string;
  /** Whether using TypeScript */
  useTypeScript: boolean;
  /** Current date */
  generatedDate: string;
  /** Solana cluster to use */
  solanaCluster: 'mainnet-beta' | 'devnet' | 'testnet';
  /** App name for wallet adapter */
  appName: string;
  /** Custom variables */
  [key: string]: unknown;
}

/**
 * Available templates
 */
export type TemplateName =
  | 'wallet-connect-button'
  | 'auth-context'
  | 'polyfills'
  | 'wallet-provider'
  | 'payment-module'
  | 'vanity-generator'
  | 'name-service';
