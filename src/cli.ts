#!/usr/bin/env node
/**
 * SeekerMigrate CLI
 *
 * Command-line interface for migrating mobile app authentication
 * from Firebase to Solana Seeker wallet authentication.
 *
 * Usage: npx seekermigrate auth --source ./path/to/app --target seeker
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { analyzeProject } from './analyzer/index.js';
import { findMatchingRules, parseActions } from './rules/index.js';
import { TemplateGenerator, ReportGenerator } from './generator/index.js';
import type { UAM_Auth } from './schema/uam.js';

// Get package.json for version
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(__dirname, '../package.json');

let version = '0.1.0';
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  version = packageJson.version;
} catch {
  // Use default version
}

// Create the CLI program
const program = new Command();

program
  .name('seekermigrate')
  .description('Convert mobile app authentication to Solana Seeker wallet authentication')
  .version(version);

// Auth command - main migration command
program
  .command('auth')
  .description('Migrate authentication from Firebase to Solana wallet')
  .requiredOption('-s, --source <path>', 'Path to source project directory')
  .option('-t, --target <ecosystem>', 'Target ecosystem (default: seeker)', 'seeker')
  .option('-o, --output <path>', 'Output directory (default: ./seekermigrate-output)', './seekermigrate-output')
  .option('--typescript', 'Generate TypeScript files', true)
  .option('--no-typescript', 'Generate JavaScript files')
  .option('-v, --verbose', 'Enable verbose output', false)
  .option('--dry-run', 'Analyze only, do not generate files', false)
  .action(async (options) => {
    await runAuthMigration(options);
  });

// Analyze command - analyze only
program
  .command('analyze')
  .description('Analyze a project for authentication patterns')
  .requiredOption('-s, --source <path>', 'Path to source project directory')
  .option('-v, --verbose', 'Enable verbose output', false)
  .option('--json', 'Output results as JSON', false)
  .action(async (options) => {
    await runAnalysis(options);
  });

// Main auth migration function
async function runAuthMigration(options: {
  source: string;
  target: string;
  output: string;
  typescript: boolean;
  verbose: boolean;
  dryRun: boolean;
}): Promise<void> {
  const { source, target, output, typescript, verbose, dryRun } = options;

  console.log('');
  console.log(chalk.bold.magenta('🚀 SeekerMigrate Auth Bridge'));
  console.log(chalk.gray('Converting Firebase Auth to Solana Wallet Auth'));
  console.log('');

  // Validate source directory
  const sourcePath = path.resolve(source);
  if (!fs.existsSync(sourcePath)) {
    console.error(chalk.red(`Error: Source directory not found: ${sourcePath}`));
    process.exit(1);
  }

  // Check if it's a valid project
  const packageJsonExists = fs.existsSync(path.join(sourcePath, 'package.json'));
  if (!packageJsonExists) {
    console.warn(chalk.yellow('Warning: No package.json found in source directory'));
  }

  // Step 1: Analyze the project
  const analyzeSpinner = ora('Analyzing project for authentication patterns...').start();

  try {
    const analysisResult = await analyzeProject({
      rootDir: sourcePath,
      verbose,
    });

    if (analysisResult.authFeatures.length === 0) {
      analyzeSpinner.warn('No authentication patterns detected');
      console.log('');
      console.log(chalk.yellow('The analyzer did not find any Firebase authentication code.'));
      console.log(chalk.gray('Make sure your project uses Firebase Email Authentication.'));
      return;
    }

    analyzeSpinner.succeed(
      `Found ${analysisResult.authFeatures.length} authentication feature(s) in ${analysisResult.summary.filesScanned} files`
    );

    // Display detected patterns
    for (const auth of analysisResult.authFeatures) {
      console.log('');
      console.log(chalk.cyan(`  📋 Detected: ${auth.method} via ${auth.provider}`));
      console.log(chalk.gray(`     Confidence: ${auth.confidence}%`));
      console.log(chalk.gray(`     Files: ${auth.sourceFiles.length}`));

      if (verbose) {
        for (const file of auth.sourceFiles) {
          console.log(chalk.gray(`       - ${file.path}`));
        }
      }
    }

    // Step 2: Find matching conversion rules
    console.log('');
    const ruleSpinner = ora('Finding conversion rules...').start();

    const primaryAuth = analysisResult.authFeatures[0];
    const matchingRules = findMatchingRules(primaryAuth);

    if (matchingRules.length === 0) {
      ruleSpinner.warn('No matching conversion rules found');
      console.log('');
      console.log(chalk.yellow(`No conversion rules available for ${primaryAuth.method} -> ${target}`));
      return;
    }

    const rule = matchingRules[0];
    ruleSpinner.succeed(`Found conversion rule: ${rule.name ?? rule.id}`);
    console.log(chalk.gray(`  ${rule.target.description}`));

    // If dry run, stop here
    if (dryRun) {
      console.log('');
      console.log(chalk.cyan('Dry run complete. No files were generated.'));
      displayActionSummary(rule.target.actions);
      return;
    }

    // Step 3: Generate templates
    console.log('');
    const generateSpinner = ora('Generating migration files...').start();

    const outputPath = path.resolve(output);
    const actions = parseActions(rule.target.actions);

    const generator = new TemplateGenerator({
      outputDir: outputPath,
      projectName: path.basename(sourcePath),
      useTypeScript: typescript,
      componentExtension: typescript ? '.tsx' : '.jsx',
    });

    const generatedFiles = await generator.generateFromActions(actions);
    generateSpinner.succeed(`Generated ${generatedFiles.length} files`);

    for (const file of generatedFiles) {
      const status = file.written ? chalk.green('✓') : chalk.red('✗');
      console.log(chalk.gray(`  ${status} ${file.path}`));
    }

    // Step 4: Generate migration report
    console.log('');
    const reportSpinner = ora('Generating migration report...').start();

    const reportGenerator = new ReportGenerator({
      outputDir: outputPath,
      projectName: path.basename(sourcePath),
    });

    const reportPath = await reportGenerator.generate(
      primaryAuth,
      rule,
      actions,
      generatedFiles
    );

    reportSpinner.succeed('Generated migration report');
    console.log(chalk.gray(`  ${reportPath}`));

    // Final summary
    console.log('');
    console.log(chalk.green.bold('✅ Migration files generated successfully!'));
    console.log('');
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.white(`  1. Review the generated files in ${output}/`));
    console.log(chalk.white('  2. Read MIGRATION_REPORT.md for detailed instructions'));
    console.log(chalk.white('  3. Install required packages:'));
    console.log('');

    const packagesToAdd = actions
      .filter((a): a is { type: 'add_package'; packageName: string } => a.type === 'add_package')
      .map((a) => a.packageName);

    if (packagesToAdd.length > 0) {
      console.log(chalk.gray(`     npm install ${packagesToAdd.join(' ')}`));
    }

    const packagesToRemove = actions
      .filter((a): a is { type: 'remove_package'; packageName: string } => a.type === 'remove_package')
      .map((a) => a.packageName);

    if (packagesToRemove.length > 0) {
      console.log('');
      console.log(chalk.white('  4. Remove old packages:'));
      console.log(chalk.gray(`     npm uninstall ${packagesToRemove.join(' ')}`));
    }

    console.log('');

  } catch (error) {
    analyzeSpinner.fail('Migration failed');
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

// Analysis only function
async function runAnalysis(options: {
  source: string;
  verbose: boolean;
  json: boolean;
}): Promise<void> {
  const { source, verbose, json } = options;

  const sourcePath = path.resolve(source);
  if (!fs.existsSync(sourcePath)) {
    if (json) {
      console.log(JSON.stringify({ error: 'Source directory not found' }));
    } else {
      console.error(chalk.red(`Error: Source directory not found: ${sourcePath}`));
    }
    process.exit(1);
  }

  try {
    const result = await analyzeProject({
      rootDir: sourcePath,
      verbose,
    });

    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('');
      console.log(chalk.bold('Analysis Results'));
      console.log(chalk.gray('─'.repeat(40)));
      console.log('');
      console.log(`Files scanned: ${result.summary.filesScanned}`);
      console.log(`Patterns detected: ${result.summary.patternsDetected}`);
      console.log(`Primary method: ${result.summary.primaryMethod ?? 'none'}`);
      console.log('');

      for (const auth of result.authFeatures) {
        console.log(chalk.cyan(`Authentication Feature:`));
        console.log(`  Method: ${auth.method}`);
        console.log(`  Provider: ${auth.provider}`);
        console.log(`  Confidence: ${auth.confidence}%`);
        console.log(`  Source files:`);
        for (const file of auth.sourceFiles) {
          console.log(`    - ${file.path} (${file.patterns?.length ?? 0} patterns)`);
        }
        console.log('');
      }

      if (result.errors && result.errors.length > 0) {
        console.log(chalk.yellow('Warnings:'));
        for (const err of result.errors) {
          console.log(chalk.yellow(`  - ${err.file}: ${err.message}`));
        }
      }
    }

  } catch (error) {
    if (json) {
      console.log(JSON.stringify({ error: String(error) }));
    } else {
      console.error(chalk.red('Analysis failed:'), error);
    }
    process.exit(1);
  }
}

// Display action summary for dry run
function displayActionSummary(actions: string[]): void {
  console.log('');
  console.log(chalk.cyan('Planned actions:'));

  for (const action of actions) {
    const [type, value] = action.split(': ');
    const icon = type.includes('remove') ? '🗑️ ' :
                 type.includes('add') ? '📦' :
                 type.includes('generate') ? '📝' : '  ';
    console.log(chalk.gray(`  ${icon} ${type}: ${value}`));
  }
}

// Parse and run
program.parse();
