import * as anchor from '@project-serum/anchor';
import {Program, Idl, Wallet, Provider} from '@project-serum/anchor';
import {PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL} from '@solana/web3.js';
import {Chain} from '../../target/types/chain';
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

    // test
    const additionalAccount = Keypair.generate().publicKey;

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

  const createFCD = async (
    key: string,
    value: number | string,
    timestamp: number
  ): Promise<[PublicKey, Buffer]> => {
    const [fcdPda, seed] = await derivePDAFromFCDKey(
      key,
      program.programId
    );

    const [
      authorityPda
    ] = await getStateStructPDAs(programId);

    await program.rpc.initializeFirstClassData(
      seed,
      key,
      encodeDataValue(value, key),
      timestamp,
      {
        accounts: {
          owner: anchor.getProvider().wallet.publicKey,
          authority: authorityPda,
          fcd: fcdPda,
          systemProgram: SystemProgram.programId,
        },
      },
    );

    return [
      fcdPda,
      seed
    ]
  }

  const updateFCD = async (
    key: string,
    value: number | string,
    timestamp: number
  ): Promise<PublicKey> => {
    const [fcdPda, _] = await derivePDAFromFCDKey(
      key,
      program.programId
    );

    const [
      authorityPda,
      statusPda,
    ] = await getStateStructPDAs(programId);

    await program.rpc.updateFirstClassData(
      key,
      encodeDataValue(value, key),
      timestamp,
      {
        accounts: {
          owner: anchor.getProvider().wallet.publicKey,
          authority: authorityPda,
          fcd: fcdPda,
          status: statusPda,
          systemProgram: SystemProgram.programId,
        },
      },
    );

    return fcdPda
  }

  const getDeployedProgram = () => {
    return new Program(
      idl,
      programId,
      anchor.getProvider()
    );
  }

  let blockAccount;
  before(async () => {
    anchor.setProvider(anchor.Provider.env());
    ({ blockId, blockRoot, timestamp } = getFirstBlockData());

    blockAccount = anchor.web3.Keypair.generate();
  });

  afterEach(async () => {
    anchor.setProvider(anchor.Provider.env());
    program = getDeployedProgram();
  });

  it('deploys new program', async() => {
    program = anchor.workspace.Chain as Program<Chain>;
    programId = program.programId;
    idl = program.idl;
    expect(!!program).to.equal(true);
    expect(programId.toBase58()).to.equal(getAddressFromToml('chain'));
  });

  it('fails to create a block before initialized', async () => {

    try {
      const [blockPda, _] = await createBlock(
        blockId,
        blockRoot,
        timestamp
      );
    } catch(err) {
      expect(err.toString().includes('expected this account to be already initialized')).to.equal(true);
    }
  });

  
  it('should fail to initialize from an unauthorized account', async () => {
    const newKeyPair = Keypair.generate();
    const newWallet = new Wallet(newKeyPair);

    const newProvider = new Provider(
      anchor.getProvider().connection,
      newWallet,
      anchor.getProvider().opts
    );

    anchor.setProvider(newProvider);
    program = getDeployedProgram();

    const airdropSignature = await newProvider.connection.requestAirdrop(
      newKeyPair.publicKey,
      LAMPORTS_PER_SOL * 2,
    );

    const [
      authorityPda,
      statusPda,
    ] = await getStateStructPDAs(programId);

    const padding = 10;

    await newProvider.connection.confirmTransaction(airdropSignature);
    try {
      await program.rpc.initialize(
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
    } catch(err) {
      // the error message will include the custom program error
      expect(err.toString().includes('NotInitializer')).to.equal(true);
    }
  });

  it('initializes program', async () => {
    const padding = 10;

    const [
      authorityPda,
      statusPda,
    ] = await getStateStructPDAs(programId);

    await program.rpc.initialize(
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

    expect((await program.account.status.fetch(statusPda)).padding).to.equal(padding);
    expect((await program.account.status.fetch(statusPda)).lastId).to.equal(0);
    expect((await program.account.status.fetch(statusPda)).lastDataTimestamp).to.equal(0);
    expect((await program.account.status.fetch(statusPda)).nextBlockId).to.equal(0);

    expect(
      (await program.account.authority.fetch(authorityPda))
        .owner
        .toBase58()
    ).to.equal(
      anchor.getProvider()
        .wallet
        .publicKey
        .toBase58()
    );
  });

  it('initialize block account', async () => {
    await program.rpc.initializeBlock(
      {
        accounts: {
          block: blockAccount.publicKey,
          user: anchor.getProvider().wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [blockAccount],
    });
  });
  
  it('computes a root hash', async () => {
    const proofs = [
      encodeBlockRoot('0x55747576547286b610e889628b275a282f0ee916319ef219a5cf51ff94ef9179'),
      encodeBlockRoot('0xe2ea0a050e929e24840f8d2f358b4811fc57830b37f825e2804cfe1d8739e68d'),
      encodeBlockRoot('0x4fc70ae8789647370c93beb224cbf9f61f38618ea38be23087fc2f070c0efaf3'),
    ]
    const leaf = encodeBlockRoot('0xa389b4c169ee8d98bb3e0e348bb71bc2de39c93d9effe49c4aeb232025d6d0c9');

    await program.rpc.computeRoot(
      proofs, leaf,
      {
      accounts: {
        block: blockAccount.publicKey,
      },
    });

    let block = await program.account.block.fetch(blockAccount.publicKey);

    expect(decodeBlockRoot(block.root)).to.equal('0x94ee327959d93a3cec35639bac830d5dc37c0f20ecd0e9cfa47b59d6829de606');
  });

/*
  it('should fail to initialize program again', async () => {
    const padding = 10;

    const [
      authorityPda,
      statusPda,
    ] = await getStateStructPDAs(programId);

    try {
      await program.rpc.initialize(
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
    } catch(err) {
      // this substring in the error message indicates that we tried to init an account the same address
      expect(err.toString().includes('Transaction simulation failed')).to.equal(true);
    }

    expect(
      (await program.account.authority.fetch(authorityPda))
        .owner
        .toBase58()
    ).to.equal(
      anchor.getProvider()
        .wallet
        .publicKey
        .toBase58()
    );
  });

  it('uses deployed program to check authority account values', async () => {
    const authorityPda = await getPublicKeyForSeed(
      'authority',
      program.programId
    );

    expect(
      (await program.account.authority.fetch(authorityPda))
        .owner
        .toBase58()
    ).to.equal(
      anchor.getProvider()
        .wallet
        .publicKey
        .toBase58()
    );
  });

  it('should fail to change owner without new owner signature', async () => {
    const newOwnerKeyPair = Keypair.generate();

    const authorityPda = await getPublicKeyForSeed(
      'authority',
      program.programId
    );

    try {
      await program.rpc.transferOwnership(
        {
          accounts: {
            owner: anchor.getProvider().wallet.publicKey,
            authority: authorityPda,
            newOwner: newOwnerKeyPair.publicKey,
            systemProgram: SystemProgram.programId,
          },
          //signers: [newOwnerKeyPair]
        },
      );
    } catch(err) {
      // this substring in the error message indicates that a signature is missing
      expect(err.toString().includes('Signature verification failed')).to.equal(true);
    }
  });

  it('should change owner', async () => {
    const newOwnerKeyPair = Keypair.generate();

    const authorityPda = await getPublicKeyForSeed(
      'authority',
      program.programId
    );

    await program.rpc.transferOwnership(
      {
        accounts: {
          owner: anchor.getProvider().wallet.publicKey,
          authority: authorityPda,
          newOwner: newOwnerKeyPair.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [newOwnerKeyPair]
      },
    );

    expect(
      (await program.account.authority.fetch(authorityPda))
        .owner
        .toBase58()
    ).to.equal(
      newOwnerKeyPair
        .publicKey
        .toBase58()
    );

    // change owner back
    await program.rpc.transferOwnership(
      {
        accounts: {
          owner: newOwnerKeyPair.publicKey,
          authority: authorityPda,
          newOwner:  anchor.getProvider().wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [newOwnerKeyPair]
      },
    );
  });

  it('should fail to change owner by unauthorized user', async () => {
    const unauthorizedKeyPair = Keypair.generate();
    const newOwnerKeyPair = Keypair.generate();

    const authorityPda = await getPublicKeyForSeed(
      'authority',
      program.programId
    );

    try {
      await program.rpc.transferOwnership(
        {
          accounts: {
            owner: unauthorizedKeyPair.publicKey,
            authority: authorityPda,
            newOwner: newOwnerKeyPair.publicKey,
            systemProgram: SystemProgram.programId,
          },
          signers: [unauthorizedKeyPair, newOwnerKeyPair]
        },
      );
    } catch(err) {
      // the error message will include the custom program error
      expect(err.toString().includes('OnlyOwnerViolation')).to.equal(true);
    }
  });

  it('creates block, using blockId to generate pda', async () => {
    const [blockPda, _] = await createBlock(
      blockId,
      blockRoot,
      timestamp
    );

    expect(
      decodeBlockRoot(
        (await program.account.block.fetch(blockPda)).root
      )
    ).to.equal(blockRoot);

    expect((await program.account.block.fetch(blockPda)).blockId).to.equal(blockId);
    expect((await program.account.block.fetch(blockPda)).timestamp).to.equal(timestamp);
  });

  it('uses deployed program to check block values, from generated block PDA', async () => {
    const deployedProgram = getDeployedProgram();
    const [blockPda, _] = await derivePDAFromBlockId(
      blockId,
      deployedProgram.programId
    );

    expect(
      decodeBlockRoot(
        (await program.account.block.fetch(blockPda)).root
      )
    ).to.equal(blockRoot);

    expect((await program.account.block.fetch(blockPda)).blockId).to.equal(blockId);
    expect((await program.account.block.fetch(blockPda)).timestamp).to.equal(timestamp);
  });

  it('uses deployed program to check chain-data values', async () => {
    const deployedProgram = getDeployedProgram();
    const statusPda = await getPublicKeyForSeed(
      'status',
      program.programId
    );

    expect((await deployedProgram.account.status.fetch(statusPda)).lastId).to.equal(blockId);
    expect((await deployedProgram.account.status.fetch(statusPda)).lastDataTimestamp).to.equal(timestamp);
    expect((await deployedProgram.account.status.fetch(statusPda)).nextBlockId).to.equal(blockId + 1);
  });

  const testBlocks = [
    // does not include blockRoot, as this does not update the blockData struct
    { _blockId: 343063, _timestamp: 1647469326 },
    { _blockId: 343064, _timestamp: 1647469427 },
    { _blockId: 343065, _timestamp: 1647469528 },
    { _blockId: 343070, _timestamp: 1647469629 },
  ];

  testBlocks.forEach(({_blockId, _timestamp}) => {
    it('create block and confirm block data struct is updated', async () => {
      const [blockPda, _] = await createBlock(
        _blockId,
        blockRoot,
        _timestamp
      );

      expect(
        decodeBlockRoot(
          (await program.account.block.fetch(blockPda)).root
        )
      ).to.equal(blockRoot);

      expect((await program.account.block.fetch(blockPda)).blockId).to.equal(_blockId);
      expect((await program.account.block.fetch(blockPda)).timestamp).to.equal(_timestamp);

      const statusPda = await getPublicKeyForSeed(
        'status',
        program.programId
      );

      expect((await program.account.status.fetch(statusPda)).lastId).to.equal(_blockId);
      expect((await program.account.status.fetch(statusPda)).lastDataTimestamp).to.equal(_timestamp);
      expect((await program.account.status.fetch(statusPda)).nextBlockId).to.equal(_blockId + 1);
    });
  });

  it('should fail to re-submit the same block', async () => {
    try {
      const [blockPda, _] = await createBlock(
        blockId,
        blockRoot,
        timestamp
      );
    } catch(err) {
      // this substring in the error message indicates that we tried to init an account the same address
      expect(err.toString().includes('Transaction simulation failed')).to.equal(true);
    }
  });

  it('should fail to submit an older block', async () => {
    try {
      const [blockPda, _] = await createBlock(
        343069,
        blockRoot,
        1647469619
      );
    } catch(err) {
      // the error message will include the custom program error
      expect(err.toString().includes('CannotSubmitOlderData')).to.equal(true);
    }
  });

  it('should fail to submit a block from a non-replicator keypair', async () => {
    const newKeyPair = Keypair.generate();
    const newWallet = new Wallet(newKeyPair);

    const newProvider = new Provider(
      anchor.getProvider().connection,
      newWallet,
      anchor.getProvider().opts
    );

    anchor.setProvider(newProvider);
    program = getDeployedProgram();

    const [blockPda, seed] = await derivePDAFromBlockId(
      343100,
      program.programId
    );

    const [
      authorityPda,
      statusPda,
    ] = await getStateStructPDAs(programId);

    const airdropSignature = await newProvider.connection.requestAirdrop(
      newKeyPair.publicKey,
      LAMPORTS_PER_SOL * 2,
    );

    await newProvider.connection.confirmTransaction(airdropSignature);

    try {
      await program.rpc.submit(
        seed,
        343100,
        encodeBlockRoot(blockRoot),
        1647469700,
        {
          accounts: {
            owner: newWallet.publicKey,
            authority: authorityPda,
            block: blockPda,
            status: statusPda,
            systemProgram: SystemProgram.programId,
          },
        }
      );
    } catch(err) {
      // the error message will include the custom program error
      expect(err.toString().includes('OnlyOwnerViolation')).to.equal(true);
    }
  });

  it('should set the padding', async () => {
    const [
      authorityPda,
      statusPda,
    ] = await getStateStructPDAs(programId);

    const newPadding = 300;

    await program.rpc.setPadding(
      newPadding,
      {
        accounts: {
          owner: anchor.getProvider().wallet.publicKey,
          authority: authorityPda,
          status: statusPda,
          systemProgram: SystemProgram.programId,
        },
      }
    );

    expect((await program.account.status.fetch(statusPda)).padding).to.equal(newPadding);
  });

  it('should fail to set padding by a non-replicator keypair', async () => {
    const newPadding = 1000;
    const newKeyPair = Keypair.generate();
    const newWallet = new Wallet(newKeyPair);

    const newProvider = new Provider(
      anchor.getProvider().connection,
      newWallet,
      anchor.getProvider().opts
    );

    anchor.setProvider(newProvider);
    program = getDeployedProgram();

    const [blockPda, seed] = await derivePDAFromBlockId(
      343100,
      program.programId
    );

    const [
      authorityPda,
      statusPda,
    ] = await getStateStructPDAs(programId);

    const oldPadding = (await program.account.status.fetch(statusPda)).padding

    const airdropSignature = await newProvider.connection.requestAirdrop(
      newKeyPair.publicKey,
      LAMPORTS_PER_SOL * 2,
    );

    await newProvider.connection.confirmTransaction(airdropSignature);

    try {
      await program.rpc.setPadding(
        newPadding,
        {
          accounts: {
            owner: newWallet.publicKey,
            authority: authorityPda,
            status: statusPda,
            systemProgram: SystemProgram.programId,
          },
        }
      );
    } catch(err) {
      // the error message will include the custom program error
      expect(err.toString().includes('OnlyOwnerViolation')).to.equal(true);
    }

    expect((await program.account.status.fetch(statusPda)).padding).to.equal(oldPadding);
  });

  const testCasesPrefixCoverage = [
    {key: 'REGULAR_EXAMPLE', value: 3001.23},
    {key: 'FIXED_EXAMPLE', value: '1064147852234612576455791553397172981'},
    {key: 'SN_EXAMPLE', value: -0.1234},
  ];

  testCasesPrefixCoverage.forEach(({key, value}) => {
    it(`creates fcd account for key ${key} and value ${value}`, async () => {
      const [fcdPda, _] = await createFCD(
        key,
        value,
        1647469325
      );

      const fcd = await program.account.firstClassData.fetch(fcdPda);
      expect(fcd.key).to.equal(key);
      expect(fcd.timestamp).to.equal(timestamp);
      expect(decodeDataValue(fcd.value, key)).to.equal(value);
    });
  });

  testCasesPrefixCoverage.forEach(({key, value}) => {
    it(`fails to create fcd account that is already initialized`, async () => {
      try {
        await createFCD(
          key,
          value,
          1647469325
        );
      } catch(err) {
        expect(err.toString().includes('Transaction simulation failed'));
      }
    });
  });

  const actualFCDTestCases = [
    {key: 'AAVE-USD', value: 191.6},
    {key: 'BNB-USD', value: 428.39},
    {key: 'BNT-USD', value: 2.564},
    {key: 'BTC-USD', value: 42917.52},
    {key: 'COMP-USD', value: 139.38},
    {key: 'DAI-USD', value: 1},
    {key: 'ETH-USD', value: 3255.49},
    {key: 'FTS-USD', value: 0.04661436},
    {key: 'GVol-BTC-IV-28days', value: 68.8},
    {key: 'GVol-ETH-IV-28days', value: 76.98},
    {key: 'LINK-USD', value: 15.47},
    {key: 'MAHA-USD', value: 3.81},
    {key: 'REN-USD', value: 0.408},
    {key: 'SNX-USD', value: 5.48},
    {key: 'UMB-USD', value: 0.11},
    {key: 'UNI-USD', value: 9.93},
    {key: 'YFI-USD', value: 20937.25},
  ];

  actualFCDTestCases.forEach(({key, value}) => {
    it(`creates fcd account for key ${key} and value ${value}`, async () => {
      const timestamp = 1647469325;

      const [fcdPda, _] = await createFCD(
        key,
        value,
        timestamp
      );

      const fcd = await program.account.firstClassData.fetch(fcdPda);
      expect(fcd.key).to.equal(key);
      expect(fcd.timestamp).to.equal(timestamp);
      expect(decodeDataValue(fcd.value, key)).to.equal(value);
    });
  });

  actualFCDTestCases.forEach(({key, value}) => {
    it(`updates fcd value for for key ${key} and value ${value}`, async () => {
      const newValue = parseFloat((value * 1.1).toFixed(5));
      const timestamp = 1647469350;

      const fcdPda = await updateFCD(
        key,
        newValue,
        timestamp
      );

      const fcd = await program.account.firstClassData.fetch(fcdPda);
      expect(fcd.key).to.equal(key);
      expect(fcd.timestamp).to.equal(timestamp);
      expect(decodeDataValue(fcd.value, key)).to.equal(newValue);
    });
  });

  it('should update all FCDs at the same time', async () => {
    const promises = [];
    const timestamp = 1647469450;

    actualFCDTestCases.forEach(({key, value}) => {
      console.log(`updating ${key}`);
      const newValue = parseFloat((value * 1.2).toFixed(5));

      promises.push(updateFCD(
        key,
        newValue,
        timestamp
      ));
    });

    await Promise.allSettled(promises);

    for (const {key, value} of actualFCDTestCases) {
      const newValue = parseFloat((value * 1.2).toFixed(5));

      const [fcdPda, _] = await derivePDAFromFCDKey(
        key,
        program.programId
      );

      const fcd = await program.account.firstClassData.fetch(fcdPda);
      expect(fcd.key).to.equal(key);
      expect(fcd.timestamp).to.equal(timestamp);
      expect(decodeDataValue(fcd.value, key)).to.equal(newValue);
    }
  });
  */
});
