import * as anchor from '@project-serum/anchor';
import {Program} from '@project-serum/anchor';
import {PublicKey} from '@solana/web3.js';
import {LeafKeyCoder, LeafValueCoder} from '@umb-network/toolbox';
import fs from 'fs';

/*
 Execution example: SOLANA_CHAIN_PROGRAM_ID=4SPgs3L7Ey9VyRuZwx4X3y86LSAZXP2Hhpz9Sps4v3iT SOLANA_CALLER_PROGRAM_ID=BmmRtz8Zf4rjQgWT643QG2eqHVkXzebSsnR7XipFTrAg ANCHOR_PROVIDER_URL="https://api.devnet.solana.com" ANCHOR_WALLET=~/.config/solana/id.json ts-node ./scripts/solana_fetch_fcd.ts
*/

const {SOLANA_CHAIN_PROGRAM_ID} = process.env;
const chainId = `${SOLANA_CHAIN_PROGRAM_ID}`;

const IDL = JSON.parse(fs.readFileSync('./target/idl/chain.json', 'utf8'));

const main = async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(IDL, new PublicKey(chainId), provider);

  const pair = 'BTC-USD';
  const seed = LeafKeyCoder.encode(pair);

  /*  We derive the Program Derived Account (PDA) for
   *  fetching the data stored on the account
   */
  const [fcdPda] = await PublicKey.findProgramAddress([seed], program.programId);

  const fcd = await program.account.firstClassData.fetch(fcdPda);
  const value = LeafValueCoder.decode('0x' + Buffer.from(fcd.value).toString('hex'), pair);

  console.log(`\n${pair} - ${value} - ${new Date(fcd.timestamp * 1000)}\n`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
