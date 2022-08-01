use anchor_lang::prelude::*;
use chain::cpi::accounts::Verify;
use chain::program::Chain;
use chain::state::{Block, FirstClassData, VerifyResult};
use chain::{self};
use num_bigint::{BigInt, Sign, ToBigInt};
use hex;

#[derive(Debug)]
pub enum Error {
    U32ToF64ConversionError,
    BigIntToU32ConversionError,
}

fn decode_value(value: [u8; 32]) -> std::result::Result<f64, Error> {
    let whole_part = BigInt::from_bytes_be(Sign::Plus, &value)
        / 1_000_000_000_000_000_000u128.to_bigint().unwrap();
    let decimal_part = (BigInt::from_bytes_be(Sign::Plus, &value)
        % 1_000_000_000_000_000_000u128.to_bigint().unwrap())
        / 1_000_000_000_000_000u128.to_bigint().unwrap();

    let whole_part: u32 = whole_part
        .try_into()
        .map_err(|_| Error::BigIntToU32ConversionError)?;
    let decimal_part: u32 = decimal_part
        .try_into()
        .map_err(|_| Error::BigIntToU32ConversionError)?;

    let whole_part: f64 = whole_part
        .try_into()
        .map_err(|_| Error::U32ToF64ConversionError)?;
    let decimal_part: f64 = decimal_part
        .try_into()
        .map_err(|_| Error::U32ToF64ConversionError)?;

    Ok(whole_part + decimal_part * 0.01)
}

declare_id!("BAxZZXMFKHn4cw2NJTM83uLSuuhF3BBq76WLKvDkz5xj");

#[program]
pub mod caller {
    use super::*;

    pub fn read_fcd(ctx: Context<FirstClassDataContext>) -> Result<()> {
        let fcd_account = &ctx.accounts.fcd;
        let key = fcd_account.key.clone();
        let value = fcd_account.value.clone();
        let timestamp = fcd_account.timestamp.clone();

        msg!("[caller] key: {:?}", key);
        msg!("[caller] value: {:?}", value);
        msg!("[caller] value [f64]: {:?}", decode_value(value));
        msg!("[caller] timestamp: {:?}", timestamp);
        Ok(())
    }

