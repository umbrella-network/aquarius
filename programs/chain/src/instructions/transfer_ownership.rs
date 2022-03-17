use crate::errors::ChainError;
use crate::state::chain::*;
use anchor_lang::prelude::*;

pub fn transfer_ownership(
    ctx: Context<TransferOwnership>,
) -> Result<()> {
    let old_owner = ctx.accounts.authority.owner.to_string();
    ctx.accounts.authority.owner = ctx.accounts.new_owner.key();
    let new_owner = ctx.accounts.authority.owner.to_string();
    msg!("LogOwnershipChanged: From {:?} to {:?}", old_owner, new_owner);

    Ok(())
}

#[derive(Accounts)]
pub struct TransferOwnership<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ ChainError::OnlyOwnerViolation,
    )]
    pub authority: Account<'info, Authority>,

    #[account(mut)]
    pub new_owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}
