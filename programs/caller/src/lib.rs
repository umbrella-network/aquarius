use anchor_lang::prelude::*;
use chain::cpi::accounts::CpiReturn;
use chain::program::Chain;
use chain::{self, CpiReturnAccount};
use hex;

declare_id!("BLW5orYzT75AJH174XTcQ5BdWYUzQyxNUT75hDetAoyg");

#[program]
pub mod caller {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let proofs = [
            hex::decode("55747576547286b610e889628b275a282f0ee916319ef219a5cf51ff94ef9179").unwrap(),
            hex::decode("e2ea0a050e929e24840f8d2f358b4811fc57830b37f825e2804cfe1d8739e68d").unwrap(),
            hex::decode("4fc70ae8789647370c93beb224cbf9f61f38618ea38be23087fc2f07deadbeef").unwrap(),
        ];
        Ok(())
    }

    pub fn cpi_call_verify_true(ctx: Context<CpiReturnContext>) -> Result<()> {
        let cpi_program = ctx.accounts.cpi_return_program.to_account_info();
        let cpi_accounts = CpiReturn {
            account: ctx.accounts.cpi_return.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let result = chain::cpi::verify_true(cpi_ctx)?;
        let solana_return = result.get();
        msg!("Hola soy guido, solana_return = {}", solana_return);
        anchor_lang::solana_program::log::sol_log_data(&[&solana_return.try_to_vec().unwrap()]);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}


#[derive(Accounts)]
pub struct CpiReturnContext<'info> {
    #[account(mut)]
    pub cpi_return: Account<'info, CpiReturnAccount>,
    pub cpi_return_program: Program<'info, Chain>,
}

#[derive(Accounts)]
pub struct ReturnContext {}
