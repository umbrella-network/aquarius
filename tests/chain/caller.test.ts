import * as anchor from '@project-serum/anchor';
import {Program} from '@project-serum/anchor';
import {PublicKey, SystemProgram} from '@solana/web3.js';
import {Chain} from '../../target/types/chain';
import {Caller} from '../../target/types/caller';
import {expect} from 'chai';

import {
  getPublicKeyForSeed,
  getAddressFromToml,
  derivePDAFromBlockId,
  encodeBlockRoot,
} from '../utils';

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
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
  });

  const verifyResultAccount = anchor.web3.Keypair.generate();
  const confirmOptions = { commitment: "confirmed" };

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
      1338,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1651644200
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
      1339,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1651645200
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
      1340,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1651646200
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
      1341,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1651647200
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
      1342,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1651648200
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

});
