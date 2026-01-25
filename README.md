# SeekerMigrate Auth Bridge

A CLI tool that automatically converts a mobile app's **Firebase Email Authentication** to a **Solana Seeker/Solana Mobile Wallet Adapter** authentication flow.

## Overview

SeekerMigrate analyzes your React Native codebase, detects Firebase authentication patterns, and generates ready-to-use Solana wallet authentication components.

### Core Architecture

The system is built on three pillars:

1. **Universal App Model (UAM):** A JSON schema acting as an intermediary, framework-agnostic blueprint of the app's authentication feature.
2. **Conversion Rulebook:** A database of deterministic rules that map a source UAM pattern to a target implementation and template.
3. **Analyzer-Generator Engine:** The core Node.js/TypeScript program that performs static code analysis and synthesizes the new code.

## Installation

```bash
npm install -g seekermigrate
# or
npx seekermigrate
```

## Usage

### Basic Migration

Point the CLI at your React Native project directory:

```bash
npx seekermigrate auth --source ./my-firebase-app --target seeker
```

This will:
1. Analyze your codebase for Firebase authentication patterns
2. Generate Solana wallet authentication components
3. Create a detailed migration report

### Commands

#### `auth` - Migrate Authentication

```bash
seekermigrate auth --source <path> [options]
```

Options:
- `-s, --source <path>` - Path to source project directory (required)
- `-t, --target <ecosystem>` - Target ecosystem (default: seeker)
- `-o, --output <path>` - Output directory (default: ./seekermigrate-output)
- `--typescript` - Generate TypeScript files (default: true)
- `--no-typescript` - Generate JavaScript files
- `-v, --verbose` - Enable verbose output
- `--dry-run` - Analyze only, do not generate files

#### `analyze` - Analyze Only

```bash
seekermigrate analyze --source <path> [options]
```

Options:
- `-s, --source <path>` - Path to source project directory (required)
- `-v, --verbose` - Enable verbose output
- `--json` - Output results as JSON

## Example Output

After running the migration, you'll get:

```
seekermigrate-output/
├── WalletConnectButton.tsx    # Wallet connection UI component
├── WalletAuthContext.tsx      # Auth context replacing Firebase
├── SolanaWalletProvider.tsx   # Provider wrapper for your app
├── polyfills.js               # Required crypto polyfills
└── MIGRATION_REPORT.md        # Detailed migration instructions
```

## Supported Patterns

### Source (What We Detect)

- Firebase Email/Password authentication
- Firebase Auth imports (`firebase/auth`, `@react-native-firebase/auth`)
- Auth function calls (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, etc.)
- Login form UI patterns (email/password TextInputs, login buttons)

### Target (What We Generate)

- Solana Mobile Wallet Adapter integration
- Wallet connect button component
- Authentication context with wallet state
- Crypto polyfills for React Native
- Provider setup component

## Project Structure

```
seekermigrate/
├── src/
│   ├── cli.ts                 # Entry point, command logic
│   ├── analyzer/              # Code parsing & UAM creation
│   ├── rules/                 # JSON rulebook definitions
│   ├── generator/             # Template rendering and file writing
│   │   └── templates/         # Component templates
│   └── schema/                # TypeScript UAM interfaces
├── fixtures/                  # Sample apps for testing
└── dist/                      # Compiled output
```

## Development

### Building

```bash
npm install
npm run build
```

### Testing with Fixture

```bash
# Build the project
npm run build

# Run against the sample Firebase app
node dist/cli.js auth --source ./fixtures/sample-firebase-app --verbose
```

### Development Mode

```bash
npm run dev  # Watch mode
```

## Technology Stack

- **Language:** Node.js with TypeScript
- **Parsing:** `@babel/parser`, `@babel/traverse`
- **CLI Framework:** `commander`
- **Target SDK:** `@solana-mobile/wallet-adapter-mobile-ui`, `@solana/web3.js`
- **Build Tool:** `tsup`

## Migration Checklist

After running SeekerMigrate:

1. [ ] Review generated files in `seekermigrate-output/`
2. [ ] Read `MIGRATION_REPORT.md` for detailed instructions
3. [ ] Install new Solana packages
4. [ ] Add polyfills to app entry point
5. [ ] Wrap app with SolanaWalletProvider
6. [ ] Replace login screens with WalletConnectButton
7. [ ] Update user identification (email → publicKey)
8. [ ] Remove Firebase dependencies
9. [ ] Update backend to accept wallet signatures
10. [ ] Test with Solana Mobile Stack Simulator
11. [ ] Test on physical device with wallet app
12. [ ] Review Solana dApp Store compliance

## Behavioral Differences

When migrating from Firebase to wallet authentication:

| Aspect | Firebase | Solana Wallet |
|--------|----------|---------------|
| Identity | Email address | Wallet public key |
| Session | Server-managed | Wallet app manages |
| Password reset | Email link | Wallet recovery phrase |
| Multi-device | Automatic sync | Connect on each device |
| Verification | Email verification | Cryptographic signature |

## Resources

- [Solana Mobile Documentation](https://docs.solanamobile.com/)
- [Mobile Wallet Adapter](https://github.com/solana-mobile/mobile-wallet-adapter)
- [Solana dApp Store](https://dappstore.solanamobile.com/)
- [Seeker Device](https://docs.solanamobile.com/seeker)

## License

MIT
