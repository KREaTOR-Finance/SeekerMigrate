/**
 * SeekerMigrate
 *
 * A CLI tool for converting mobile app authentication
 * from Firebase to Solana Seeker wallet authentication.
 *
 * @packageDocumentation
 */

// Export schema types
export type {
  UAM_Auth,
  SourceFile,
  DetectedPattern,
  AnalysisResult,
  AnalysisError,
  ConversionRule,
  MigrationReport,
  AuthMethod,
  AuthProvider,
  SourceLanguage,
  TargetEcosystem,
  ConversionAction,
} from './schema/uam.js';

// Export analyzer
export { FirebaseAuthAnalyzer, analyzeProject } from './analyzer/index.js';
export type { AnalyzerOptions } from './analyzer/index.js';

// Export rules
export {
  findMatchingRules,
  getRuleById,
  getAllRuleSets,
  parseActions,
} from './rules/index.js';
export type { ExtendedRule, ParsedAction, RuleSet } from './rules/index.js';

// Export generator
export { TemplateGenerator, ReportGenerator } from './generator/index.js';
export type { GeneratorOptions, GeneratedFile } from './generator/index.js';

/**
 * Library version
 */
export const VERSION = '0.1.0';
