use crate::errors::ChainError;
use crate::state::chain::*;
use anchor_lang::prelude::*;

pub fn set_padding(
    ctx: Context<SetPadding>,
    padding: u32
) -> Result<()> {
    let status = &mut ctx.accounts.status;
    status.padding = padding;
    msg!("LogPaddingSet: {:?} by {:?}", padding, ctx.accounts.owner.key().to_string());

    Ok(())
}

#[derive(Accounts)]
pub struct SetPadding<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ ChainError::OnlyOwnerViolation,
    )]
    pub authority: Account<'info, Authority>,

    #[account(mut)]
    pub status: Account<'info, Status>,
    pub system_program: Program<'info, System>,
}
