/**
 * Kotlin/Android Firebase Authentication Analyzer
 *
 * Detects Firebase Email Authentication patterns in Kotlin code
 * using regex-based pattern matching.
 */

import type { UAM_Auth, DetectedPattern, SourceFile } from '../schema/uam.js';

/**
 * Detection result from analyzing a single Kotlin file
 */
interface KotlinDetectionResult {
  hasFirebaseAuth: boolean;
  patterns: DetectedPattern[];
  hasLoginForm: boolean;
  hasPasswordReset: boolean;
  hasRegistration: boolean;
}

/**
 * Analyzes Kotlin code for Firebase Authentication patterns
 */
export class KotlinAuthAnalyzer {
  constructor(_options: { verbose?: boolean } = {}) {
    // Options reserved for future use
  }

  /**
   * Analyze Kotlin source code for Firebase auth patterns
   */
  analyzeCode(code: string, _filePath: string): KotlinDetectionResult {
    const result: KotlinDetectionResult = {
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

    // Check UI patterns (Jetpack Compose & XML references)
    this.detectUIPatterns(code, lines, result);

    return result;
  }

  /**
   * Detect Firebase imports
   */
  private detectImports(
    code: string,
    lines: string[],
    result: KotlinDetectionResult
  ): void {
    // Firebase Auth imports
    const importPatterns = [
      /import\s+com\.google\.firebase\.auth\.FirebaseAuth/g,
      /import\s+com\.google\.firebase\.auth\.FirebaseUser/g,
      /import\s+com\.google\.firebase\.auth\.\*/g,
      /import\s+com\.google\.firebase\.Firebase/g,
    ];

    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        result.hasFirebaseAuth = true;
        const line = this.getLineNumber(code, match.index);
        result.patterns.push({
          type: 'import',
          name: match[0].replace('import ', ''),
          line,
          snippet: lines[line - 1]?.trim(),
        });
      }
    }
  }

  /**
   * Detect Firebase Auth method calls
   */
  private detectAuthPatterns(
    code: string,
    lines: string[],
    result: KotlinDetectionResult
  ): void {
    let match;

    // FirebaseAuth.getInstance()
    const getInstancePattern = /FirebaseAuth\.getInstance\(\)/g;
    while ((match = getInstancePattern.exec(code)) !== null) {
      result.hasFirebaseAuth = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'function_call',
        name: 'FirebaseAuth.getInstance()',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // Firebase.auth (Kotlin extensions)
    const firebaseAuthPattern = /Firebase\.auth\b/g;
    while ((match = firebaseAuthPattern.exec(code)) !== null) {
      result.hasFirebaseAuth = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'function_call',
        name: 'Firebase.auth',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // signInWithEmailAndPassword
    const signInPattern = /signInWithEmailAndPassword\s*\(/g;
    while ((match = signInPattern.exec(code)) !== null) {
      result.hasFirebaseAuth = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'function_call',
        name: 'signInWithEmailAndPassword()',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // createUserWithEmailAndPassword
    const createUserPattern = /createUserWithEmailAndPassword\s*\(/g;
    while ((match = createUserPattern.exec(code)) !== null) {
      result.hasFirebaseAuth = true;
      result.hasRegistration = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'function_call',
        name: 'createUserWithEmailAndPassword()',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // signOut
    const signOutPattern = /\.signOut\s*\(\)/g;
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

    // sendPasswordResetEmail
    const resetPattern = /sendPasswordResetEmail\s*\(/g;
    while ((match = resetPattern.exec(code)) !== null) {
      result.hasFirebaseAuth = true;
      result.hasPasswordReset = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'function_call',
        name: 'sendPasswordResetEmail()',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // addAuthStateListener
    const listenerPattern = /addAuthStateListener\s*[({]/g;
    while ((match = listenerPattern.exec(code)) !== null) {
      result.hasFirebaseAuth = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'function_call',
        name: 'addAuthStateListener',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // currentUser
    const currentUserPattern = /\.currentUser\b/g;
    while ((match = currentUserPattern.exec(code)) !== null) {
      result.hasFirebaseAuth = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'function_call',
        name: 'currentUser',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }
  }

  /**
   * Detect Android authentication UI patterns (Jetpack Compose & XML)
   */
  private detectUIPatterns(
    code: string,
    lines: string[],
    result: KotlinDetectionResult
  ): void {
    let match;

    // Jetpack Compose TextField for email
    const emailFieldPattern = /TextField\s*\([^)]*(?:email|Email)[^)]*\)/gi;
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

    // Jetpack Compose OutlinedTextField
    const outlinedEmailPattern = /OutlinedTextField\s*\([^)]*(?:email|Email)[^)]*\)/gi;
    while ((match = outlinedEmailPattern.exec(code)) !== null) {
      result.hasLoginForm = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'ui_component',
        name: 'OutlinedTextField[email]',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // Password field with visualTransformation
    const passwordFieldPattern = /(?:TextField|OutlinedTextField)\s*\([^)]*(?:password|Password)[^)]*visualTransformation/gi;
    while ((match = passwordFieldPattern.exec(code)) !== null) {
      result.hasLoginForm = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'ui_component',
        name: 'TextField[password]',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    // Button with sign in text
    const signInButtonPattern = /Button\s*\([^)]*\)\s*\{[^}]*(?:Sign\s*In|Login|Sign\s*Up)/gi;
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

    // XML view binding references
    const bindingEmailPattern = /binding\.(?:email|emailInput|etEmail|editTextEmail)/gi;
    while ((match = bindingEmailPattern.exec(code)) !== null) {
      result.hasLoginForm = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'ui_component',
        name: 'ViewBinding[email]',
        line,
        snippet: lines[line - 1]?.trim(),
      });
    }

    const bindingPasswordPattern = /binding\.(?:password|passwordInput|etPassword|editTextPassword)/gi;
    while ((match = bindingPasswordPattern.exec(code)) !== null) {
      result.hasLoginForm = true;
      const line = this.getLineNumber(code, match.index);
      result.patterns.push({
        type: 'ui_component',
        name: 'ViewBinding[password]',
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
   * Build a UAM_Auth object from Kotlin detection results
   */
  buildUAM(
    detectionResults: Map<string, KotlinDetectionResult>
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
          language: 'kotlin',
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
