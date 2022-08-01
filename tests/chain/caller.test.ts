import * as anchor from '@project-serum/anchor';
import {Program} from '@project-serum/anchor';
import {PublicKey, SystemProgram} from '@solana/web3.js';
import {Chain} from '../../target/types/chain';
import {Caller} from '../../target/types/caller';
import {expect} from 'chai';

import {derivePDAFromFCDKey, createBlock, getAddressFromToml} from '../../scripts/utils';

const provider: anchor.AnchorProvider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

describe('caller', async () => {
  let callerProgram = anchor.workspace.Caller as Program<Caller>;
  let chainProgram = anchor.workspace.Chain as Program<Chain>;

  let provider;
  before(async () => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
  });

  const verifyResultAccount = anchor.web3.Keypair.generate();

  it('deploys new program `caller`', async () => {
    let programId = callerProgram.programId;
    expect(!!callerProgram).to.equal(true);
    expect(programId.toBase58()).to.equal(getAddressFromToml('caller'));
  });

  it('reads FCD on chain', async () => {
    /*
     This test executes the function on caller
     */
    const key = 'BTC-USD';
    const [fcdPda, seed] = await derivePDAFromFCDKey(key, chainProgram.programId);

    await callerProgram.methods
      .readFcd()
      .accounts({
        fcd: fcdPda,
      })
      .rpc({commitment: 'confirmed'});
  });

  it('initialize `VerifyResult` account', async () => {
    await chainProgram.methods
      .initializeVerifyResult()
      .accounts({
        verifyResult: verifyResultAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifyResultAccount])
      .rpc({commitment: 'confirmed'});
  });

  it('verifies off-chain the proof of a submitted block', async () => {
    const [blockPda, seed] = await createBlock(
      provider,
      chainProgram,
      1338,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1651644200,
    );

    const proofs = [
      Buffer.from('0x55747576547286b610e889628b275a282f0ee916319ef219a5cf51ff94ef9179'.slice(2), 'hex'),
      Buffer.from('0xe2ea0a050e929e24840f8d2f358b4811fc57830b37f825e2804cfe1d8739e68d'.slice(2), 'hex'),
      Buffer.from('0x4fc70ae8789647370c93beb224cbf9f61f38618ea38be23087fc2f070c0efaf3'.slice(2), 'hex'),
    ];

    const key = Buffer.from('0x4900000000000000000000000000000000000000000000000000000000000000'.slice(2), 'hex');
    const value = Buffer.from('0x5800000000000000000000000000000000000000000000000000000000000000'.slice(2), 'hex');

    const tx = await chainProgram.methods
      .verifyProofForBlock(seed, proofs, key, value)
      .accounts({
        verifyResult: verifyResultAccount.publicKey,
        block: blockPda,
      })
      .rpc({commitment: 'confirmed'});

    let result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == true);
  });

  it('verifies on-chain through CPI calls the proof of a submitted block', async () => {
    const [blockPda, seed] = await createBlock(
      provider,
      chainProgram,
      1339,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1651645200,
    );

    let result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false);

    let tx = await callerProgram.methods
      .cpiCallVerifyTrue(seed)
      .accounts({
        cpiReturn: verifyResultAccount.publicKey,
        cpiReturnProgram: chainProgram.programId,
        block: blockPda,
      })
      .rpc({commitment: 'confirmed'});

    result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == true);
  });

  it('fails to verify on-chain through CPI calls with tempered proofs', async () => {
    const [blockPda, seed] = await createBlock(
      provider,
      chainProgram,
      1340,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1651646200,
    );

    let result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false);

    let tx = await callerProgram.methods
      .cpiCallVerifyFalseTemperedProofs(seed)
      .accounts({
        cpiReturn: verifyResultAccount.publicKey,
        cpiReturnProgram: chainProgram.programId,
        block: blockPda,
      })
      .rpc({commitment: 'confirmed'});

    result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false);
  });

  it('fails to verify on-chain through CPI calls with tempered key', async () => {
    const [blockPda, seed] = await createBlock(
      provider,
      chainProgram,
      1341,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1651647200,
    );

    let result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false);

    let tx = await callerProgram.methods
      .cpiCallVerifyFalseTemperedKey(seed)
      .accounts({
        cpiReturn: verifyResultAccount.publicKey,
        cpiReturnProgram: chainProgram.programId,
        block: blockPda,
      })
      .rpc({commitment: 'confirmed'});

    result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false);
  });

  it('fails to verify on-chain through CPI calls with tempered value', async () => {
    const [blockPda, seed] = await createBlock(
      provider,
      chainProgram,
      1342,
      '0xb54bfd1e031ee84e0e78b2a41d388df4ae165d4fa968a53a97ce39a4f33ec4a1',
      1651648200,
    );

    let result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false);

    let tx = await callerProgram.methods
      .cpiCallVerifyFalseTemperedValue(seed)
      .accounts({
        cpiReturn: verifyResultAccount.publicKey,
        cpiReturnProgram: chainProgram.programId,
        block: blockPda,
      })
      .rpc({commitment: 'confirmed'});

    result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false);
  });

  it('verifies on-chain through CPI call passing proofs, key/value pair to caller', async () => {
    const [blockPda, seed] = await createBlock(
      provider,
      chainProgram,
      1343,
      '0xff3a1d60902efa015c36f653c5d28e0b4a13bc5bdb8944b218fe2f6f6272b87a',
      1651649200,
    );

    let proofs = [
      Buffer.from('0x8aa4e4134178289504b4b6c7c85527b41905cf3d51ad95eaec44a87fbe773b82'.slice(2), 'hex'),
      Buffer.from('0x2555c92539183bfa28387c6e98403aeb44f8b7602d0580e4679f2432405b62b1'.slice(2), 'hex'),
      Buffer.from('0x6bb2d161e2d374a8aa779e0c61ecef7e82b7a6ba6543bf997212ea164c7ec540'.slice(2), 'hex'),
      Buffer.from('0xe3cd6c525d52487eb7439d1042dbd917a9b421fd2656a98a6f8af593fd4f4453'.slice(2), 'hex'),
      Buffer.from('0x39afef9403f6ccd794a1bf6c48a55a0d4164d8ab9f32992410f62629bd57a6b7'.slice(2), 'hex'),
      Buffer.from('0x72d0fddd950ac6ce7f54a48d4003843d526ee02fc21d8c305012bdd17f7058af'.slice(2), 'hex'),
      Buffer.from('0xfb1199eb1639a574b06bd4f2fc619a9004fb55dd9016c6b24c4c79498a24099f'.slice(2), 'hex'),
      Buffer.from('0xfa9e1fb3aa77f7249c18bd4dbd99bd9c3766a6bf6ab00eac7d5380732059566a'.slice(2), 'hex'),
      Buffer.from('0x81b18433beaada4ee9a058a3eb1580498a61789809abb60517ec0ca5e0bcf948'.slice(2), 'hex'),
      Buffer.from('0xa8440a4bf999006045d796a91e23fec4b23eee861ba9735d41dc804a76ae0643'.slice(2), 'hex'),
      Buffer.from('0xdcec74631415edf80085bdb0907dfb4dd6928db21ebe31b201b1c61cd5a6b412'.slice(2), 'hex'),
      Buffer.from('0xe1c181e05f242407fcce79feb83cad315d8d86e5d668f8fa8586d92f7eab082e'.slice(2), 'hex'),
    ];

    let key = Buffer.from('0x000000000000000000000000000000000000000000000031494e43482d444149'.slice(2), 'hex');
    let value = Buffer.from('0x000000000000000000000000000000000000000000000000259ae7ce85275000'.slice(2), 'hex');

    let result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false);

    let tx = await callerProgram.methods
      .cpiCallVerifyProofForBlock(seed, proofs, key, value)
      .accounts({
        cpiReturn: verifyResultAccount.publicKey,
        cpiReturnProgram: chainProgram.programId,
        block: blockPda,
      })
      .rpc({commitment: 'confirmed'});

    result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == true);
  });

  it('fails to verify on-chain through CPI call passing tempered proofs, key/value pair to caller', async () => {
    const [blockPda, seed] = await createBlock(
      provider,
      chainProgram,
      1344,
      '0xff3a1d60902efa015c36f653c5d28e0b4a13bc5bdb8944b218fe2f6f6272b87a',
      1651650200,
    );

    let proofs = [
      Buffer.from('0x8aa4e4134178289504b4b6c7c85527b41905cf3d51ad95eaec44a87fbe773b82'.slice(2), 'hex'),
      Buffer.from('0x2555c92539183bfa28387c6e98403aeb44f8b7602d0580e4679f2432405b62b1'.slice(2), 'hex'),
      Buffer.from('0x6bb2d161e2d374a8aa779e0c61ecef7e82b7a6ba6543bf997212ea164c7ec540'.slice(2), 'hex'),
      Buffer.from('0xe3cd6c525d52487eb7439d1042dbd917a9b421fd2656a98a6f8af593fd4f4453'.slice(2), 'hex'),
      Buffer.from('0x39afef9403f6ccd794a1bf6c48a55a0d4164d8ab9f32992410f62629bd57a6b7'.slice(2), 'hex'),
      Buffer.from('0x72d0fddd950ac6ce7f54a48d4003843d526ee02fc21d8c305012bdd17f7058af'.slice(2), 'hex'),
      Buffer.from('0xfb1199eb1639a574b06bd4f2fc619a9004fb55dd9016c6b24c4c79498a24099f'.slice(2), 'hex'),
      Buffer.from('0xfa9e1fb3aa77f7249c18bd4dbd99bd9c3766a6bf6ab00eac7d5380732059566a'.slice(2), 'hex'),
      Buffer.from('0x81b18433beaada4ee9a058a3eb1580498a61789809abb60517ec0ca5e0bcf948'.slice(2), 'hex'),
      Buffer.from('0xa8440a4bf999006045d796a91e23fec4b23eee861ba9735d41dc804a76ae0643'.slice(2), 'hex'),
      Buffer.from('0xdcec74631415edf80085bdb0907dfb4dd6928db21ebe31b201b1c61cd5a6b412'.slice(2), 'hex'),
      Buffer.from('0xdeadbeaf5f242407fcce79feb83cad315d8d86e5d668f8fa8586d92f7eab082e'.slice(2), 'hex'),
    ];

    let key = Buffer.from('0x000000000000000000000000000000000000000000000031494e43482d444149'.slice(2), 'hex');
    let value = Buffer.from('0x000000000000000000000000000000000000000000000000259ae7ce85275000'.slice(2), 'hex');

    let result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false);

    let tx = await callerProgram.methods
      .cpiCallVerifyProofForBlock(seed, proofs, key, value)
      .accounts({
        cpiReturn: verifyResultAccount.publicKey,
        cpiReturnProgram: chainProgram.programId,
        block: blockPda,
      })
      .rpc({commitment: 'confirmed'});

    result = await chainProgram.account.verifyResult.fetch(verifyResultAccount.publicKey);
    expect(result.result == false);
  });
});
