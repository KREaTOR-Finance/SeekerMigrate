/**
 * Swift/iOS Firebase Authentication Analyzer
 *
 * Detects Firebase Email Authentication patterns in Swift code
 * using regex-based pattern matching.
 */

import type { UAM_Auth, DetectedPattern, SourceFile } from '../schema/uam.js';

/**
 * Detection result from analyzing a single Swift file
 */
interface SwiftDetectionResult {
  hasFirebaseAuth: boolean;
  patterns: DetectedPattern[];
  hasLoginForm: boolean;
  hasPasswordReset: boolean;
  hasRegistration: boolean;
}

/**
 * Analyzes Swift code for Firebase Authentication patterns
 */
export class SwiftAuthAnalyzer {
  constructor(_options: { verbose?: boolean } = {}) {
    // Options reserved for future use
  }

  /**
   * Analyze Swift source code for Firebase auth patterns
   */
  analyzeCode(code: string, _filePath: string): SwiftDetectionResult {
    const result: SwiftDetectionResult = {
      hasFirebaseAuth: false,
      patterns: [],
      hasLoginForm: false,
      hasPasswordReset: false,
      hasRegistration: false,
    };

    const lines = code.split('\n');

    // Check imports
    this.detectImports(code, lines, result);

    // Check auth patterns
    this.detectAuthPatterns(code, lines, result);

    // Check UI patterns
    this.detectUIPatterns(code, lines, result);

    return result;
  }

  /**
   * Detect Firebase imports
   */
  private detectImports(
    code: string,
    lines: string[],
    result: SwiftDetectionResult
  ): void {
    const importPattern = /import\s+(FirebaseAuth|FirebaseCore|Firebase)\b/g;
    let match;

    while ((match = importPattern.exec(code)) !== null) {
      result.hasFirebaseAuth = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'import',
        name: match[1],
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }
  }

  /**
   * Detect Firebase Auth method calls
   */
  private detectAuthPatterns(
    code: string,
    lines: string[],
    result: SwiftDetectionResult
  ): void {
    // Auth.auth() instances
    let match;
    const authPattern = /Auth\.auth\(\)/g;
    while ((match = authPattern.exec(code)) !== null) {
      result.hasFirebaseAuth = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'function_call',
        name: 'Auth.auth()',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // signIn(withEmail:
    const signInPattern = /signIn\s*\(\s*withEmail\s*:/g;
    while ((match = signInPattern.exec(code)) !== null) {
      result.hasFirebaseAuth = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'function_call',
        name: 'signIn(withEmail:password:)',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // createUser(withEmail:
    const createUserPattern = /createUser\s*\(\s*withEmail\s*:/g;
    while ((match = createUserPattern.exec(code)) !== null) {
      result.hasFirebaseAuth = true;
      result.hasRegistration = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'function_call',
        name: 'createUser(withEmail:password:)',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // signOut
    const signOutPattern = /\.signOut\(\)/g;
    while ((match = signOutPattern.exec(code)) !== null) {
      result.hasFirebaseAuth = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'function_call',
        name: 'signOut()',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // sendPasswordReset
    const resetPattern = /sendPasswordReset\s*\(\s*withEmail\s*:/g;
    while ((match = resetPattern.exec(code)) !== null) {
      result.hasFirebaseAuth = true;
      result.hasPasswordReset = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'function_call',
        name: 'sendPasswordReset(withEmail:)',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // Auth state listener
    const listenerPattern = /addStateDidChangeListener/g;
    while ((match = listenerPattern.exec(code)) !== null) {
      result.hasFirebaseAuth = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'function_call',
        name: 'addStateDidChangeListener',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }
  }

  /**
   * Detect SwiftUI authentication UI patterns
   */
  private detectUIPatterns(
    code: string,
    lines: string[],
    result: SwiftDetectionResult
  ): void {
    let match;

    // TextField for email
    const emailFieldPattern = /TextField\s*\(\s*["']Email/gi;
    while ((match = emailFieldPattern.exec(code)) !== null) {
      result.hasLoginForm = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'ui_component',
        name: 'TextField[email]',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // SecureField for password
    const secureFieldPattern = /SecureField\s*\(\s*["']Password/gi;
    while ((match = secureFieldPattern.exec(code)) !== null) {
      result.hasLoginForm = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'ui_component',
        name: 'SecureField[password]',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // Sign In button
    const signInButtonPattern = /Button\s*\(\s*["']Sign\s*In["']/gi;
    while ((match = signInButtonPattern.exec(code)) !== null) {
      result.hasLoginForm = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'ui_component',
        name: 'Button[signIn]',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(code: string, index: number): number {
    const substring = code.substring(0, index);
    return (substring.match(/\n/g) || []).length + 1;
  }

  /**
   * Build a UAM_Auth object from Swift detection results
   */
  buildUAM(
    detectionResults: Map<string, SwiftDetectionResult>
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
          language: 'swift',
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
    let confidence = Math.min(patternCount * 10, 60);

    // Add confidence for multiple files
    confidence += Math.min(fileCount * 15, 30);

    // Add base confidence if we found anything
    if (patternCount > 0) {
      confidence += 10;
    }

    return Math.min(confidence, 100);
  }
}
