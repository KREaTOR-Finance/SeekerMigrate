/**
 * Universal App Model (UAM) Schema for Authentication
 *
 * The UAM acts as an intermediary, framework-agnostic blueprint
 * of the app's authentication feature.
 */

/**
 * Supported authentication methods
 */
export type AuthMethod =
  | 'firebase_email'
  | 'google_oauth'
  | 'apple_signin'
  | 'wallet_signature';

/**
 * Supported authentication providers
 */
export type AuthProvider =
  | 'firebase'
  | 'apple'
  | 'google'
  | 'seeker'
  | 'solana_mobile_wallet_adapter';

/**
 * Supported programming languages for source files
 */
export type SourceLanguage =
  | 'javascript'
  | 'typescript'
  | 'dart'
  | 'swift'
  | 'kotlin';

/**
 * Represents a source file where authentication logic was detected
 */
export interface SourceFile {
  /** Relative path to the source file */
  path: string;
  /** Programming language of the file */
  language: SourceLanguage;
  /** Line numbers where auth-related code was found */
  detectedLines?: number[];
  /** Specific patterns detected in this file */
  patterns?: DetectedPattern[];
}

/**
 * Pattern detected during code analysis
 */
export interface DetectedPattern {
  /** Type of pattern detected */
  type: 'import' | 'function_call' | 'ui_component' | 'config';
  /** Name of the detected pattern */
  name: string;
  /** Line number where pattern was found */
  line: number;
  /** Column number where pattern was found */
  column?: number;
  /** Raw code snippet */
  snippet?: string;
}

/**
 * Universal App Model for Authentication feature
 *
 * This interface represents the analyzed authentication
 * configuration extracted from source code.
 */
export interface UAM_Auth {
  /** Feature type - always 'authentication' for this module */
  feature: 'authentication';
  /** The authentication method detected */
  method: AuthMethod;
  /** The authentication provider detected */
  provider: AuthProvider;
  /** Files where authentication logic was found */
  sourceFiles: SourceFile[];
  /** Confidence score 0-100 based on pattern match certainty */
  confidence: number;
  /** Additional metadata about the detection */
  metadata?: {
    /** Firebase-specific metadata */
    firebase?: {
      /** Whether Firebase config was found */
      hasConfig: boolean;
      /** Auth methods enabled in config */
      enabledMethods?: string[];
    };
    /** UI-related metadata */
    ui?: {
      /** Whether login form UI was detected */
      hasLoginForm: boolean;
      /** Whether password reset flow was detected */
      hasPasswordReset: boolean;
      /** Whether registration flow was detected */
      hasRegistration: boolean;
    };
  };
}

/**
 * Analysis result containing all detected authentication features
 */
export interface AnalysisResult {
  /** Project root path that was analyzed */
  projectPath: string;
  /** Timestamp of the analysis */
  timestamp: string;
  /** All detected authentication features */
  authFeatures: UAM_Auth[];
  /** Errors encountered during analysis */
  errors?: AnalysisError[];
  /** Summary statistics */
  summary: {
    /** Total files scanned */
    filesScanned: number;
    /** Total auth patterns detected */
    patternsDetected: number;
    /** Primary authentication method detected */
    primaryMethod: AuthMethod | null;
  };
}

/**
 * Error encountered during code analysis
 */
export interface AnalysisError {
  /** File where error occurred */
  file: string;
  /** Error message */
  message: string;
  /** Error type */
  type: 'parse_error' | 'file_read_error' | 'unsupported_syntax';
}

/**
 * Target ecosystem for conversion
 */
export type TargetEcosystem = 'seeker' | 'firebase' | 'web3';

/**
 * Action to perform during conversion
 */
export type ConversionAction =
  | `remove_package: ${string}`
  | `add_package: ${string}`
  | `generate_template: ${string}`
  | `modify_file: ${string}`
  | `create_file: ${string}`;

/**
 * Conversion rule definition
 */
export interface ConversionRule {
  /** Unique rule identifier */
  id: string;
  /** Source pattern to match */
  source: {
    method: AuthMethod;
    provider: AuthProvider;
  };
  /** Target conversion configuration */
  target: {
    ecosystem: TargetEcosystem;
    method: AuthMethod;
    provider: AuthProvider;
    description: string;
    actions: ConversionAction[];
  };
}

/**
 * Migration report generated after conversion
 */
export interface MigrationReport {
  /** Report title */
  title: string;
  /** Timestamp of generation */
  generatedAt: string;
  /** Source authentication details */
  source: {
    method: AuthMethod;
    provider: AuthProvider;
    files: string[];
  };
  /** Target authentication details */
  target: {
    method: AuthMethod;
    provider: AuthProvider;
    ecosystem: TargetEcosystem;
  };
  /** Conversion actions performed */
  actions: {
    packagesRemoved: string[];
    packagesAdded: string[];
    filesGenerated: string[];
    filesModified: string[];
  };
  /** Manual steps required */
  manualSteps: string[];
  /** Important notes and warnings */
  notes: string[];
}
