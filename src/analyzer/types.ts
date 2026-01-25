/**
 * Analyzer type definitions
 */

import type { SourceLanguage } from '../schema/uam.js';

/**
 * Options for the code analyzer
 */
export interface AnalyzerOptions {
  /** Root directory to analyze */
  rootDir: string;
  /** File extensions to include */
  extensions?: string[];
  /** Directories to exclude */
  excludeDirs?: string[];
  /** Verbose logging */
  verbose?: boolean;
}

/**
 * Default analyzer options
 */
export const DEFAULT_OPTIONS: Required<Omit<AnalyzerOptions, 'rootDir'>> = {
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.swift', '.kt'],
  excludeDirs: ['node_modules', '.git', 'dist', 'build', '__tests__', 'coverage', 'Pods', 'DerivedData', '.gradle'],
  verbose: false,
};

/**
 * File to analyze
 */
export interface AnalyzableFile {
  /** Absolute path to the file */
  absolutePath: string;
  /** Relative path from project root */
  relativePath: string;
  /** Detected language */
  language: SourceLanguage;
  /** File extension */
  extension: string;
}

/**
 * Firebase import patterns to detect
 */
export const FIREBASE_AUTH_IMPORTS = [
  'firebase/auth',
  '@react-native-firebase/auth',
  'firebase/app',
] as const;

/**
 * Firebase auth function calls to detect
 */
export const FIREBASE_AUTH_FUNCTIONS = [
  'signInWithEmailAndPassword',
  'createUserWithEmailAndPassword',
  'signOut',
  'onAuthStateChanged',
  'sendPasswordResetEmail',
  'sendEmailVerification',
  'getAuth',
  'initializeAuth',
] as const;

/**
 * UI patterns that indicate authentication forms
 */
export const AUTH_UI_PATTERNS = {
  textInputs: ['email', 'password', 'username', 'login'],
  buttons: ['login', 'signin', 'sign in', 'submit', 'register', 'signup', 'sign up'],
} as const;

/**
 * Swift/iOS Firebase import patterns
 */
export const SWIFT_FIREBASE_IMPORTS = [
  'FirebaseAuth',
  'FirebaseCore',
  'Firebase',
] as const;

/**
 * Swift Firebase auth patterns (method calls and types)
 */
export const SWIFT_FIREBASE_AUTH_PATTERNS = [
  'Auth.auth()',
  'signIn(withEmail:',
  'createUser(withEmail:',
  'signOut()',
  'sendPasswordReset(withEmail:',
  'addStateDidChangeListener',
  'AuthStateDidChangeListenerHandle',
] as const;
