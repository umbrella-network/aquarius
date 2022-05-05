import * as anchor from '@project-serum/anchor';
import {Program, Idl} from '@project-serum/anchor';
import {PublicKey, SystemProgram, Keypair} from '@solana/web3.js';
import {Chain} from '../../target/types/chain';
import {expect} from 'chai';

import {
  getPublicKeyForSeed,
  getAddressFromToml,
  derivePDAFromBlockId,
  encodeBlockRoot,
  decodeBlockRoot,
} from '../utils';

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

describe('verify', async () => {

  let program: Program<Chain | Idl>,
    programId: PublicKey,
    idl: Idl,
    blockId: number,
    blockRoot: string,
    timestamp: number;

  const createBlock = async (blockId: number, blockRoot: string, timestamp: number): Promise<[PublicKey, Buffer]> => {
    const [blockPda, seed] = await derivePDAFromBlockId(
      blockId,
      program.programId
    );

    const [
      authorityPda,
      statusPda,
    ] = await getStateStructPDAs(programId);

    await program.rpc.submit(
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

  const verifyResultAccount = anchor.web3.Keypair.generate();
  before(async () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    ({ blockId, blockRoot, timestamp } = getFirstBlockData());
  });

  it('deploys new program', async() => {
    program = anchor.workspace.Chain as Program<Chain>;
    programId = program.programId;
    idl = program.idl;
    expect(!!program).to.equal(true);
    expect(programId.toBase58()).to.equal(getAddressFromToml('chain'));
  });

  it('initialize `VerifyResult` account', async () => {
    await program.rpc.initializeVerifyResult(
      {
        accounts: {
          verifyResult: verifyResultAccount.publicKey,
          user: anchor.getProvider().wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [verifyResultAccount],
      });
  });

  it('creates block, using blockId to generate pda', async () => {
    const [blockPda, _] = await createBlock(
      1334,
      '0x94ee327959d93a3cec35639bac830d5dc37c0f20ecd0e9cfa47b59d6829de605',
      1651640200
    );

    expect(decodeBlockRoot((await program.account.block.fetch(blockPda)).root)).to.equal('0x94ee327959d93a3cec35639bac830d5dc37c0f20ecd0e9cfa47b59d6829de605');
    expect((await program.account.block.fetch(blockPda)).blockId).to.equal(1334);
    expect((await program.account.block.fetch(blockPda)).timestamp).to.equal(1651640200);
  });

  it('fails to create another block with the same information as the previous one', async () => {
    try {
      const [blockPda, _] = await createBlock(
        1334,
        '0x94ee327959d93a3cec35639bac830d5dc37c0f20ecd0e9cfa47b59d6829de605',
        1651640200
      );
    } catch (err) {
      expect(err.logs.find(log => log.includes("Allocate: account Address") && log.includes("already in use")) !== undefined);
    }
  });

  it('verifies the proof of a submitted block', async () => {
    const [blockPda, seed] = await createBlock(
      1335,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1651641200
    );

    const proofs = [
      encodeBlockRoot('0x55747576547286b610e889628b275a282f0ee916319ef219a5cf51ff94ef9179'),
      encodeBlockRoot('0xe2ea0a050e929e24840f8d2f358b4811fc57830b37f825e2804cfe1d8739e68d'),
      encodeBlockRoot('0x4fc70ae8789647370c93beb224cbf9f61f38618ea38be23087fc2f070c0efaf3'),
    ];

    const key = encodeBlockRoot('0x4900000000000000000000000000000000000000000000000000000000000000');
    const value = encodeBlockRoot('0x5800000000000000000000000000000000000000000000000000000000000000');

    const tx = await program.methods
      .verifyProofForBlock(seed, proofs, key, value)
      .accounts({
          verifyResult: verifyResultAccount.publicKey,
          block: blockPda,
        })
      .rpc({commitment: "confirmed"})

    let result = await program.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == true)
  });

  it('fails for false proofs', async () => {
    const [blockPda, seed] = await createBlock(
      1336,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1651642200
    );

    const proofs = [
      encodeBlockRoot('0xdeadbeaf547286b610e889628b275a282f0ee916319ef219a5cf51ff94ef9179'),
      encodeBlockRoot('0xe2ea0a050e929e24840f8d2f358b4811fc57830b37f825e2804cfe1d8739e68d'),
      encodeBlockRoot('0x4fc70ae8789647370c93beb224cbf9f61f38618ea38be23087fc2f070c0efaf3'),
    ];

    const key = encodeBlockRoot('0x4900000000000000000000000000000000000000000000000000000000000000');
    const value = encodeBlockRoot('0x5800000000000000000000000000000000000000000000000000000000000000');

    const tx = await program.methods
      .verifyProofForBlock(seed, proofs, key, value)
      .accounts({
          verifyResult: verifyResultAccount.publicKey,
          block: blockPda,
        })
      .rpc({commitment: "confirmed"})

    let result = await program.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false)
  });

  it('fails for a tempered block', async () => {
    const [blockPda, seed] = await createBlock(
      1337,
      '0xdeadbeef031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1651643200
    );

    const proofs = [
      encodeBlockRoot('0x55747576547286b610e889628b275a282f0ee916319ef219a5cf51ff94ef9179'),
      encodeBlockRoot('0xe2ea0a050e929e24840f8d2f358b4811fc57830b37f825e2804cfe1d8739e68d'),
      encodeBlockRoot('0x4fc70ae8789647370c93beb224cbf9f61f38618ea38be23087fc2f070c0efaf3'),
    ];

    const key = encodeBlockRoot('0x4900000000000000000000000000000000000000000000000000000000000000');
    const value = encodeBlockRoot('0x5800000000000000000000000000000000000000000000000000000000000000');

    const tx = await program.methods
      .verifyProofForBlock(seed, proofs, key, value)
      .accounts({
          verifyResult: verifyResultAccount.publicKey,
          block: blockPda,
        })
      .rpc({commitment: "confirmed"})

    let result = await program.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false)
  });
});
