import * as anchor from '@project-serum/anchor';
import {Program, Idl} from '@project-serum/anchor';
import {PublicKey, SystemProgram} from '@solana/web3.js';
import {Chain} from '../../target/types/chain';
import {expect} from 'chai';

import {
  getPublicKeyForSeed,
  getAddressFromToml,
  derivePDAFromBlockId,
  encodeBlockRoot,
  decodeBlockRoot,
} from '../utils';

const provider: anchor.AnchorProvider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

describe('verify', async () => {

  let program: Program<Chain | Idl>,
    programId: PublicKey;

  const createBlock = async (blockId: number, blockRoot: string, timestamp: number): Promise<[PublicKey, Buffer]> => {
    const [blockPda, seed] = await derivePDAFromBlockId(
      blockId,
      program.programId
    );

    const [
      authorityPda,
      statusPda,
    ] = await getStateStructPDAs(programId);

    await program.methods.submit(
      seed,
      blockId,
      encodeBlockRoot(blockRoot),
      timestamp)
      .accounts(
        {
          owner: provider.wallet.publicKey,
          authority: authorityPda,
          block: blockPda,
          status: statusPda,
          systemProgram: SystemProgram.programId,
        })
      .rpc({ commitment: "confirmed" });

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

  it('deploys new program', async() => {
    program = anchor.workspace.Chain as Program<Chain>;
    programId = program.programId;
    expect(!!program).to.equal(true);
    expect(programId.toBase58()).to.equal(getAddressFromToml('chain'));
  });

  it('initialize `VerifyResult` account', async () => {
    await program.rpc.initializeVerifyResult(
      {
        accounts: {
          verifyResult: verifyResultAccount.publicKey,
          user: provider.wallet.publicKey,
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

    expect(decodeBlockRoot((await program.account.block.fetch(blockPda)).root))
      .to.equal('0x94ee327959d93a3cec35639bac830d5dc37c0f20ecd0e9cfa47b59d6829de605');
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
      '0xff3a1d60902efa015c36f653c5d28e0b4a13bc5bdb8944b218fe2f6f6272b87a',
      1651641200
    );

    let proofs = [
      Buffer.from("0x8aa4e4134178289504b4b6c7c85527b41905cf3d51ad95eaec44a87fbe773b82".slice(2), "hex"),
      Buffer.from("0x2555c92539183bfa28387c6e98403aeb44f8b7602d0580e4679f2432405b62b1".slice(2), "hex"),
      Buffer.from("0x6bb2d161e2d374a8aa779e0c61ecef7e82b7a6ba6543bf997212ea164c7ec540".slice(2), "hex"),
      Buffer.from("0xe3cd6c525d52487eb7439d1042dbd917a9b421fd2656a98a6f8af593fd4f4453".slice(2), "hex"),
      Buffer.from("0x39afef9403f6ccd794a1bf6c48a55a0d4164d8ab9f32992410f62629bd57a6b7".slice(2), "hex"),
      Buffer.from("0x72d0fddd950ac6ce7f54a48d4003843d526ee02fc21d8c305012bdd17f7058af".slice(2), "hex"),
      Buffer.from("0xfb1199eb1639a574b06bd4f2fc619a9004fb55dd9016c6b24c4c79498a24099f".slice(2), "hex"),
      Buffer.from("0xfa9e1fb3aa77f7249c18bd4dbd99bd9c3766a6bf6ab00eac7d5380732059566a".slice(2), "hex"),
      Buffer.from("0x81b18433beaada4ee9a058a3eb1580498a61789809abb60517ec0ca5e0bcf948".slice(2), "hex"),
      Buffer.from("0xa8440a4bf999006045d796a91e23fec4b23eee861ba9735d41dc804a76ae0643".slice(2), "hex"),
      Buffer.from("0xdcec74631415edf80085bdb0907dfb4dd6928db21ebe31b201b1c61cd5a6b412".slice(2), "hex"),
      Buffer.from("0xe1c181e05f242407fcce79feb83cad315d8d86e5d668f8fa8586d92f7eab082e".slice(2), "hex"),
    ]

    let key   = Buffer.from("0x000000000000000000000000000000000000000000000031494e43482d444149".slice(2), "hex");
    let value = Buffer.from("0x000000000000000000000000000000000000000000000000259ae7ce85275000".slice(2), "hex");

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
      '0xff3a1d60902efa015c36f653c5d28e0b4a13bc5bdb8944b218fe2f6f6272b87a',
      1651642200
    );

    let proofs = [
      Buffer.from("0x8aa4e4134178289504b4b6c7c85527b41905cf3d51ad95eaec44a87fbe773b82".slice(2), "hex"),
      Buffer.from("0x2555c92539183bfa28387c6e98403aeb44f8b7602d0580e4679f2432405b62b1".slice(2), "hex"),
      Buffer.from("0x6bb2d161e2d374a8aa779e0c61ecef7e82b7a6ba6543bf997212ea164c7ec540".slice(2), "hex"),
      Buffer.from("0xe3cd6c525d52487eb7439d1042dbd917a9b421fd2656a98a6f8af593fd4f4453".slice(2), "hex"),
      Buffer.from("0x39afef9403f6ccd794a1bf6c48a55a0d4164d8ab9f32992410f62629bd57a6b7".slice(2), "hex"),
      Buffer.from("0x72d0fddd950ac6ce7f54a48d4003843d526ee02fc21d8c305012bdd17f7058af".slice(2), "hex"),
      Buffer.from("0xfb1199eb1639a574b06bd4f2fc619a9004fb55dd9016c6b24c4c79498a24099f".slice(2), "hex"),
      Buffer.from("0xfa9e1fb3aa77f7249c18bd4dbd99bd9c3766a6bf6ab00eac7d5380732059566a".slice(2), "hex"),
      Buffer.from("0x81b18433beaada4ee9a058a3eb1580498a61789809abb60517ec0ca5e0bcf948".slice(2), "hex"),
      Buffer.from("0xa8440a4bf999006045d796a91e23fec4b23eee861ba9735d41dc804a76ae0643".slice(2), "hex"),
      Buffer.from("0xdcec74631415edf80085bdb0907dfb4dd6928db21ebe31b201b1c61cd5a6b412".slice(2), "hex"),
      Buffer.from("0xdeadbeaf5f242407fcce79feb83cad315d8d86e5d668f8fa8586d92f7eab082e".slice(2), "hex"),
    ];

    let key   = Buffer.from("0x000000000000000000000000000000000000000000000031494e43482d444149".slice(2), "hex");
    let value = Buffer.from("0x000000000000000000000000000000000000000000000000259ae7ce85275000".slice(2), "hex");

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
      '0xdeadbeaf902efa015c36f653c5d28e0b4a13bc5bdb8944b218fe2f6f6272b87a',
      1651643200
    );

    let proofs = [
      Buffer.from("0x8aa4e4134178289504b4b6c7c85527b41905cf3d51ad95eaec44a87fbe773b82".slice(2), "hex"),
      Buffer.from("0x2555c92539183bfa28387c6e98403aeb44f8b7602d0580e4679f2432405b62b1".slice(2), "hex"),
      Buffer.from("0x6bb2d161e2d374a8aa779e0c61ecef7e82b7a6ba6543bf997212ea164c7ec540".slice(2), "hex"),
      Buffer.from("0xe3cd6c525d52487eb7439d1042dbd917a9b421fd2656a98a6f8af593fd4f4453".slice(2), "hex"),
      Buffer.from("0x39afef9403f6ccd794a1bf6c48a55a0d4164d8ab9f32992410f62629bd57a6b7".slice(2), "hex"),
      Buffer.from("0x72d0fddd950ac6ce7f54a48d4003843d526ee02fc21d8c305012bdd17f7058af".slice(2), "hex"),
      Buffer.from("0xfb1199eb1639a574b06bd4f2fc619a9004fb55dd9016c6b24c4c79498a24099f".slice(2), "hex"),
      Buffer.from("0xfa9e1fb3aa77f7249c18bd4dbd99bd9c3766a6bf6ab00eac7d5380732059566a".slice(2), "hex"),
      Buffer.from("0x81b18433beaada4ee9a058a3eb1580498a61789809abb60517ec0ca5e0bcf948".slice(2), "hex"),
      Buffer.from("0xa8440a4bf999006045d796a91e23fec4b23eee861ba9735d41dc804a76ae0643".slice(2), "hex"),
      Buffer.from("0xdcec74631415edf80085bdb0907dfb4dd6928db21ebe31b201b1c61cd5a6b412".slice(2), "hex"),
      Buffer.from("0xe1c181e05f242407fcce79feb83cad315d8d86e5d668f8fa8586d92f7eab082e".slice(2), "hex"),
    ];

    let key   = Buffer.from("0x000000000000000000000000000000000000000000000031494e43482d444149".slice(2), "hex");
    let value = Buffer.from("0x000000000000000000000000000000000000000000000000259ae7ce85275000".slice(2), "hex");

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
