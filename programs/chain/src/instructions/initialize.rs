use crate::errors::ChainError;
use crate::state::chain::*;
use anchor_lang::prelude::*;

static INITIALIZER: &'static str = "4XhnoTayXeqDT64ULBYpKSi328SQCw3wHKFDqgA679VZ";

pub fn initialize(
    ctx: Context<Initialize>,
    padding: u32
) -> Result<()> {
    require!(
        ctx.accounts.initializer.to_account_info().key.to_string() == INITIALIZER,
        ChainError::NotInitializer
    );

    let status = &mut ctx.accounts.status;
    status.padding = padding;
    status.last_id = 0;
    status.last_data_timestamp = 0;
    status.next_block_id = 0;
    let authority = &mut ctx.accounts.authority;
    authority.owner = ctx.accounts.initializer.key();
    msg!("LogInitialization: by {:?}", INITIALIZER);
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

    // space: 8 discriminator + 32 owner + 1 bump
    #[account(
        init,
        payer = initializer,
        space = 8 + 32 + 1,
        seeds = [b"authority"],
        bump
    )]
    pub authority: Account<'info, Authority>,

    // space: 8 discriminator + 4 padding + 4 last_id + 4 last_data_timestamp + 4 next_block_id + 1 bump
    #[account(
        init,
        payer = initializer,
        space = 8 + 4 + 4 + 4 + 4 + 1,
        seeds = [b"status"],
        bump
    )]
    pub status: Account<'info, Status>,
    pub system_program: Program<'info, System>,
}
