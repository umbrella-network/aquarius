import * as anchor from '@project-serum/anchor';
import {PublicKey, Keypair, SystemProgram} from '@solana/web3.js';
import {utils, Program, Idl, AnchorProvider} from '@project-serum/anchor';
import {LeafValueCoder, LeafKeyCoder} from '@umb-network/toolbox';
import * as toml from 'toml';
import * as fs from 'fs';

import {Chain} from '../target/types/chain';

let anchorToml;

try {
  anchorToml = toml.parse(fs.readFileSync('./Anchor.toml', 'utf8'));
} catch (e) {
  anchorToml = toml.parse(fs.readFileSync('../Anchor.toml', 'utf8'));
}

export const getStateStructPDAs = async (programIdArg) => {
  const authorityPda = await getPublicKeyForSeed('authority', programIdArg);

  const statusPda = await getPublicKeyForSeed('status', programIdArg);

  return [authorityPda, statusPda];
};

export async function createBlock(
  provider: AnchorProvider,
  chainProgram: Program<Chain | Idl>,
  blockId: number,
  blockRoot: string,
  timestamp: number,
): Promise<[PublicKey, Buffer]> {
  const [blockPda, seed] = await derivePDAFromBlockId(blockId, chainProgram.programId);

  const [authorityPda, statusPda] = await getStateStructPDAs(chainProgram.programId);

  await chainProgram.methods
    .submit(seed, blockId, encodeBlockRoot(blockRoot), timestamp)
    .accounts({
      owner: provider.wallet.publicKey,
      authority: authorityPda,
      block: blockPda,
      status: statusPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc({commitment: 'confirmed'});

  return [blockPda, seed];
}

export async function createFCD(
  provider: AnchorProvider,
  chainProgram: Program<Chain | Idl>,
  key: string,
  value: number | string,
  timestamp: number,
): Promise<[PublicKey, Buffer]> {
  const [fcdPda, seed] = await derivePDAFromFCDKey(key, chainProgram.programId);

  const [authorityPda] = await getStateStructPDAs(chainProgram.programId);

  await chainProgram.methods
    .initializeFirstClassData(seed, key, encodeDataValue(value, key), timestamp)
    .accounts({
      owner: provider.wallet.publicKey,
      authority: authorityPda,
      fcd: fcdPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc({commitment: 'confirmed'});

  return [fcdPda, seed];
}

export async function updateFCD(
  provider: AnchorProvider,
  chainProgram: Program<Chain | Idl>,
  key: string,
  value: number | string,
  timestamp: number,
): Promise<PublicKey> {
  const [fcdPda, _] = await derivePDAFromFCDKey(key, chainProgram.programId);

  const [authorityPda, statusPda] = await getStateStructPDAs(chainProgram.programId);

  await chainProgram.methods
    .updateFirstClassData(key, encodeDataValue(value, key), timestamp)
    .accounts({
      owner: provider.wallet.publicKey,
      authority: authorityPda,
      fcd: fcdPda,
      status: statusPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc({commitment: 'confirmed'});

  return fcdPda;
}

const getReturnLog = (confirmedTransaction) => {
  const prefix = 'Program return: ';

  let log = confirmedTransaction.meta.logMessages.find((log) => log.startsWith(prefix));

  log = log.slice(prefix.length);
  const [key, data] = log.split(' ', 2);
  const buffer = Buffer.from(data, 'base64');
  return [key, data, buffer];
};

// =====================================================================================================================
//  deriving addresses
// =====================================================================================================================

export async function derivePDAFromBlockId(blockId: number, programId: PublicKey): Promise<[PublicKey, Buffer]> {
  const seed: Buffer = LeafValueCoder.encode(blockId, '');

  const [publicKey] = await derivePDAFromSeed(seed, programId);

  return [publicKey, seed];
}

export async function derivePDAFromFCDKey(key: string, programId: PublicKey): Promise<[PublicKey, Buffer]> {
  const seed: Buffer = LeafKeyCoder.encode(key);

  const [publicKey] = await derivePDAFromSeed(seed, programId);

  return [publicKey, seed];
}

export function derivePDAFromSeed(seed: Buffer, programId: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress([seed], programId);
}

// =====================================================================================================================
//  encoding / decoding
// =====================================================================================================================

export function encodeBlockRoot(root: string): Buffer {
  return root.startsWith('0x') ? Buffer.from(root.slice(2), 'hex') : Buffer.from(root, 'hex');
}

export function decodeBlockRoot(encodedRoot: number[]): string {
  return prepend0x(Buffer.from(encodedRoot).toString('hex'));
}

export function encodeDataValue(value: string | number, key: string): Buffer {
  return LeafValueCoder.encode(value, key);
}

export function decodeDataValue(encodedValue: number[], key: string): number | string {
  return LeafValueCoder.decode(prepend0x(Buffer.from(encodedValue).toString('hex')), key);
}

// =====================================================================================================================

export async function getPublicKeyForSeed(seed: string, programId: PublicKey): Promise<PublicKey> {
  const [publicKey, _] = await PublicKey.findProgramAddress([utils.bytes.utf8.encode(seed)], programId);

  return publicKey;
}

export async function getPublicKeyForString(seed: string, programId: PublicKey): Promise<[PublicKey, Buffer]> {
  const bufSeed: Buffer = LeafKeyCoder.encode(seed);

  const [publicKey] = await derivePDAFromSeed(bufSeed, programId);

  return [publicKey, bufSeed];
}

export function getKeyPairFromSecretKeyString(secretKey: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secretKey)));
}

export function getAddressFromToml(programName) {
  return anchorToml['programs']['localnet'][programName];
}

export const prepend0x = (v: string): string => (['0X', '0x'].includes(v.slice(0, 2)) ? v : `0x${v ? v : '0'}`);