    pub fn cpi_call_verify_true(ctx: Context<CpiReturnContext>, _seed: Vec<u8>) -> Result<()> {
        let mut proofs = vec![[0u8; 32]; 12];
        assert_eq!(
            hex::decode_to_slice(
                "8aa4e4134178289504b4b6c7c85527b41905cf3d51ad95eaec44a87fbe773b82",
                &mut proofs[0] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "2555c92539183bfa28387c6e98403aeb44f8b7602d0580e4679f2432405b62b1",
                &mut proofs[1] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "6bb2d161e2d374a8aa779e0c61ecef7e82b7a6ba6543bf997212ea164c7ec540",
                &mut proofs[2] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "e3cd6c525d52487eb7439d1042dbd917a9b421fd2656a98a6f8af593fd4f4453",
                &mut proofs[3] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "39afef9403f6ccd794a1bf6c48a55a0d4164d8ab9f32992410f62629bd57a6b7",
                &mut proofs[4] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "72d0fddd950ac6ce7f54a48d4003843d526ee02fc21d8c305012bdd17f7058af",
                &mut proofs[5] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "fb1199eb1639a574b06bd4f2fc619a9004fb55dd9016c6b24c4c79498a24099f",
                &mut proofs[6] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "fa9e1fb3aa77f7249c18bd4dbd99bd9c3766a6bf6ab00eac7d5380732059566a",
                &mut proofs[7] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "81b18433beaada4ee9a058a3eb1580498a61789809abb60517ec0ca5e0bcf948",
                &mut proofs[8] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "a8440a4bf999006045d796a91e23fec4b23eee861ba9735d41dc804a76ae0643",
                &mut proofs[9] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "dcec74631415edf80085bdb0907dfb4dd6928db21ebe31b201b1c61cd5a6b412",
                &mut proofs[10] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "e1c181e05f242407fcce79feb83cad315d8d86e5d668f8fa8586d92f7eab082e",
                &mut proofs[11] as &mut [u8]
            ),
            Ok(())
        );

        let mut key = [0u8; 32];
        let mut value = [0u8; 32];
        assert_eq!(
            hex::decode_to_slice(
                "000000000000000000000000000000000000000000000031494e43482d444149",
                &mut key as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "000000000000000000000000000000000000000000000000259ae7ce85275000",
                &mut value as &mut [u8]
            ),
            Ok(())
        );

        let cpi_program = ctx.accounts.cpi_return_program.to_account_info();

        let cpi_accounts = Verify {
            block: ctx.accounts.block.to_account_info(),
            verify_result: ctx.accounts.cpi_return.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let _result = chain::cpi::verify_proof_for_block(cpi_ctx, _seed, proofs, key, value)?;
        Ok(())
    }

    pub fn cpi_call_verify_false_tempered_proofs(
        ctx: Context<CpiReturnContext>,
        _seed: Vec<u8>,
    ) -> Result<()> {
        let mut proofs = vec![[0u8; 32]; 12];
        assert_eq!(
            hex::decode_to_slice(
                "8aa4e4134178289504b4b6c7c85527b41905cf3d51ad95eaec44a87fbe773b82",
                &mut proofs[0] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "2555c92539183bfa28387c6e98403aeb44f8b7602d0580e4679f2432405b62b1",
                &mut proofs[1] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "6bb2d161e2d374a8aa779e0c61ecef7e82b7a6ba6543bf997212ea164c7ec540",
                &mut proofs[2] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "e3cd6c525d52487eb7439d1042dbd917a9b421fd2656a98a6f8af593fd4f4453",
                &mut proofs[3] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "39afef9403f6ccd794a1bf6c48a55a0d4164d8ab9f32992410f62629bd57a6b7",
                &mut proofs[4] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "72d0fddd950ac6ce7f54a48d4003843d526ee02fc21d8c305012bdd17f7058af",
                &mut proofs[5] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "fb1199eb1639a574b06bd4f2fc619a9004fb55dd9016c6b24c4c79498a24099f",
                &mut proofs[6] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "fa9e1fb3aa77f7249c18bd4dbd99bd9c3766a6bf6ab00eac7d5380732059566a",
                &mut proofs[7] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "81b18433beaada4ee9a058a3eb1580498a61789809abb60517ec0ca5e0bcf948",
                &mut proofs[8] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "a8440a4bf999006045d796a91e23fec4b23eee861ba9735d41dc804a76ae0643",
                &mut proofs[9] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "dcec74631415edf80085bdb0907dfb4dd6928db21ebe31b201b1c61cd5a6b412",
                &mut proofs[10] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "deadbeaf5f242407fcce79feb83cad315d8d86e5d668f8fa8586d92f7eab082e",
                &mut proofs[11] as &mut [u8]
            ),
            Ok(())
        );

        let mut key = [0u8; 32];
        let mut value = [0u8; 32];
        assert_eq!(
            hex::decode_to_slice(
                "000000000000000000000000000000000000000000000031494e43482d444149",
                &mut key as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "000000000000000000000000000000000000000000000000259ae7ce85275000",
                &mut value as &mut [u8]
            ),
            Ok(())
        );

        let cpi_program = ctx.accounts.cpi_return_program.to_account_info();

        let cpi_accounts = Verify {
            block: ctx.accounts.block.to_account_info(),
            verify_result: ctx.accounts.cpi_return.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let _result = chain::cpi::verify_proof_for_block(cpi_ctx, _seed, proofs, key, value)?;
        Ok(())
    }

    pub fn cpi_call_verify_false_tempered_key(
        ctx: Context<CpiReturnContext>,
        _seed: Vec<u8>,
    ) -> Result<()> {
        let mut proofs = vec![[0u8; 32]; 12];
        assert_eq!(
            hex::decode_to_slice(
                "8aa4e4134178289504b4b6c7c85527b41905cf3d51ad95eaec44a87fbe773b82",
                &mut proofs[0] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "2555c92539183bfa28387c6e98403aeb44f8b7602d0580e4679f2432405b62b1",
                &mut proofs[1] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "6bb2d161e2d374a8aa779e0c61ecef7e82b7a6ba6543bf997212ea164c7ec540",
                &mut proofs[2] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "e3cd6c525d52487eb7439d1042dbd917a9b421fd2656a98a6f8af593fd4f4453",
                &mut proofs[3] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "39afef9403f6ccd794a1bf6c48a55a0d4164d8ab9f32992410f62629bd57a6b7",
                &mut proofs[4] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "72d0fddd950ac6ce7f54a48d4003843d526ee02fc21d8c305012bdd17f7058af",
                &mut proofs[5] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "fb1199eb1639a574b06bd4f2fc619a9004fb55dd9016c6b24c4c79498a24099f",
                &mut proofs[6] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "fa9e1fb3aa77f7249c18bd4dbd99bd9c3766a6bf6ab00eac7d5380732059566a",
                &mut proofs[7] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "81b18433beaada4ee9a058a3eb1580498a61789809abb60517ec0ca5e0bcf948",
                &mut proofs[8] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "a8440a4bf999006045d796a91e23fec4b23eee861ba9735d41dc804a76ae0643",
                &mut proofs[9] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "dcec74631415edf80085bdb0907dfb4dd6928db21ebe31b201b1c61cd5a6b412",
                &mut proofs[10] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "e1c181e05f242407fcce79feb83cad315d8d86e5d668f8fa8586d92f7eab082e",
                &mut proofs[11] as &mut [u8]
            ),
            Ok(())
        );

        let mut key = [0u8; 32];
        let mut value = [0u8; 32];
        assert_eq!(
            hex::decode_to_slice(
                "000000000000000000000000000000000000000000000031494e4348deadbeaf",
                &mut key as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "000000000000000000000000000000000000000000000000259ae7ce85275000",
                &mut value as &mut [u8]
            ),
            Ok(())
        );

        let cpi_program = ctx.accounts.cpi_return_program.to_account_info();

        let cpi_accounts = Verify {
            block: ctx.accounts.block.to_account_info(),
            verify_result: ctx.accounts.cpi_return.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let _result = chain::cpi::verify_proof_for_block(cpi_ctx, _seed, proofs, key, value)?;
        Ok(())
    }

    pub fn cpi_call_verify_false_tempered_value(
        ctx: Context<CpiReturnContext>,
        _seed: Vec<u8>,
    ) -> Result<()> {
        let mut proofs = vec![[0u8; 32]; 12];
        assert_eq!(
            hex::decode_to_slice(
                "8aa4e4134178289504b4b6c7c85527b41905cf3d51ad95eaec44a87fbe773b82",
                &mut proofs[0] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "2555c92539183bfa28387c6e98403aeb44f8b7602d0580e4679f2432405b62b1",
                &mut proofs[1] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "6bb2d161e2d374a8aa779e0c61ecef7e82b7a6ba6543bf997212ea164c7ec540",
                &mut proofs[2] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "e3cd6c525d52487eb7439d1042dbd917a9b421fd2656a98a6f8af593fd4f4453",
                &mut proofs[3] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "39afef9403f6ccd794a1bf6c48a55a0d4164d8ab9f32992410f62629bd57a6b7",
                &mut proofs[4] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "72d0fddd950ac6ce7f54a48d4003843d526ee02fc21d8c305012bdd17f7058af",
                &mut proofs[5] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "fb1199eb1639a574b06bd4f2fc619a9004fb55dd9016c6b24c4c79498a24099f",
                &mut proofs[6] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "fa9e1fb3aa77f7249c18bd4dbd99bd9c3766a6bf6ab00eac7d5380732059566a",
                &mut proofs[7] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "81b18433beaada4ee9a058a3eb1580498a61789809abb60517ec0ca5e0bcf948",
                &mut proofs[8] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "a8440a4bf999006045d796a91e23fec4b23eee861ba9735d41dc804a76ae0643",
                &mut proofs[9] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "dcec74631415edf80085bdb0907dfb4dd6928db21ebe31b201b1c61cd5a6b412",
                &mut proofs[10] as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "e1c181e05f242407fcce79feb83cad315d8d86e5d668f8fa8586d92f7eab082e",
                &mut proofs[11] as &mut [u8]
            ),
            Ok(())
        );

        let mut key = [0u8; 32];
        let mut value = [0u8; 32];
        assert_eq!(
            hex::decode_to_slice(
                "000000000000000000000000000000000000000000000031494e43482d444149",
                &mut key as &mut [u8]
            ),
            Ok(())
        );
        assert_eq!(
            hex::decode_to_slice(
                "000000000000000000000000000000000000000000000000259ae7cedeadbeaf",
                &mut value as &mut [u8]
            ),
            Ok(())
        );

        let cpi_program = ctx.accounts.cpi_return_program.to_account_info();

        let cpi_accounts = Verify {
            block: ctx.accounts.block.to_account_info(),
            verify_result: ctx.accounts.cpi_return.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let _result = chain::cpi::verify_proof_for_block(cpi_ctx, _seed, proofs, key, value)?;
        Ok(())
    }

    pub fn cpi_call_verify_proof_for_block(
        ctx: Context<CpiReturnContext>,
        _seed: Vec<u8>,
        proofs: Vec<[u8; 32]>,
        key: [u8; 32],
        value: [u8; 32],
    ) -> Result<()> {
        let cpi_program = ctx.accounts.cpi_return_program.to_account_info();

        let cpi_accounts = Verify {
            block: ctx.accounts.block.to_account_info(),
            verify_result: ctx.accounts.cpi_return.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let _result = chain::cpi::verify_proof_for_block(cpi_ctx, _seed, proofs, key, value)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CpiReturnContext<'info> {
    #[account(mut)]
    pub cpi_return: Account<'info, VerifyResult>,
    pub block: Account<'info, Block>,
    pub cpi_return_program: Program<'info, Chain>,
}

#[derive(Accounts)]
pub struct FirstClassDataContext<'info> {
    pub fcd: Account<'info, FirstClassData>,
}
