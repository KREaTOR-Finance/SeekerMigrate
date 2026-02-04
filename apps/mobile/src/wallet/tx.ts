import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  type TransactionSignature,
  type BlockhashWithExpiryBlockHeight,
  Connection,
} from '@solana/web3.js';

export type SerializedInstruction = {
  programId: string;
  keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  dataBase64: string;
};

export async function buildTransactionsFromInstructions(args: {
  instructions: SerializedInstruction[];
  feePayer: string;
  rpcUrl: string;
}): Promise<Transaction[]> {
  const feePayer = new PublicKey(args.feePayer);
  const connection = new Connection(args.rpcUrl, { commitment: 'confirmed' });

  const ix = args.instructions.map((instruction) =>
    new TransactionInstruction({
      programId: new PublicKey(instruction.programId),
      keys: instruction.keys.map((k) => ({
        pubkey: new PublicKey(k.pubkey),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: Buffer.from(instruction.dataBase64, 'base64'),
    })
  );

  // For now we group into a single transaction. If we ever return multiple instructions
  // that exceed size limits, we can chunk here.
  const blockhash: BlockhashWithExpiryBlockHeight = await connection.getLatestBlockhash('finalized');

  const tx = new Transaction({
    feePayer,
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
  });

  tx.add(...ix);
  return [tx];
}

export type SignAndSendResult = {
  signatures: TransactionSignature[];
};
