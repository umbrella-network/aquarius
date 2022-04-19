use crate::errors::ChainError;
use crate::state::chain::*;
use anchor_lang::prelude::*;
use sha3::{Digest, Keccak256};

//  function computeRoot(bytes32[] memory proof, bytes32 leaf) internal pure returns (bytes32) {
//    bytes32 computedHash = leaf;
//
//    for (uint256 i = 0; i < proof.length; i++) {
//      bytes32 proofElement = proof[i];
//
//      if (computedHash <= proofElement) {
//        // Hash(current computed hash + current element of the proof)
//        computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
//      } else {
//        // Hash(current element of the proof + current computed hash)
//        computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
//      }
//    }
//
//    return computedHash;
//  }

pub fn initialize_block(ctx: Context<InitializeBlock>) -> Result<()> {
    let block = &mut ctx.accounts.block;
    block.block_id = 0;
    block.root = [0u8; 32];
    block.timestamp = 0;
    Ok(())
}

pub fn compute_root(ctx: Context<ComputeRoot>, proof: [u8; 32], leaf: [u8; 32]) -> Result<()> {
    //let mut root: [u8; 32] = leaf;
    //for p in proof {
    let mut hasher = Keccak256::new();
    hasher.update(proof);
    ctx.accounts.block.root = hasher.finalize().into();
        //msg!("p = {:?} hash = {:?}", root, result);
    //}
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeBlock<'info> {
    #[account(init, payer = user, space = 8 + 4 + 32 + 4)]
    pub block: Account<'info, Block>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ComputeRoot<'info> {
    #[account(mut)]
    pub block: Account<'info, Block>,
}
