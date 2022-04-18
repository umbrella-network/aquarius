import * as anchor from '@project-serum/anchor';
import * as dotenv from 'dotenv';
import {Program} from '@project-serum/anchor';
import {SystemProgram, PublicKey} from '@solana/web3.js';
import {IDL} from '../target/types/chain';
import {expect} from "chai";
import {LeafKeyCoder} from '@umb-network/toolbox';
dotenv.config();

import {
  getPublicKeyForSeed,
  getAddressFromToml,
  derivePDAFromBlockId,
  derivePDAFromFCDKey,
  encodeDataValue,
  decodeDataValue,
  encodeBlockRoot,
  decodeBlockRoot,
  getKeyPairFromSecretKeyString
} from '../tests/utils';

let program, statusPda, authorityPda;

const fcds = [
  {key: 'AAVE-USD', value: 159.64},
  {key: 'BNB-USD', value: 395.84},
  {key: 'BNT-USD', value: 2.254},
  {key: 'BTC-USD', value: 39704.81},
  {key: 'COMP-USD', value: 118.08},
  {key: 'DAI-USD', value: 1},
  {key: 'ETH-USD', value: 2996.17},
  {key: 'FTS-USD', value: 0.04337673},
  {key: 'GVol-BTC-IV-28days', value: 68.8},
  {key: 'GVol-ETH-IV-28days', value: 76.98},
  {key: 'LINK-USD', value: 13.82},
  {key: 'MAHA-USD', value: 3.6},
  {key: 'REN-USD', value: 0.324},
  {key: 'SNX-USD', value: 4.53},
  {key: 'UMB-USD', value: 0.1},
  {key: 'UNI-USD', value: 9.04},
  {key: 'YFI-USD', value: 18579.67},
];


const blockId = 376168;
const root = '0x57e6c34cb6627f00a9a0b10c489b3cb7cbb87c12214c87eeb7660d4e6251d432';
const blockTimestamp = 1649529906;


module.exports = async function (provider) {
  anchor.setProvider(provider);

  program = new Program(
    IDL,
    new PublicKey(getAddressFromToml('chain')),
    anchor.getProvider()
  );

  authorityPda = await getPublicKeyForSeed(
    'authority',
    program.programId
  );

  statusPda = await getPublicKeyForSeed(
    'status',
    program.programId
  );

  //await updatePadding(300);

  //await initializeChain(1800);

  //await initializeFCDs();

  //await updateFCDs()

  //await printFCDs();

  //await createBlock();

  //await printBlock();

  //await printStatus();

  await printStatusAndFCDsInLoop(10000);

  //await transferOwnership();
};

