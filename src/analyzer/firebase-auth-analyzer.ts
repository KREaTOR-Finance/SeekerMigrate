/**
 * Firebase Authentication Analyzer
 *
 * Detects Firebase Email Authentication patterns in React Native
 * and JavaScript/TypeScript code using Babel for parsing.
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { Node, SourceLocation } from '@babel/types';
import type { UAM_Auth, DetectedPattern, SourceFile } from '../schema/uam.js';
import {
  FIREBASE_AUTH_IMPORTS,
  FIREBASE_AUTH_FUNCTIONS,
  AUTH_UI_PATTERNS,
} from './types.js';

/**
 * Detection result from analyzing a single file
 */
interface FileDetectionResult {
  hasFirebaseAuth: boolean;
  patterns: DetectedPattern[];
  hasLoginForm: boolean;
  hasPasswordReset: boolean;
  hasRegistration: boolean;
}

/**
 * Analyzes code for Firebase Authentication patterns
 */
export class FirebaseAuthAnalyzer {
  private verbose: boolean;

  constructor(options: { verbose?: boolean } = {}) {
    this.verbose = options.verbose ?? false;
  }

  /**
   * Analyze source code for Firebase auth patterns
   */
  analyzeCode(code: string, filePath: string): FileDetectionResult {
    const result: FileDetectionResult = {
      hasFirebaseAuth: false,
      patterns: [],
      hasLoginForm: false,
      hasPasswordReset: false,
      hasRegistration: false,
    };

    try {
      const ast = this.parseCode(code, filePath);
      this.traverseAST(ast, result, filePath);
    } catch (error) {
      if (this.verbose) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    return result;
  }

  /**
   * Parse source code into AST
   */
  private parseCode(code: string, filePath: string): Node {
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const isJSX = filePath.endsWith('.jsx') || filePath.endsWith('.tsx');

    return parse(code, {
      sourceType: 'module',
      plugins: [
        isJSX ? 'jsx' : null,
        isTypeScript ? 'typescript' : null,
        'classProperties',
        'decorators-legacy',
        'exportDefaultFrom',
        'optionalChaining',
        'nullishCoalescingOperator',
      ].filter(Boolean) as string[],
      errorRecovery: true,
    });
  }

  /**
   * Traverse AST and detect patterns
   */
  private traverseAST(
    ast: Node,
    result: FileDetectionResult,
    filePath: string
  ): void {
    // Handle both default and named exports from @babel/traverse
    const traverseFn = typeof traverse === 'function'
      ? traverse
      : (traverse as { default: typeof traverse }).default;

    traverseFn(ast, {
      // Detect imports
      ImportDeclaration: (path) => {
        const source = path.node.source.value;
        if (this.isFirebaseAuthImport(source)) {
          result.hasFirebaseAuth = true;
          result.patterns.push(
            this.createPattern('import', source, path.node.loc)
          );

          // Check for specific imported functions
          path.node.specifiers.forEach((spec) => {
            if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier') {
              const importedName = spec.imported.name;
              if (FIREBASE_AUTH_FUNCTIONS.includes(importedName as (typeof FIREBASE_AUTH_FUNCTIONS)[number])) {
                result.patterns.push(
                  this.createPattern('import', importedName, spec.loc)
                );
              }
            }
          });
        }
      },

      // Detect function calls
      CallExpression: (path) => {
        const callee = path.node.callee;
        let functionName: string | null = null;

        // Direct function call: signInWithEmailAndPassword(...)
        if (callee.type === 'Identifier') {
          functionName = callee.name;
        }
        // Member expression: auth.signInWithEmailAndPassword(...)
        else if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier'
        ) {
          functionName = callee.property.name;
        }

        if (functionName && this.isFirebaseAuthFunction(functionName)) {
          result.hasFirebaseAuth = true;
          result.patterns.push(
            this.createPattern('function_call', functionName, path.node.loc)
          );

          // Detect specific auth flows
          if (functionName === 'createUserWithEmailAndPassword') {
            result.hasRegistration = true;
          }
          if (functionName === 'sendPasswordResetEmail') {
            result.hasPasswordReset = true;
          }
        }
      },

      // Detect JSX elements for UI patterns
      JSXElement: (path) => {
        const openingElement = path.node.openingElement;
        if (openingElement.name.type !== 'JSXIdentifier') return;

        const elementName = openingElement.name.name;

        // Detect TextInput components
        if (elementName === 'TextInput' || elementName === 'Input') {
          const attrs = this.getJSXAttributes(openingElement);

          if (this.isAuthInput(attrs)) {
            result.hasLoginForm = true;
            result.patterns.push(
              this.createPattern(
                'ui_component',
                `${elementName}[auth]`,
                path.node.loc
              )
            );
          }
        }

        // Detect Button/TouchableOpacity with auth-related text
        if (
          elementName === 'Button' ||
          elementName === 'TouchableOpacity' ||
          elementName === 'Pressable'
        ) {
          const attrs = this.getJSXAttributes(openingElement);
          if (this.isAuthButton(attrs)) {
            result.hasLoginForm = true;
            result.patterns.push(
              this.createPattern(
                'ui_component',
                `${elementName}[auth]`,
                path.node.loc
              )
            );
          }
        }
      },

      // Detect require() calls for Firebase
      VariableDeclarator: (path) => {
        const init = path.node.init;
        if (
          init?.type === 'CallExpression' &&
          init.callee.type === 'Identifier' &&
          init.callee.name === 'require'
        ) {
          const arg = init.arguments[0];
          if (arg?.type === 'StringLiteral' && this.isFirebaseAuthImport(arg.value)) {
            result.hasFirebaseAuth = true;
            result.patterns.push(
              this.createPattern('import', `require('${arg.value}')`, path.node.loc)
            );
          }
        }
      },
    });
  }

  /**
   * Check if import is Firebase auth related
   */
  private isFirebaseAuthImport(source: string): boolean {
    return FIREBASE_AUTH_IMPORTS.some(
      (pkg) => source === pkg || source.startsWith(pkg + '/')
    );
  }

  /**
   * Check if function name is a Firebase auth function
   */
  private isFirebaseAuthFunction(name: string): boolean {
    return FIREBASE_AUTH_FUNCTIONS.includes(name as (typeof FIREBASE_AUTH_FUNCTIONS)[number]);
  }

  /**
   * Get JSX attributes as a record
   */
  private getJSXAttributes(
    element: { attributes: Array<{ type: string; name?: { name?: string }; value?: { value?: string; type?: string } }> }
  ): Record<string, string> {
    const attrs: Record<string, string> = {};

    for (const attr of element.attributes) {
      if (
        attr.type === 'JSXAttribute' &&
        attr.name?.name &&
        attr.value?.type === 'StringLiteral'
      ) {
        attrs[attr.name.name] = attr.value.value ?? '';
      }
    }

    return attrs;
  }

  /**
   * Check if TextInput is auth-related
   */
  private isAuthInput(attrs: Record<string, string>): boolean {
    const relevantValues = [
      attrs.placeholder?.toLowerCase(),
      attrs.textContentType?.toLowerCase(),
      attrs.autoComplete?.toLowerCase(),
      attrs.name?.toLowerCase(),
      attrs.testID?.toLowerCase(),
    ].filter(Boolean);

    return AUTH_UI_PATTERNS.textInputs.some((pattern) =>
      relevantValues.some((val) => val?.includes(pattern))
    );
  }

  /**
   * Check if Button is auth-related
   */
  private isAuthButton(attrs: Record<string, string>): boolean {
    const relevantValues = [
      attrs.title?.toLowerCase(),
      attrs.accessibilityLabel?.toLowerCase(),
      attrs.testID?.toLowerCase(),
    ].filter(Boolean);

    return AUTH_UI_PATTERNS.buttons.some((pattern) =>
      relevantValues.some((val) => val?.includes(pattern))
    );
  }

  /**
   * Create a detected pattern object
   */
  private createPattern(
    type: DetectedPattern['type'],
    name: string,
    loc: SourceLocation | null | undefined
  ): DetectedPattern {
    return {
      type,
      name,
      line: loc?.start.line ?? 0,
      column: loc?.start.column,
    };
  }

  /**
   * Build a UAM_Auth object from detection results
   */
  buildUAM(
    detectionResults: Map<string, FileDetectionResult>,
    language: 'javascript' | 'typescript'
  ): UAM_Auth | null {
    const sourceFiles: SourceFile[] = [];
    let totalPatterns = 0;
    let hasLoginForm = false;
    let hasPasswordReset = false;
    let hasRegistration = false;

    for (const [filePath, result] of detectionResults) {
      if (result.hasFirebaseAuth) {
        sourceFiles.push({
          path: filePath,
          language,
          detectedLines: [...new Set(result.patterns.map((p) => p.line))],
          patterns: result.patterns,
        });
        totalPatterns += result.patterns.length;
        hasLoginForm = hasLoginForm || result.hasLoginForm;
        hasPasswordReset = hasPasswordReset || result.hasPasswordReset;
        hasRegistration = hasRegistration || result.hasRegistration;
      }
    }

    if (sourceFiles.length === 0) {
      return null;
    }

    // Calculate confidence based on pattern matches
    const confidence = this.calculateConfidence(totalPatterns, sourceFiles.length);

    return {
      feature: 'authentication',
      method: 'firebase_email',
      provider: 'firebase',
      sourceFiles,
      confidence,
      metadata: {
        firebase: {
          hasConfig: true,
          enabledMethods: ['email'],
        },
        ui: {
          hasLoginForm,
          hasPasswordReset,
          hasRegistration,
        },
      },
    };
  }

  /**
   * Calculate confidence score based on detected patterns
   */
  private calculateConfidence(
    patternCount: number,
    fileCount: number
  ): number {
    // Base confidence from pattern count
    let confidence = Math.min(patternCount * 15, 60);

    // Add confidence for multiple files
    confidence += Math.min(fileCount * 10, 30);

    // Add base confidence if we found anything
    if (patternCount > 0) {
      confidence += 10;
    }

    return Math.min(confidence, 100);
  }
}
