import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

export type MwaSession = {
  publicKey: string;
  authToken: string;
};

const IDENTITY = {
  name: 'SeekerMigrate',
  uri: 'https://seekermigrate.com',
  // icon is optional; some wallets use it.
  icon: 'https://seekermigrate.com/favicon.png',
};

export async function connectWithMwa(opts?: {
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet';
  authToken?: string | null;
}): Promise<MwaSession> {
  const cluster = opts?.cluster ?? 'mainnet-beta';

  return transact(async (wallet) => {
    // authorize() returns snake_case fields.
    type AuthResult = Readonly<{
      accounts: Array<{ address: string }>;
      auth_token: string;
    }>;

    let result: AuthResult;

    if (opts?.authToken) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = (await (wallet as any).reauthorize({ identity: IDENTITY, auth_token: opts.authToken })) as AuthResult;
      } catch {
        result = (await wallet.authorize({ cluster, identity: IDENTITY })) as AuthResult;
      }
    } else {
      result = (await wallet.authorize({ cluster, identity: IDENTITY })) as AuthResult;
    }

    const pk = result.accounts?.[0]?.address;
    if (!pk) throw new Error('Wallet returned no account');

    return { publicKey: pk, authToken: result.auth_token };
  });
}

export async function signMessageWithMwa(args: {
  authToken?: string | null;
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet';
  message: Uint8Array;
}): Promise<{ signedMessage: Uint8Array; signature: Uint8Array }> {
  const cluster = args.cluster ?? 'mainnet-beta';

  return transact(async (wallet) => {
    if (args.authToken) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (wallet as any).reauthorize({ identity: IDENTITY, auth_token: args.authToken });
      } catch {
        await wallet.authorize({ cluster, identity: IDENTITY });
      }
    } else {
      await wallet.authorize({ cluster, identity: IDENTITY });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await (wallet as any).signMessages({
      payloads: [args.message],
    })) as { signed_payloads: Uint8Array[]; signatures: Uint8Array[] };

    return {
      signedMessage: result.signed_payloads?.[0] ?? args.message,
      signature: result.signatures?.[0] ?? new Uint8Array(),
    };
  });
}

export async function signAndSendWithMwa(args: {
  authToken?: string | null;
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet';
  transactions: import('@solana/web3.js').Transaction[];
  options?: {
    minContextSlot?: number;
    skipPreflight?: boolean;
    maxRetries?: number;
    waitForCommitmentToSendNextTransaction?: boolean;
    commitment?: string;
  };
}): Promise<{ signatures: string[] }> {
  const cluster = args.cluster ?? 'mainnet-beta';

  return transact(async (wallet) => {
    if (args.authToken) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (wallet as any).reauthorize({ identity: IDENTITY, auth_token: args.authToken });
      } catch {
        await wallet.authorize({ cluster, identity: IDENTITY });
      }
    } else {
      await wallet.authorize({ cluster, identity: IDENTITY });
    }

    const signatures = await wallet.signAndSendTransactions({
      ...(args.options ?? {}),
      transactions: args.transactions,
    });

    return { signatures };
  });
}
