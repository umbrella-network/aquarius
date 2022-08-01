import * as anchor from '@project-serum/anchor';
import * as dotenv from 'dotenv';
import {PublicKey, Keypair, Ed25519Keypair} from '@solana/web3.js';
import {Chain} from '../../target/types/chain';
import {expect} from 'chai';
import {LeafValueCoder, LeafKeyCoder} from '@umb-network/toolbox';
import {
  getPublicKeyForString,
  derivePDAFromBlockId,
  derivePDAFromFCDKey,
  prepend0x,
  encodeBlockRoot,
  decodeBlockRoot,
  encodeDataValue,
  decodeDataValue,
} from '../../scripts/utils';
dotenv.config();

describe('utils without provider', async () => {
  const programId = new PublicKey("4A1UTUs838jAhGoi9YSeZPgJxDojH7fnXUyK11iQvGYt");

  const testCases = [
    'Chain',
    'Staking',
    'VeryLongStringForAProgramName',
    'ThisIsDefinitelyAMuchLongerNameThanThePreviousExampleButWontBeTheLongest',
    'ThisIsDefinitelyTheLongestNameBecauseItIncludesAllPreviousNamesConcatenated'
    + 'Chain'
    + 'Staking'
    + 'VeryLongStringForAProgramName'
    + 'ThisIsDefinitelyAMuchLongerNameThanThePreviousExampleButWontBeTheLongest',
  ];

  describe('Block roots', async () => {
    it('should encode and decode block root', async () => {
      const root = '0x1786dd07dffc4abfe4fb2bb007dd4fdf93a690e185142a14af877654625066ac';
      const encodedRoot: Buffer = encodeBlockRoot(root);
      expect(!!encodedRoot).to.eql(true);
      const decodedRoot = decodeBlockRoot([...encodedRoot]);
      expect(decodedRoot).to.eql(root);
    });
  });

  describe('Data Point Values', async () => {
    const testCases = [
      {key: 'ETH-USD', value: 3001.23},
      {key: 'FIXED_EXAMPLE', value: '0x1786dd07dffc4abfe4fb2bb007dd4fdf93a690e185142a14af877654625066ac'},
      {key: 'SN_EXAMPLE', value: -0.1234},
    ];

    testCases.forEach(({key, value}) => {
      const encodedValue = encodeDataValue(value, key);
      const decodedValue = decodeDataValue([...encodedValue], key);
      expect(decodedValue).to.eql(value);
    });
  });

  describe('#LeafValueCoder', async () => {
    it('should encode a block root', async () => {
      const root = '0x1786dd07dffc4abfe4fb2bb007dd4fdf93a690e185142a14af877654625066ac';
      const encodedRoot: Buffer = LeafValueCoder.encode(root, 'FIXED_');
      expect(encodedRoot.length).to.eql(32);
      const decodedRoot = prepend0x(encodedRoot.toString('hex'));
      console.log(decodedRoot);
      expect(decodedRoot).to.eql(root);
    });

    it('should encode blockId for PDA seed', async () => {
      const blockId = 343062;
      const encodedBlockId: Buffer = LeafValueCoder.encode(blockId, '');
      expect(encodedBlockId.length).to.eql(32);
      const decodedBlockId = LeafValueCoder.decode(encodedBlockId.toString('hex'), '');
      console.log(decodedBlockId);
      expect(decodedBlockId).to.eql(blockId);
    });

    it('should encode and decode value for FCD', async () => {
      const key = 'ETH-USD';
      const value = 3001.23;
      const encodedValue: Buffer = LeafValueCoder.encode(value, key);
      const decodedValue = LeafValueCoder.decode(encodedValue.toString('hex'), key);
      expect(decodedValue).to.eql(value);
    });
  });

  describe('#LeafKeyCoder', async () => {
    it('should encode an FCD key', async () => {
      const key = 'ETH-USD';
      const encodedKey: Buffer = LeafKeyCoder.encode(key);
      expect(encodedKey.length).to.eql(32);
    });
  });

  describe('#derivePDAFromFCDKey', async () => {
    it('should return an address derived from the given FCD key', async () => {
      const key = 'ETH-USD';

      const [
        pubkey
      ] = await derivePDAFromFCDKey(
        key,
        programId
      );

      console.log(pubkey.toBase58());
      expect(!!pubkey).to.eql(true);
      expect(typeof(pubkey.toBase58())).to.eql('string');
    });
  });

  describe('#derivePDAFromBlockId', async () => {
    it('should return an address derived from the given block id', async () => {
      const blockId = 343062;

      const [
        pubkey
      ] = await derivePDAFromBlockId(
        blockId,
        programId
      );

      console.log(pubkey.toBase58());
      expect(!!pubkey).to.eql(true);
      expect(typeof(pubkey.toBase58())).to.eql('string');
    });
  });
});
