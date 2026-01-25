/**
 * Static Code Analyzer
 *
 * Entry point for the code analysis module that parses
 * JavaScript/TypeScript/React Native code to detect
 * authentication patterns.
 */

export { FirebaseAuthAnalyzer } from './firebase-auth-analyzer.js';
export { analyzeProject } from './project-analyzer.js';
export type { AnalyzerOptions } from './types.js';
