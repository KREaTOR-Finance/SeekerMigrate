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
import {
  SeekerNameService,
  VanityWalletGenerator,
  SEEKER_DAPP_INFO,
  SEEKER_NAME_TLDS,
  VANITY_MAX_CHARS,
} from './services/index.js';

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

// ============================================
// SEEKER dAPP Services Commands
// ============================================

// Services info command
program
  .command('services')
  .description('List available SEEKER dAPP services')
  .action(() => {
    console.log('');
    console.log(chalk.bold.magenta('🔮 SEEKER dAPP Services'));
    console.log(chalk.gray('Available services on Solana Mobile'));
    console.log('');

    for (const service of SEEKER_DAPP_INFO.services) {
      const statusColor = service.status === 'active' ? chalk.green : chalk.yellow;
      const offlineIcon = service.offlineCapable ? '📱' : '🌐';
      console.log(chalk.cyan(`  ${offlineIcon} ${service.name}`));
      console.log(chalk.gray(`     ${service.description}`));
      console.log(chalk.gray(`     Status: ${statusColor(service.status)}`));
      console.log('');
    }
  });

// Name Service commands
const nameCommand = program
  .command('name')
  .description('Seeker Name Service - register .skr, .Seeker, .Seismic names');

nameCommand
  .command('lookup <name>')
  .description('Lookup a Seeker name (e.g., alice.skr)')
  .action(async (name: string) => {
    const spinner = ora(`Looking up ${name}...`).start();
    const service = new SeekerNameService();

    try {
      const result = await service.lookup(name);

      if (result.exists && result.record) {
        spinner.succeed(`Found: ${name}`);
        console.log('');
        console.log(chalk.cyan('  Name Record:'));
        console.log(chalk.white(`    Full Name: ${result.record.fullName}`));
        console.log(chalk.white(`    Owner: ${result.record.owner}`));
        console.log(chalk.white(`    Resolves to: ${result.record.resolvedAddress}`));
        console.log(chalk.gray(`    Registered: ${new Date(result.record.registeredAt).toLocaleDateString()}`));
      } else {
        spinner.info(`Name "${name}" is ${result.status}`);
      }
    } catch (error) {
      spinner.fail('Lookup failed');
      console.error(chalk.red('Error:'), error);
    }
    console.log('');
  });

nameCommand
  .command('check <name>')
  .description('Check if a name is available')
  .option('-t, --tld <tld>', 'TLD to check (.skr, .Seeker, .Seismic)', '.skr')
  .action(async (name: string, options: { tld: string }) => {
    const tld = options.tld as typeof SEEKER_NAME_TLDS[number];

    if (!SEEKER_NAME_TLDS.includes(tld as any)) {
      console.error(chalk.red(`Invalid TLD: ${tld}. Valid options: ${SEEKER_NAME_TLDS.join(', ')}`));
      return;
    }

    const spinner = ora(`Checking availability of ${name}${tld}...`).start();
    const service = new SeekerNameService();

    try {
      const validation = service.validateName(name, tld as any);
      if (!validation.valid) {
        spinner.fail(`Invalid name: ${validation.error}`);
        return;
      }

      const result = await service.checkAvailability(name, tld as any);

      if (result.status === 'available') {
        spinner.succeed(chalk.green(`${name}${tld} is available!`));

        // Show pricing
        const price = service.getRegistrationPrice(name, tld as any, 1);
        console.log('');
        console.log(chalk.cyan('  Registration Price:'));
        console.log(chalk.white(`    ${price.priceSOL} SOL / year`));
        console.log(chalk.gray(`    (~$${price.priceUSD.toFixed(2)} USD)`));
      } else {
        spinner.warn(chalk.yellow(`${name}${tld} is ${result.status}`));
      }
    } catch (error) {
      spinner.fail('Check failed');
      console.error(chalk.red('Error:'), error);
    }
    console.log('');
  });

