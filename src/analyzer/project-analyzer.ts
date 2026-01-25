/**
 * Project Analyzer
 *
 * Walks through the project directory, identifies relevant files,
 * and orchestrates the analysis to produce UAM results.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type { AnalysisResult, UAM_Auth, SourceLanguage, AnalysisError } from '../schema/uam.js';
import { FirebaseAuthAnalyzer } from './firebase-auth-analyzer.js';
import { SwiftAuthAnalyzer } from './swift-auth-analyzer.js';
import { KotlinAuthAnalyzer } from './kotlin-auth-analyzer.js';
import type { AnalyzerOptions, AnalyzableFile } from './types.js';
import { DEFAULT_OPTIONS } from './types.js';

/**
 * Analyze a project directory for authentication patterns
 */
export async function analyzeProject(
  options: AnalyzerOptions
): Promise<AnalysisResult> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const startTime = new Date();
  const errors: AnalysisError[] = [];

  // Find all analyzable files
  const files = await findAnalyzableFiles(opts);

  // Initialize analyzers
  const firebaseAnalyzer = new FirebaseAuthAnalyzer({ verbose: opts.verbose });
  const swiftAnalyzer = new SwiftAuthAnalyzer({ verbose: opts.verbose });
  const kotlinAnalyzer = new KotlinAuthAnalyzer({ verbose: opts.verbose });

  // Analyze each file
  const jstsDetectionResults = new Map<string, ReturnType<FirebaseAuthAnalyzer['analyzeCode']>>();
  const swiftDetectionResults = new Map<string, ReturnType<SwiftAuthAnalyzer['analyzeCode']>>();
  const kotlinDetectionResults = new Map<string, ReturnType<KotlinAuthAnalyzer['analyzeCode']>>();
  const languageMap = new Map<string, SourceLanguage>();

  for (const file of files) {
    try {
      const code = await fs.promises.readFile(file.absolutePath, 'utf-8');

      if (file.language === 'swift') {
        const result = swiftAnalyzer.analyzeCode(code, file.absolutePath);
        swiftDetectionResults.set(file.relativePath, result);
      } else if (file.language === 'kotlin') {
        const result = kotlinAnalyzer.analyzeCode(code, file.absolutePath);
        kotlinDetectionResults.set(file.relativePath, result);
      } else {
        const result = firebaseAnalyzer.analyzeCode(code, file.absolutePath);
        jstsDetectionResults.set(file.relativePath, result);
      }
      languageMap.set(file.relativePath, file.language);
    } catch (error) {
      errors.push({
        file: file.relativePath,
        message: error instanceof Error ? error.message : String(error),
        type: 'file_read_error',
      });
    }
  }

  // Build UAM objects
  const authFeatures: UAM_Auth[] = [];

  // Check for JavaScript/TypeScript Firebase auth
  const jsFiles = new Map(
    [...jstsDetectionResults].filter(([path]) =>
      path.endsWith('.js') || path.endsWith('.jsx')
    )
  );
  const tsFiles = new Map(
    [...jstsDetectionResults].filter(([path]) =>
      path.endsWith('.ts') || path.endsWith('.tsx')
    )
  );

  // Build UAM for JavaScript files
  if (jsFiles.size > 0) {
    const jsUAM = firebaseAnalyzer.buildUAM(jsFiles, 'javascript');
    if (jsUAM) {
      authFeatures.push(jsUAM);
    }
  }

  // Build UAM for TypeScript files
  if (tsFiles.size > 0) {
    const tsUAM = firebaseAnalyzer.buildUAM(tsFiles, 'typescript');
    if (tsUAM) {
      // Merge with JS UAM if both exist
      if (authFeatures.length > 0 && authFeatures[0].method === tsUAM.method) {
        authFeatures[0].sourceFiles.push(...tsUAM.sourceFiles);
        authFeatures[0].confidence = Math.max(
          authFeatures[0].confidence,
          tsUAM.confidence
        );
      } else {
        authFeatures.push(tsUAM);
      }
    }
  }

  // Build UAM for Swift files
  if (swiftDetectionResults.size > 0) {
    const swiftUAM = swiftAnalyzer.buildUAM(swiftDetectionResults);
    if (swiftUAM) {
      // Merge with existing UAM if same method
      const existingIndex = authFeatures.findIndex(f => f.method === swiftUAM.method);
      if (existingIndex >= 0) {
        authFeatures[existingIndex].sourceFiles.push(...swiftUAM.sourceFiles);
        authFeatures[existingIndex].confidence = Math.max(
          authFeatures[existingIndex].confidence,
          swiftUAM.confidence
        );
      } else {
        authFeatures.push(swiftUAM);
      }
    }
  }

  // Build UAM for Kotlin files
  if (kotlinDetectionResults.size > 0) {
    const kotlinUAM = kotlinAnalyzer.buildUAM(kotlinDetectionResults);
    if (kotlinUAM) {
      // Merge with existing UAM if same method
      const existingIndex = authFeatures.findIndex(f => f.method === kotlinUAM.method);
      if (existingIndex >= 0) {
        authFeatures[existingIndex].sourceFiles.push(...kotlinUAM.sourceFiles);
        authFeatures[existingIndex].confidence = Math.max(
          authFeatures[existingIndex].confidence,
          kotlinUAM.confidence
        );
      } else {
        authFeatures.push(kotlinUAM);
      }
    }
  }

  // Calculate summary
  const jstsPatterns = [...jstsDetectionResults.values()]
    .reduce((sum, r) => sum + r.patterns.length, 0);
  const swiftPatterns = [...swiftDetectionResults.values()]
    .reduce((sum, r) => sum + r.patterns.length, 0);
  const kotlinPatterns = [...kotlinDetectionResults.values()]
    .reduce((sum, r) => sum + r.patterns.length, 0);
  const patternsDetected = jstsPatterns + swiftPatterns + kotlinPatterns;

  const primaryMethod = authFeatures.length > 0
    ? authFeatures.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      ).method
    : null;

  return {
    projectPath: opts.rootDir,
    timestamp: startTime.toISOString(),
    authFeatures,
    errors: errors.length > 0 ? errors : undefined,
    summary: {
      filesScanned: files.length,
      patternsDetected,
      primaryMethod,
    },
  };
}

/**
 * Find all analyzable files in the project
 */
async function findAnalyzableFiles(
  options: Required<Omit<AnalyzerOptions, 'verbose'>> & { verbose: boolean }
): Promise<AnalyzableFile[]> {
  const { rootDir, extensions, excludeDirs } = options;

  // Build glob pattern
  const patterns = extensions.map((ext) => `**/*${ext}`);
  const ignore = excludeDirs.map((dir) => `**/${dir}/**`);

  const matchedFiles: string[] = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: rootDir,
      ignore,
      absolute: false,
      nodir: true,
    });
    matchedFiles.push(...matches);
  }

  // Deduplicate and convert to AnalyzableFile
  const uniqueFiles = [...new Set(matchedFiles)];

  return uniqueFiles.map((relativePath) => ({
    absolutePath: path.join(rootDir, relativePath),
    relativePath,
    language: getLanguage(relativePath),
    extension: path.extname(relativePath),
  }));
}

/**
 * Determine the language of a file based on its extension
 */
function getLanguage(filePath: string): SourceLanguage {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.js':
    case '.jsx':
      return 'javascript';
    case '.dart':
      return 'dart';
    case '.swift':
      return 'swift';
    case '.kt':
    case '.kts':
      return 'kotlin';
    default:
      return 'javascript';
  }
}
