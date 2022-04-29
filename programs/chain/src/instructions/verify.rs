use crate::state::chain::*;
use anchor_lang::prelude::*;
use sha3::{Digest, Keccak256};

pub fn initialize_verify_result(
    ctx: Context<InitializeVerifyResult>
) -> Result<()> {
    let verify_result = &mut ctx.accounts.verify_result;
    verify_result.result = false;
    Ok(())
}

pub fn verify_proof_for_block(
    ctx: Context<Verify>, _seed: Vec<u8>,
    proof: Vec<[u8;32]>, key: [u8;32], value: [u8;32]
) -> Result<()> {
    let squashed_root = ctx.accounts.block.root;

    let mut hasher = Keccak256::new();
    hasher.update([key, value].concat());
    let leaf = hasher.finalize().into();

    let verify_result = &mut ctx.accounts.verify_result;
    verify_result.result = verify_squashed_root(squashed_root, proof, leaf);
    msg!("The verification result is = {}", verify_result.result);
    Ok(())
}

fn compute_root(proof: Vec<[u8; 32]>, leaf: [u8; 32]) -> [u8; 32] {
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
    computed_hash
}

fn verify_squashed_root(
    squashed_root: [u8;32], proof: Vec<[u8;32]>, leaf: [u8;32]
) -> bool {
    extract_root(compute_root(proof, leaf)) == extract_root(squashed_root)
}

fn extract_root(root_with_timestamp: [u8;32]) -> [u8;32] {
    let mut result = root_with_timestamp.clone();
    for i in 28..32 {
        result[i] = 0u8;
    }
    result
}

fn compare_hashes(a: [u8; 32], b: [u8; 32]) -> bool {
    for (i, _) in a.iter().enumerate() {
        if a[i] < b[i] {
            return true;
        } else if a[i] > b[i] {
            return false;
        }
    }
    true
}

#[derive(Accounts)]
pub struct InitializeVerifyResult<'info> {
    #[account(init, payer = user, space = 8 + 1)]
    pub verify_result: Account<'info, VerifyResult>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(seed: Vec<u8>)]
pub struct Verify<'info> {
    #[account(seeds = [&seed], bump)]
    pub block: Account<'info, Block>,
    #[account(mut)]
    pub verify_result: Account<'info, VerifyResult>,
}
