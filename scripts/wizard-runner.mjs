#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

function log(msg) {
  process.stdout.write(msg + '\n');
}

function fail(msg) {
  process.stderr.write(`\nERROR: ${msg}\n`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed (${res.status})`);
  }
}

function runCapture(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed (${res.status})`);
  }
  return res.stdout ?? '';
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function findLatestApk(dir) {
  const apks = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(current, e.name);
      if (e.isDirectory()) stack.push(full);
      if (e.isFile() && e.name.endsWith('.apk')) {
        const stat = fs.statSync(full);
        apks.push({ path: full, mtime: stat.mtimeMs });
      }
    }
  }
  apks.sort((a, b) => b.mtime - a.mtime);
  return apks[0]?.path ?? null;
}

function writeFileIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
  }
}

const args = process.argv.slice(2);
const configIndex = args.indexOf('--config');
if (configIndex === -1) {
  fail('Usage: node scripts/wizard-runner.mjs --config ./seekermigrate.wizard.json');
}

const configPath = args[configIndex + 1];
if (!configPath) fail('Missing --config value');

if (!fs.existsSync(configPath)) fail(`Config not found: ${configPath}`);

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const projectPath = config.projectPath || '';
if (!projectPath) fail('config.projectPath is required');
if (!fs.existsSync(projectPath)) fail(`Project path not found: ${projectPath}`);

const buildVariant = config.buildVariant || 'dappStoreRelease';
const buildTask = buildVariant.startsWith('assemble') || buildVariant.startsWith('bundle')
  ? buildVariant
  : `assemble${capitalize(buildVariant)}`;

const isWin = process.platform === 'win32';
const gradlew = isWin ? 'gradlew.bat' : './gradlew';
const gradlewPath = path.join(projectPath, gradlew);
if (!fs.existsSync(gradlewPath)) {
  fail(`Gradle wrapper not found: ${gradlewPath}`);
}

const keystore = config.keystore || {};
const keystorePath = keystore.path || './keystores/dappstore.keystore';
const keystoreAlias = keystore.alias || 'dappstore';
const storePassword = keystore.storePassword || '';
const keyPassword = keystore.keyPassword || '';
const keystoreMode = keystore.mode || 'generate';

if (!storePassword || !keyPassword) {
  fail('Keystore storePassword and keyPassword are required in config');
}

const resolvedKeystorePath = path.isAbsolute(keystorePath)
  ? keystorePath
  : path.resolve(projectPath, keystorePath);

if (keystoreMode === 'generate') {
  if (!fs.existsSync(resolvedKeystorePath)) {
    log('Generating new keystore...');
    run('keytool', [
      '-genkey',
      '-v',
      '-keystore', resolvedKeystorePath,
      '-alias', keystoreAlias,
      '-keyalg', 'RSA',
      '-keysize', '2048',
      '-validity', '10000',
      '-storepass', storePassword,
      '-keypass', keyPassword,
      '-dname', 'CN=SeekerMigrate, OU=SeekerMigrate, O=SeekerMigrate, L=Unknown, S=Unknown, C=US',
    ], { cwd: projectPath });
  } else {
    log(`Keystore already exists: ${resolvedKeystorePath}`);
  }
} else {
  if (!fs.existsSync(resolvedKeystorePath)) {
    fail(`Keystore not found: ${resolvedKeystorePath}`);
  }
}

log(`Running Gradle task: ${buildTask}`);
run(gradlewPath, [buildTask], { cwd: projectPath });

const apkDir = path.join(projectPath, 'app', 'build', 'outputs', 'apk');
const latestApk = findLatestApk(apkDir);
if (!latestApk) fail(`No APK found under ${apkDir}`);

const outputDir = path.isAbsolute(config.outputDir)
  ? config.outputDir
  : path.resolve(projectPath, config.outputDir || './submission-pack');

fs.mkdirSync(outputDir, { recursive: true });
const outputApk = path.join(outputDir, 'app-release.apk');

log(`Signing APK: ${latestApk}`);
run('apksigner', [
  'sign',
  '--ks', resolvedKeystorePath,
  '--ks-key-alias', keystoreAlias,
  '--ks-pass', `pass:${storePassword}`,
  '--key-pass', `pass:${keyPassword}`,
  '--out', outputApk,
  latestApk,
], { cwd: projectPath });

log('Verifying APK signature...');
const signingInfo = runCapture('apksigner', ['verify', '--print-certs', outputApk], { cwd: projectPath });

const buildInfo = [
  `buildVariant=${buildVariant}`,
  `applicationId=${config.applicationId || ''}`,
  `baseApplicationId=${config.baseApplicationId || ''}`,
  `appIdSuffix=${config.appIdSuffix || ''}`,
  `sourceType=${config.sourceType || ''}`,
  `rails=${JSON.stringify(config.rails || {})}`,
  `includeSmnsSdk=${config.includeSmnsSdk ? 'true' : 'false'}`,
  `projectPath=${projectPath}`,
].join('\n');

const checklist = `Submission Pack Checklist\n\n- Signed APK: app-release.apk\n- Signing cert fingerprints: SIGNING.txt\n- Build metadata: BUILD.txt\n\nNext:\n1) Log into your verified Solana Mobile publisher account.\n2) Upload the APK.\n3) Use SIGNING.txt for fingerprint verification.\n`;

fs.writeFileSync(path.join(outputDir, 'SIGNING.txt'), signingInfo);
fs.writeFileSync(path.join(outputDir, 'BUILD.txt'), buildInfo);
fs.writeFileSync(path.join(outputDir, 'SUBMIT_CHECKLIST.md'), checklist);
writeFileIfMissing(path.join(outputDir, 'CONFIG.json'), JSON.stringify(config, null, 2));

log(`\nDone. Submission pack created at: ${outputDir}`);
