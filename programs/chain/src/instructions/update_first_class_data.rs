use crate::errors::ChainError;
use crate::state::chain::*;
use anchor_lang::prelude::*;

pub fn update_first_class_data(
    ctx: Context<UpdateFirstClassData>,
    key: String,
    value: [u8; 32],
    timestamp: u32
) -> Result<()> {
    require!(
        ctx.accounts.fcd.key == key,
        ChainError::WrongFCDKeyForAccount
    );

    require!(
        ctx.accounts.fcd.timestamp < timestamp,
        ChainError::CannotSubmitOlderData
    );

    require!(
        i64::from(ctx.accounts.fcd.timestamp + ctx.accounts.status.padding) < timestamp.into(),
        ChainError::DoNotSpam
    );

    ctx.accounts.fcd.value = value;
    ctx.accounts.fcd.timestamp = timestamp;

    msg!(
        "LogFCDUpdated: {:?} by {:?} with timestamp {:?}",
        key,
        ctx.accounts.owner.key().to_string(),
        timestamp
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(seed: Vec<u8>)]
pub struct UpdateFirstClassData<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ ChainError::OnlyOwnerViolation,
    )]
    pub authority: Account<'info, Authority>,

    #[account(mut)]
    pub fcd: Account<'info, FirstClassData>,
    #[account(mut)]
    pub status: Account<'info, Status>,
    pub system_program: Program<'info, System>,
}
