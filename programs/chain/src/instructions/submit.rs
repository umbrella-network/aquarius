use crate::errors::ChainError;
use crate::state::chain::*;
use anchor_lang::prelude::*;

pub fn submit(
    ctx: Context<Submit>,
    _seed: Vec<u8>,
    block_id: u32,
    root: [u8; 32],
    timestamp: u32
) -> Result<()> {
    require!(
        ctx.accounts.status.last_data_timestamp < timestamp,
        ChainError::CannotSubmitOlderData
    );

    let now = Clock::get().unwrap().unix_timestamp;
    require!(
        i64::from(
            ctx.accounts.status.last_data_timestamp + ctx.accounts.status.padding
        ) < timestamp.into(),
        ChainError::DoNotSpam
    );

    ctx.accounts.block.block_id = block_id;
    ctx.accounts.block.root = root;
    ctx.accounts.block.timestamp = timestamp;
    ctx.accounts.status.last_id = block_id;
    ctx.accounts.status.last_data_timestamp = timestamp;
    ctx.accounts.status.next_block_id = block_id + 1;
    msg!("LogBlockSubmitted: {:?} by {:?}", block_id, ctx.accounts.owner.key().to_string());

    Ok(())
}

#[derive(Accounts)]
#[instruction(seed: Vec<u8>)]
pub struct Submit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ ChainError::OnlyOwnerViolation,
    )]
    pub authority: Account<'info, Authority>,

    // space: 8 discriminator + 4 block_id + 32 root + 4 timestamp + 1 bump
    #[account(
        init,
        payer = owner,
        space = 8 + 4 + 32 + 4 + 1,
        seeds = [&seed],
        bump
    )]
    pub block: Account<'info, Block>,

    #[account(mut)]
    pub status: Account<'info, Status>,
    pub system_program: Program<'info, System>
}
