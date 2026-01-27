/**
 * Template Generator
 *
 * Orchestrates the generation of all template files based on
 * conversion rules and outputs them to the specified directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GeneratorOptions, GeneratedFile, TemplateContext, TemplateName } from './types.js';
import type { ParsedAction } from '../rules/index.js';
import {
  generateWalletConnectButton,
  generateAuthContext,
  generatePolyfills,
  generateWalletProvider,
  generatePaymentModule,
  generateVanityGenerator,
  generateNameService,
} from './templates/index.js';

/**
 * Template generator class
 */
export class TemplateGenerator {
  private options: Required<GeneratorOptions>;
  private context: TemplateContext;

  constructor(options: GeneratorOptions) {
    this.options = {
      projectName: 'SeekerApp',
      useTypeScript: true,
      componentExtension: '.tsx',
      ...options,
    };

    this.context = {
      projectName: this.options.projectName,
      useTypeScript: this.options.useTypeScript,
      appName: this.options.projectName,
      generatedDate: new Date().toISOString(),
      solanaCluster: 'devnet',
    };
  }

  /**
   * Generate all templates based on parsed actions
   */
  async generateFromActions(actions: ParsedAction[]): Promise<GeneratedFile[]> {
    const generatedFiles: GeneratedFile[] = [];

    // Filter for template generation actions
    const templateActions = actions.filter(
      (a): a is Extract<ParsedAction, { type: 'generate_template' }> =>
        a.type === 'generate_template'
    );

    // Ensure output directory exists
    await this.ensureOutputDir();

    // Generate each template
    for (const action of templateActions) {
      const file = await this.generateTemplate(action.templateName as TemplateName);
      if (file) {
        generatedFiles.push(file);
      }
    }

    return generatedFiles;
  }

  /**
   * Generate a single template
   */
  async generateTemplate(templateName: TemplateName): Promise<GeneratedFile | null> {
    const ext = this.options.componentExtension;
    let content: string;
    let fileName: string;

    switch (templateName) {
      case 'wallet-connect-button':
        content = generateWalletConnectButton(this.context);
        fileName = `WalletConnectButton${ext}`;
        break;

      case 'auth-context':
        content = generateAuthContext(this.context);
        fileName = `WalletAuthContext${ext}`;
        break;

      case 'polyfills':
        content = generatePolyfills(this.context);
        fileName = 'polyfills.js'; // Always JS for polyfills
        break;

      case 'wallet-provider':
        content = generateWalletProvider(this.context);
        fileName = `SolanaWalletProvider${ext}`;
        break;

      case 'payment-module':
        content = generatePaymentModule(this.context);
        fileName = `WalletPaymentModule${ext}`;
        break;

      case 'vanity-generator':
        content = generateVanityGenerator(this.context);
        fileName = `VanityWalletGenerator${ext}`;
        break;

      case 'name-service':
        content = generateNameService(this.context);
        fileName = `NameServiceLookup${ext}`;
        break;

      default:
        console.warn(`Unknown template: ${templateName}`);
        return null;
    }

    const filePath = path.join(this.options.outputDir, fileName);
    let written = false;

    try {
      await fs.promises.writeFile(filePath, content, 'utf-8');
      written = true;
    } catch (error) {
      console.error(`Failed to write ${fileName}:`, error);
    }

    return {
      path: fileName,
      content,
      templateName,
      written,
    };
  }

  /**
   * Generate all available templates
   */
  async generateAll(): Promise<GeneratedFile[]> {
    const templates: TemplateName[] = [
      'wallet-connect-button',
      'auth-context',
      'polyfills',
      'wallet-provider',
      'payment-module',
      'vanity-generator',
      'name-service',
    ];

    await this.ensureOutputDir();

    const files: GeneratedFile[] = [];
    for (const template of templates) {
      const file = await this.generateTemplate(template);
      if (file) {
        files.push(file);
      }
    }

    return files;
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDir(): Promise<void> {
    try {
      await fs.promises.mkdir(this.options.outputDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  }

  /**
   * Update generator context
   */
  setContext(updates: Partial<TemplateContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Get current context
   */
  getContext(): TemplateContext {
    return { ...this.context };
  }
}
