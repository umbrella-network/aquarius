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

pub fn initialize_verify_result(ctx: Context<InitializeVerifyResult>) -> Result<()> {
    let verify_result = &mut ctx.accounts.verify_result;
    verify_result.root = [0u8; 32];
    verify_result.result = false;
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
    }
    ctx.accounts.verify_result.root = computed_hash;
    Ok(())
}

pub fn verify(ctx: Context<Verify>, root: [u8; 32]) -> Result<()> {
    let verify_result = &mut ctx.accounts.verify_result;
    if verify_result.root == root {
        verify_result.result = true;
    } else {
        verify_result.result = false;
    }
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeVerifyResult<'info> {
    #[account(init, payer = user, space = 8 + 32 + 1)]
    pub verify_result: Account<'info, VerifyResult>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ComputeRoot<'info> {
    #[account(mut)]
    pub verify_result: Account<'info, VerifyResult>,
}

#[derive(Accounts)]
pub struct Verify<'info> {
    #[account(mut)]
    pub verify_result: Account<'info, VerifyResult>
}