nameCommand
  .command('register <name>')
  .description('Register a new Seeker name')
  .option('-t, --tld <tld>', 'TLD (.skr, .Seeker, .Seismic)', '.skr')
  .option('-o, --owner <pubkey>', 'Owner public key (required)')
  .option('-y, --years <number>', 'Registration duration in years', '1')
  .action(async (name: string, options: { tld: string; owner?: string; years: string }) => {
    const tld = options.tld as typeof SEEKER_NAME_TLDS[number];

    if (!options.owner) {
      console.error(chalk.red('Error: Owner public key is required (--owner)'));
      return;
    }

    const spinner = ora(`Registering ${name}${tld}...`).start();
    const service = new SeekerNameService();

    try {
      const result = await service.register({
        name,
        tld: tld as any,
        owner: options.owner,
        durationYears: parseInt(options.years, 10),
      });

      if (result.success && result.record) {
        spinner.succeed(chalk.green(`Registered ${result.record.fullName}`));
        console.log('');
        console.log(chalk.cyan('  Name registered successfully!'));
        console.log(chalk.white(`    Full Name: ${result.record.fullName}`));
        console.log(chalk.white(`    Owner: ${result.record.owner}`));
        if (result.transactionSignature) {
          console.log(chalk.gray(`    Tx: ${result.transactionSignature}`));
        }
      } else {
        spinner.fail(chalk.red(`Registration failed: ${result.error}`));
      }
    } catch (error) {
      spinner.fail('Registration failed');
      console.error(chalk.red('Error:'), error);
    }
    console.log('');
  });

nameCommand
  .command('info')
  .description('Show Name Service information')
  .action(() => {
    const service = new SeekerNameService();
    const info = service.getServiceInfo();

    console.log('');
    console.log(chalk.bold.magenta('🏷️  Seeker Name Service'));
    console.log(chalk.gray(`Version: ${info.version}`));
    console.log('');
    console.log(chalk.cyan('Supported TLDs:'));
    for (const tld of info.supportedTLDs) {
      console.log(chalk.white(`  • ${tld}`));
    }
    console.log('');
    console.log(chalk.cyan('Features:'));
    for (const feature of info.features) {
      console.log(chalk.gray(`  • ${feature}`));
    }
    console.log('');
  });

// Vanity Wallet Generator commands
const vanityCommand = program
  .command('vanity')
  .description('Vanity Wallet Generator - create custom wallet addresses');

vanityCommand
  .command('generate <pattern>')
  .description('Generate a vanity wallet with custom prefix or suffix')
  .option('-m, --mode <mode>', 'Match mode: prefix or suffix (not both)', 'prefix')
  .option('-i, --case-insensitive', 'Case insensitive matching', false)
  .option('--max-attempts <number>', 'Maximum attempts (0 = unlimited)', '1000000')
  .action(async (pattern: string, options: { mode: string; caseInsensitive: boolean; maxAttempts: string }) => {
    const mode = options.mode as 'prefix' | 'suffix';

    if (mode !== 'prefix' && mode !== 'suffix') {
      console.error(chalk.red(`Invalid mode: ${mode}. Use 'prefix' or 'suffix'`));
      return;
    }

    if (pattern.length > VANITY_MAX_CHARS) {
      console.error(chalk.red(`Pattern too long. Maximum ${VANITY_MAX_CHARS} characters.`));
      return;
    }

    const generator = new VanityWalletGenerator();
    const validation = generator.validatePattern(pattern, mode);

    if (!validation.valid) {
      console.error(chalk.red(`Invalid pattern: ${validation.error}`));
      return;
    }

    console.log('');
    console.log(chalk.bold.magenta('💎 Vanity Wallet Generator'));
    console.log(chalk.gray('Generating locally on your device...'));
    console.log('');
    console.log(chalk.cyan('  Pattern:'), chalk.white(pattern));
    console.log(chalk.cyan('  Mode:'), chalk.white(mode));
    console.log(chalk.cyan('  Difficulty:'), chalk.yellow(validation.difficulty));
    console.log(chalk.cyan('  Est. attempts:'), chalk.white(validation.estimatedAttempts.toLocaleString()));
    console.log(chalk.cyan('  Est. time:'), chalk.white(generator.formatTimeEstimate(validation.estimatedTimeSeconds)));
    console.log('');

    const spinner = ora('Generating vanity wallet...').start();
    let lastProgress = 0;

    try {
      const result = await generator.generate({
        pattern,
        mode,
        caseSensitive: !options.caseInsensitive,
        maxAttempts: parseInt(options.maxAttempts, 10),
        onProgress: (progress) => {
          if (progress.attempts - lastProgress >= 10000) {
            spinner.text = `Generating... ${progress.attempts.toLocaleString()} attempts (${progress.keysPerSecond}/sec)`;
            lastProgress = progress.attempts;
          }
        },
      });

      if (result.success && result.keypair) {
        spinner.succeed(chalk.green(`Found vanity wallet after ${result.attempts.toLocaleString()} attempts!`));
        console.log('');
        console.log(chalk.cyan('  Public Key (Address):'));
        console.log(chalk.white(`    ${result.keypair.publicKey}`));
        console.log('');
        console.log(chalk.cyan('  Private Key (KEEP SECRET!):'));
        console.log(chalk.yellow(`    ${result.keypair.secretKey.slice(0, 32)}...`));
        console.log('');
        console.log(chalk.gray(`  Time: ${(result.elapsedMs / 1000).toFixed(2)}s`));
        console.log('');
        console.log(chalk.bgRed.white(' ⚠️  IMPORTANT: Save your private key securely! It cannot be recovered! '));
      } else {
        spinner.fail(chalk.yellow(`Generation stopped: ${result.error}`));
        console.log(chalk.gray(`  Attempts made: ${result.attempts.toLocaleString()}`));
      }
    } catch (error) {
      spinner.fail('Generation failed');
      console.error(chalk.red('Error:'), error);
    }
    console.log('');
  });

