use crate::errors::ChainError;
use crate::state::chain::*;
use anchor_lang::prelude::*;

pub fn initialize_first_class_data(
    ctx: Context<InitializeFirstClassData>,
    _seed: Vec<u8>,
    key: String,
    value: [u8; 32],
    timestamp: u32
) -> Result<()> {
    // needs error handling to check for max key length!
    ctx.accounts.fcd.key = key;
    ctx.accounts.fcd.value = value;
    ctx.accounts.fcd.timestamp = timestamp;

    msg!(
        "LogFCDInitialized: {:?} by {:?}",
        ctx.accounts.fcd.key,
        ctx.accounts.owner.key().to_string()
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(seed: Vec<u8>)]
pub struct InitializeFirstClassData<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ ChainError::OnlyOwnerViolation,
    )]
    pub authority: Account<'info, Authority>,

    // space: 8 discriminator + 4 key length + 200 key +  32 value + 4 timestamp + 1 bump
    #[account(
        init,
        payer = owner,
        space = 8 + 4 + 200 + 32 + 4 + 1,
        seeds = [&seed],
        bump
    )]
    pub fcd: Account<'info, FirstClassData>,
    pub system_program: Program<'info, System>,
}
