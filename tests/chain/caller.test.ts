import * as anchor from '@project-serum/anchor';
import {Program, Idl, Wallet, Provider} from '@project-serum/anchor';
import {PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL} from '@solana/web3.js';
import {Chain} from '../../target/types/chain';
import {Caller} from '../../target/types/caller';
import {expect} from 'chai';

import {
  getPublicKeyForSeed,
  getAddressFromToml,
  derivePDAFromBlockId,
  derivePDAFromFCDKey,
  encodeBlockRoot,
  decodeBlockRoot,
  encodeDataValue,
  decodeDataValue,
} from '../utils';
import { assert } from 'console';

function getFirstBlockData() {
  const blockId = 343062;
  const blockRoot = '0xa875e64b4762d5a34bf3b0346829c407fa82eaedb67d41c6aa4a350800000000';
  const timestamp = 1647469325;
  return {
    blockId,
    blockRoot,
    timestamp,
  }
}

describe('caller', async () => {

  let callerProgram = anchor.workspace.Caller as Program<Caller>;
  let chainProgram = anchor.workspace.Chain as Program<Chain>;

  const createBlock = async (blockId: number, blockRoot: string, timestamp: number): Promise<[PublicKey, Buffer]> => {
    const [blockPda, seed] = await derivePDAFromBlockId(
      blockId,
      chainProgram.programId
    );

    const [
      authorityPda,
      statusPda,
    ] = await getStateStructPDAs(chainProgram.programId);

    // test
    const additionalAccount = Keypair.generate().publicKey;

    await chainProgram.rpc.submit(
      seed,
      blockId,
      encodeBlockRoot(blockRoot),
      timestamp,
      {
        accounts: {
          owner: anchor.getProvider().wallet.publicKey,
          authority: authorityPda,
          block: blockPda,
          status: statusPda,
          systemProgram: SystemProgram.programId,
        },
      },
    );

    return [
      blockPda,
      seed
    ]
  }

  const getStateStructPDAs = async (programIdArg) => {
    const authorityPda = await getPublicKeyForSeed(
      'authority',
      programIdArg
    );

    const statusPda = await getPublicKeyForSeed(
      'status',
      programIdArg
    );

    return [
      authorityPda,
      statusPda,
    ];
  }

  const getReturnLog = (confirmedTransaction) => {
    const prefix = "Program return: ";
    let log = confirmedTransaction.meta.logMessages.find((log) =>
      log.startsWith(prefix)
    );
    log = log.slice(prefix.length);
    const [key, data] = log.split(" ", 2);
    const buffer = Buffer.from(data, "base64");
    return [key, data, buffer];
  };

  let provider;
  before(async () => {
    provider = anchor.Provider.env();
    anchor.setProvider(provider);
  });

  const cpiReturn = anchor.web3.Keypair.generate();
  const verifyResultAccount = anchor.web3.Keypair.generate();
  const confirmOptions = { commitment: "confirmed" };

  it('deploys new program `chain`', async() => {
    let programId = chainProgram.programId;
    expect(!!chainProgram).to.equal(true);
    expect(programId.toBase58()).to.equal(getAddressFromToml('chain'));
  })

  it('initializes `chain` program', async () => {
    const padding = 10;

    const [
      authorityPda,
      statusPda,
    ] = await getStateStructPDAs(chainProgram.programId);

    await chainProgram.rpc.initialize(
      padding,
      {
        accounts: {
          initializer: anchor.getProvider().wallet.publicKey,
          authority: authorityPda,
          status: statusPda,
          systemProgram: SystemProgram.programId,
        },
      }
    );

    expect((await chainProgram.account.status.fetch(statusPda)).padding).to.equal(padding);
    expect((await chainProgram.account.status.fetch(statusPda)).lastId).to.equal(0);
    expect((await chainProgram.account.status.fetch(statusPda)).lastDataTimestamp).to.equal(0);
    expect((await chainProgram.account.status.fetch(statusPda)).nextBlockId).to.equal(0);

    expect(
      (await chainProgram.account.authority.fetch(authorityPda))
        .owner
        .toBase58()
    ).to.equal(
      anchor.getProvider()
        .wallet
        .publicKey
        .toBase58()
    );
  });

  it('deploys new program `caller`', async() => {
    let programId = callerProgram.programId;
    expect(!!callerProgram).to.equal(true);
    expect(programId.toBase58()).to.equal(getAddressFromToml('caller'));
  });

  it('initialize `VerifyResult` account', async () => {
    await chainProgram.rpc.initializeVerifyResult(
      {
        accounts: {
          verifyResult: verifyResultAccount.publicKey,
          user: anchor.getProvider().wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [verifyResultAccount],
      });
  });

  it('verifies off-chain the proof of a submitted block', async () => {
    const [blockPda, seed] = await createBlock(
      1235,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1234568
    );
    const proofs = [
      encodeBlockRoot('0x55747576547286b610e889628b275a282f0ee916319ef219a5cf51ff94ef9179'),
      encodeBlockRoot('0xe2ea0a050e929e24840f8d2f358b4811fc57830b37f825e2804cfe1d8739e68d'),
      encodeBlockRoot('0x4fc70ae8789647370c93beb224cbf9f61f38618ea38be23087fc2f070c0efaf3'),
    ]
    const key = encodeBlockRoot('0x4900000000000000000000000000000000000000000000000000000000000000');
    const value = encodeBlockRoot('0x5800000000000000000000000000000000000000000000000000000000000000');

    const tx = await chainProgram.methods
      .verifyProofForBlock(seed, proofs, key, value)
      .accounts({
          verifyResult: verifyResultAccount.publicKey,
          block: blockPda,
        })
      .rpc({commitment: "confirmed"})

    let result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == true)
  });

  it("verifies on-chain through CPI calls the proof of a submitted block", async () => {
    const [blockPda, seed] = await createBlock(
      1236,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1234569
    );

    let result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false)

    let tx = await callerProgram.methods
      .cpiCallVerifyTrue(seed)
      .accounts({
        cpiReturn: verifyResultAccount.publicKey,
        cpiReturnProgram: chainProgram.programId,
        block: blockPda,
      })
      .rpc(confirmOptions);
  
    result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == true)
  });

  it("fails to verify on-chain through CPI calls with tempered proofs", async () => {
    const [blockPda, seed] = await createBlock(
      1237,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1234570
    );

    let result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false)

    let tx = await callerProgram.methods
      .cpiCallVerifyFalseTemperedProofs(seed)
      .accounts({
        cpiReturn: verifyResultAccount.publicKey,
        cpiReturnProgram: chainProgram.programId,
        block: blockPda,
      })
      .rpc(confirmOptions);
  
    result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false)
  });

  it("fails to verify on-chain through CPI calls with tempered key", async () => {
    const [blockPda, seed] = await createBlock(
      1238,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1234571
    );

    let result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false)

    let tx = await callerProgram.methods
      .cpiCallVerifyFalseTemperedKey(seed)
      .accounts({
        cpiReturn: verifyResultAccount.publicKey,
        cpiReturnProgram: chainProgram.programId,
        block: blockPda,
      })
      .rpc(confirmOptions);
  
    result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false)
  });

  it("fails to verify on-chain through CPI calls with tempered value", async () => {
    const [blockPda, seed] = await createBlock(
      1239,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1234572
    );

    let result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false)

    let tx = await callerProgram.methods
      .cpiCallVerifyFalseTemperedValue(seed)
      .accounts({
        cpiReturn: verifyResultAccount.publicKey,
        cpiReturnProgram: chainProgram.programId,
        block: blockPda,
      })
      .rpc(confirmOptions);
  
    result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false)
  });

  //  console.log(tx);
  //  let t = await provider.connection.getTransaction(tx, {
  //    commitment: "confirmed",
  //  });
  //  console.log(t.meta.logMessages);

});