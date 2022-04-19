use crate::errors::ChainError;
use crate::state::chain::*;
use anchor_lang::prelude::*;
use sha3::{Digest, Keccak256};

pub fn compare_hashes(a: [u8; 32], b: [u8; 32]) -> bool {
    for (i, _) in a.iter().enumerate() {
        if a[i] < b[i] {
            return true;
        } else if a[i] > b[i] {
            return false;
        }
    }
    true
}

pub fn initialize_block(ctx: Context<InitializeBlock>) -> Result<()> {
    let block = &mut ctx.accounts.block;
    block.block_id = 0;
    block.root = [0u8; 32];
    block.timestamp = 0;
    Ok(())
}

pub fn compute_root(ctx: Context<ComputeRoot>, proof: Vec<[u8; 32]>, leaf: [u8; 32]) -> Result<()> {
    let mut computed_hash: [u8; 32] = leaf;
    for proof_element in proof {
        let mut hasher = Keccak256::new();
        if compare_hashes(proof_element, computed_hash) {
            hasher.update([computed_hash, proof_element].concat());
        } else {
            hasher.update([proof_element, computed_hash].concat());
        }
        computed_hash = hasher.finalize().into();
        //msg!("computed_hash = {:?}", computed_hash);
        //msg!("p = {:?} hash = {:?}", root, result);
    }
    ctx.accounts.block.root = computed_hash;
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