vanityCommand
  .command('estimate <pattern>')
  .description('Estimate difficulty for a vanity pattern')
  .option('-m, --mode <mode>', 'Match mode: prefix or suffix', 'prefix')
  .option('-i, --case-insensitive', 'Case insensitive matching', false)
  .action((pattern: string, options: { mode: string; caseInsensitive: boolean }) => {
    const mode = options.mode as 'prefix' | 'suffix';
    const generator = new VanityWalletGenerator();
    const validation = generator.validatePattern(pattern, mode);

    console.log('');
    console.log(chalk.bold.magenta('💎 Vanity Pattern Estimate'));
    console.log('');

    if (!validation.valid) {
      console.log(chalk.red(`Invalid pattern: ${validation.error}`));
      return;
    }

    console.log(chalk.cyan('  Pattern:'), chalk.white(pattern));
    console.log(chalk.cyan('  Mode:'), chalk.white(mode));
    console.log(chalk.cyan('  Case Sensitive:'), chalk.white(!options.caseInsensitive ? 'Yes' : 'No'));
    console.log('');
    console.log(chalk.cyan('  Difficulty:'), chalk.yellow(validation.difficulty.toUpperCase()));
    console.log(chalk.cyan('  Expected Attempts:'), chalk.white(validation.estimatedAttempts.toLocaleString()));
    console.log(chalk.cyan('  Estimated Time:'), chalk.white(generator.formatTimeEstimate(validation.estimatedTimeSeconds)));
    console.log('');
    console.log(chalk.gray(`  ${generator.getDifficultyDescription(validation.difficulty)}`));
    console.log('');
  });

vanityCommand
  .command('info')
  .description('Show Vanity Wallet Generator information')
  .action(() => {
    const generator = new VanityWalletGenerator();
    const info = generator.getServiceInfo();

    console.log('');
    console.log(chalk.bold.magenta('💎 Vanity Wallet Generator'));
    console.log(chalk.gray(`Version: ${info.version}`));
    console.log('');
    console.log(chalk.cyan('Configuration:'));
    console.log(chalk.white(`  • Max pattern length: ${info.maxPatternLength} characters`));
    console.log(chalk.white(`  • Modes: ${info.supportedModes.join(', ')}`));
    console.log('');
    console.log(chalk.cyan('Features:'));
    for (const feature of info.features) {
      console.log(chalk.gray(`  • ${feature}`));
    }
    console.log('');
    console.log(chalk.cyan('Security:'));
    for (const note of info.securityNotes) {
      console.log(chalk.green(`  ✓ ${note}`));
    }
    console.log('');
  });

// Parse and run
program.parse();