const updatePadding = async (padding) => {
  const tx = await program.rpc.setPadding(
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

  console.log('initialize tx: ' + tx);
}

const initializeChain = async (padding: number) => {
  const tx = await program.rpc.initialize(
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

  console.log('initialize tx: ' + tx);
}

const initializeFCDs = async () => {
  //const timestamp = parseInt(String(Date.now() / 1000));
  const timestamp = 0;
  const promises = [];


  for (const {key, value} of fcds) {
    console.log(`initializing ${key}`);

    const [fcdPda, seed] = await derivePDAFromFCDKey(
      key,
      program.programId
    );

    try {
      const [fcdPda] = await derivePDAFromFCDKey(
        key,
        program.programId
      );

      const fcd = await program.account.firstClassData.fetch(fcdPda);
      console.log('Key initialized already: ' + key);
    } catch (e) {
      const promise = new Promise((resolve, reject) => {
        program.rpc.initializeFirstClassData(
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
        )
          .then((signature) => {
            console.log('Key ' + key + 'initialized with tx: ' + signature);
            resolve(null);
          })
          .catch((err) => {
            console.log('Error initializing key: ' + key);
            console.log(err);
            resolve(null);
          });
      });

      promises.push(promise);
    }
  }

  await Promise.allSettled(promises);
}

const updateFCDs = async () => {
  const newFcds = [
    {key: 'AAVE-USD', value: 183.64},
    {key: 'BNB-USD', value: 423.74},
    {key: 'BNT-USD', value: 2.548},
    {key: 'BTC-USD', value: 42589.33},
    {key: 'COMP-USD', value: 136.24},
    {key: 'DAI-USD', value: 1},
    {key: 'ETH-USD', value: 3241.08},
    {key: 'FTS-USD', value: 0.04306496},
    {key: 'GVol-BTC-IV-28days', value: 68.8},
    {key: 'GVol-ETH-IV-28days', value: 76.98},
    {key: 'LINK-USD', value: 15.36},
    {key: 'MAHA-USD', value: 3.86},
    {key: 'REN-USD', value: 0.4},
    {key: 'SNX-USD', value: 5.32},
    {key: 'UMB-USD', value: 0.1},
    {key: 'UNI-USD', value: 10.01},
    {key: 'YFI-USD', value: 20499},
  ];

  const timestamp = parseInt(String(Date.now() / 1000));
  const promises = [];

  for (const {key, value} of newFcds) {
    console.log(`updating ${key}`);

    const [fcdPda] = await derivePDAFromFCDKey(
      key,
      program.programId
    );

    promises.push(program.rpc.updateFirstClassData(
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
    ));
  }

  await Promise.allSettled(promises);

  for (const {key, value} of newFcds) {
    const [fcdPda, _] = await derivePDAFromFCDKey(
      key,
      program.programId
    );

    const fcd = await program.account.firstClassData.fetch(fcdPda);
    expect(fcd.key).to.equal(key);
    expect(fcd.timestamp).to.equal(timestamp);
    expect(decodeDataValue(fcd.value, key)).to.equal(value);
  }
}

const printFCDs = async () => {
  console.log('==================================================================================');
  console.log('FCDs:');
  console.log('==================================================================================');
  console.log('Key - Value - Timestamp');

  const promises = [];

  for (const {key} of fcds) {
    promises.push(new Promise(async (resolve, reject) => {
      const [fcdPda, _] = await derivePDAFromFCDKey(
        key,
        program.programId
      );

      const fcd = await program.account.firstClassData.fetch(fcdPda);
      console.log(
        key + ' - ' + decodeDataValue(fcd.value, key) + ' - ' + fcd.timestamp + ' - 0x'
        + LeafKeyCoder.encode(key).toString('hex')
      );

      resolve(null);
    }));
  }

  await Promise.allSettled(promises);
}

const createBlock = async () => {
  const [blockPda, seed] = await derivePDAFromBlockId(
    blockId,
    program.programId
  );

  await program.rpc.submit(
    seed,
    blockId,
    encodeBlockRoot(root),
    blockTimestamp,
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

  expect(
    decodeBlockRoot(
      (await program.account.block.fetch(blockPda)).root
    )
  ).to.equal(root);

  expect((await program.account.block.fetch(blockPda)).blockId).to.equal(blockId);
  expect((await program.account.block.fetch(blockPda)).timestamp).to.equal(blockTimestamp);
}

const printBlock = async () => {
  const [blockPda] = await derivePDAFromBlockId(
    blockId,
    program.programId
  );

  const block = await program.account.block.fetch(blockPda);

  const _blockRoot = decodeBlockRoot(
    (await program.account.block.fetch(blockPda)).root
  );

  console.log('==================================================================================');
  console.log('Block:');
  console.log('==================================================================================');
  console.log('BlockId: ' + block.blockId);
  console.log('Root: ' + _blockRoot);
  console.log('Timestamp: ' + block.timestamp + '\n');
}

const printStatus = async () => {
  const status = await program.account.status.fetch(statusPda);
  console.log('==================================================================================');
  console.log('Chain status:');
  console.log('==================================================================================');
  console.log('padding: ' + status.padding);
  console.log('lastId: ' + status.lastId);
  console.log('lastDataTimestamp: ' + status.lastDataTimestamp);
  console.log('nextBlockId: ' + status.nextBlockId + '\n');
}

const printStatusAndFCDsInLoop = async (interval) => {
  setInterval(async () => {
    await printStatus();
    await printFCDs();
  }, interval);
}

const transferOwnership = async () => {
  const PRD_REPLICATOR_KEY="[207,54,251,230,248,243,158,11,220,17,198,29,188,228,161,70,80,50,223,208,14,86,226,70,20,67,209,167,41,230,4,64,220,157,172,202,243,60,159,241,188,95,21,250,196,124,228,132,162,245,172,179,134,20,203,224,201,194,1,126,130,172,177,146]";
  const newOwnerKeyPair = getKeyPairFromSecretKeyString(PRD_REPLICATOR_KEY);
  console.log('New Owner: ' + newOwnerKeyPair.publicKey.toBase58());

  const tx = await program.rpc.transferOwnership(
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

  console.log(tx);
}
