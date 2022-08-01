import * as anchor from '@project-serum/anchor';
import * as dotenv from 'dotenv';
import {expect} from 'chai';
import {getKeyPairFromSecretKeyString} from '../../scripts/utils';
dotenv.config();

describe('utils', async () => {
  before(async () => {
    //anchor.setProvider(anchor.Provider.env());
  });

  it('check public key from keypair file', async () => {
    //const pubkey = anchor.getProvider().wallet.publicKey.toBase58();
    //expect(!!(pubkey)).to.equal(true);
  });

  it('create key pair from uint8 array string', async () => {
    const keyString =
      '[17,173,166,247,79,12,33,53,159,165,130,22,51,203,52,61,253,99,9,69,210,20,5,60,199,216,186,234,153,157,89,77,181,84,135,206,59,82,28,32,106,246,25,194,49,170,78,99,146,205,109,207,56,210,145,175,68,170,98,178,151,105,105,174]';
    const pubkey = getKeyPairFromSecretKeyString(keyString).publicKey;
    expect(!!pubkey).to.equal(true);
    expect(!!pubkey.toBase58()).to.equal(true);
  });

  it('should convert the root into a buffer', async () => {
    const root = '57e6c34cb6627f00a9a0b10c489b3cb7cbb87c12214c87eeb7660d4e6251d432';
    const buf = Buffer.from(root, 'hex');
    const decodedRoot = buf.toString('hex');
    expect(root).to.eql(decodedRoot);
  });
});
