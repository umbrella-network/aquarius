use anchor_lang::prelude::*;
use chain::cpi::accounts::Verify;
use chain::program::Chain;
use chain::{self};
use chain::state::{Block, VerifyResult};
use hex;

declare_id!("BLW5orYzT75AJH174XTcQ5BdWYUzQyxNUT75hDetAoyg");

#[program]
pub mod caller {
    use super::*;

    pub fn cpi_call_verify_true(
        ctx: Context<CpiReturnContext>,
        _seed: Vec<u8>
    ) -> Result<()> {

        let mut proofs = vec![[0u8; 32], [0u8; 32], [0u8; 32]];
        assert_eq!(hex::decode_to_slice("55747576547286b610e889628b275a282f0ee916319ef219a5cf51ff94ef9179", &mut proofs[0] as &mut [u8]), Ok(()));
        assert_eq!(hex::decode_to_slice("e2ea0a050e929e24840f8d2f358b4811fc57830b37f825e2804cfe1d8739e68d", &mut proofs[1] as &mut [u8]), Ok(()));
        assert_eq!(hex::decode_to_slice("4fc70ae8789647370c93beb224cbf9f61f38618ea38be23087fc2f070c0efaf3", &mut proofs[2] as &mut [u8]), Ok(()));

        let mut key = [0u8; 32];
        let mut value = [0u8; 32];
        assert_eq!(hex::decode_to_slice("4900000000000000000000000000000000000000000000000000000000000000", &mut key as &mut [u8]), Ok(()));
        assert_eq!(hex::decode_to_slice("5800000000000000000000000000000000000000000000000000000000000000", &mut value as &mut [u8]), Ok(()));

        let cpi_program = ctx.accounts.cpi_return_program.to_account_info();

        let cpi_accounts = Verify {
            block: ctx.accounts.block.to_account_info(),
            verify_result: ctx.accounts.cpi_return.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let result = chain::cpi::verify_proof_for_block(cpi_ctx, _seed, proofs, key, value)?;
        Ok(())
    }

    pub fn cpi_call_verify_false_tempered_proofs(
        ctx: Context<CpiReturnContext>,
        _seed: Vec<u8>
    ) -> Result<()> {

        let mut proofs = vec![[0u8; 32], [0u8; 32], [0u8; 32]];
        assert_eq!(hex::decode_to_slice("55747576547286b610e889628b275a282f0ee916319ef219a5cf51ff94ef9179", &mut proofs[0] as &mut [u8]), Ok(()));
        assert_eq!(hex::decode_to_slice("deadbeaf0e929e24840f8d2f358b4811fc57830b37f825e2804cfe1d8739e68d", &mut proofs[1] as &mut [u8]), Ok(()));
        assert_eq!(hex::decode_to_slice("4fc70ae8789647370c93beb224cbf9f61f38618ea38be23087fc2f070c0efaf3", &mut proofs[2] as &mut [u8]), Ok(()));

        let mut key = [0u8; 32];
        let mut value = [0u8; 32];
        assert_eq!(hex::decode_to_slice("4900000000000000000000000000000000000000000000000000000000000000", &mut key as &mut [u8]), Ok(()));
        assert_eq!(hex::decode_to_slice("5800000000000000000000000000000000000000000000000000000000000000", &mut value as &mut [u8]), Ok(()));

        let cpi_program = ctx.accounts.cpi_return_program.to_account_info();

        let cpi_accounts = Verify {
            block: ctx.accounts.block.to_account_info(),
            verify_result: ctx.accounts.cpi_return.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let result = chain::cpi::verify_proof_for_block(cpi_ctx, _seed, proofs, key, value)?;
        Ok(())
    }

    pub fn cpi_call_verify_false_tempered_key(
        ctx: Context<CpiReturnContext>,
        _seed: Vec<u8>
    ) -> Result<()> {

        let mut proofs = vec![[0u8; 32], [0u8; 32], [0u8; 32]];
        assert_eq!(hex::decode_to_slice("55747576547286b610e889628b275a282f0ee916319ef219a5cf51ff94ef9179", &mut proofs[0] as &mut [u8]), Ok(()));
        assert_eq!(hex::decode_to_slice("e2ea0a050e929e24840f8d2f358b4811fc57830b37f825e2804cfe1d8739e68d", &mut proofs[1] as &mut [u8]), Ok(()));
        assert_eq!(hex::decode_to_slice("4fc70ae8789647370c93beb224cbf9f61f38618ea38be23087fc2f070c0efaf3", &mut proofs[2] as &mut [u8]), Ok(()));

        let mut key = [0u8; 32];
        let mut value = [0u8; 32];
        assert_eq!(hex::decode_to_slice("4900000000000000000000000000000000000000000000000000000000000001", &mut key as &mut [u8]), Ok(()));
        assert_eq!(hex::decode_to_slice("5800000000000000000000000000000000000000000000000000000000000000", &mut value as &mut [u8]), Ok(()));

        let cpi_program = ctx.accounts.cpi_return_program.to_account_info();

        let cpi_accounts = Verify {
            block: ctx.accounts.block.to_account_info(),
            verify_result: ctx.accounts.cpi_return.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let result = chain::cpi::verify_proof_for_block(cpi_ctx, _seed, proofs, key, value)?;
        Ok(())
    }

    pub fn cpi_call_verify_false_tempered_value(
        ctx: Context<CpiReturnContext>,
        _seed: Vec<u8>
    ) -> Result<()> {

        let mut proofs = vec![[0u8; 32], [0u8; 32], [0u8; 32]];
        assert_eq!(hex::decode_to_slice("55747576547286b610e889628b275a282f0ee916319ef219a5cf51ff94ef9179", &mut proofs[0] as &mut [u8]), Ok(()));
        assert_eq!(hex::decode_to_slice("e2ea0a050e929e24840f8d2f358b4811fc57830b37f825e2804cfe1d8739e68d", &mut proofs[1] as &mut [u8]), Ok(()));
        assert_eq!(hex::decode_to_slice("4fc70ae8789647370c93beb224cbf9f61f38618ea38be23087fc2f070c0efaf3", &mut proofs[2] as &mut [u8]), Ok(()));

        let mut key = [0u8; 32];
        let mut value = [0u8; 32];
        assert_eq!(hex::decode_to_slice("4900000000000000000000000000000000000000000000000000000000000000", &mut key as &mut [u8]), Ok(()));
        assert_eq!(hex::decode_to_slice("5800000000000000000000000000000000000000000000000000000000000001", &mut value as &mut [u8]), Ok(()));

        let cpi_program = ctx.accounts.cpi_return_program.to_account_info();

        let cpi_accounts = Verify {
            block: ctx.accounts.block.to_account_info(),
            verify_result: ctx.accounts.cpi_return.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let result = chain::cpi::verify_proof_for_block(cpi_ctx, _seed, proofs, key, value)?;
        Ok(())
    }
}

#[derive(Accounts)]
// #[instruction(seed: Vec<u8>)]
pub struct CpiReturnContext<'info> {
    #[account(mut)]
    pub cpi_return: Account<'info, VerifyResult>,
    //#[account(seeds = [&seed], bump)]
    pub block: Account<'info, Block>,

    pub cpi_return_program: Program<'info, Chain>,
}
