use anchor_lang::prelude::*;
use instructions::*;

pub mod errors;
pub mod instructions;
pub mod state;

declare_id!("4SPgs3L7Ey9VyRuZwx4X3y86LSAZXP2Hhpz9Sps4v3iT");

#[program]
pub mod chain {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        padding: u32
    ) -> Result<()> {
        instructions::initialize::initialize(
            ctx,
            padding
        )
    }

    pub fn transfer_ownership(
        ctx: Context<TransferOwnership>,
    ) -> Result<()> {
        instructions::transfer_ownership::transfer_ownership(ctx)
    }

    pub fn set_padding(
        ctx: Context<SetPadding>,
        padding: u32
    ) -> Result<()> {
        instructions::set_padding::set_padding(ctx, padding)
    }

    pub fn submit(
        ctx: Context<Submit>,
        seed: Vec<u8>,
        block_id: u32,
        root: [u8; 32],
        timestamp: u32
    ) -> Result<()> {
        instructions::submit::submit(
            ctx,
            seed,
            block_id,
            root,
            timestamp
        )
    }

    pub fn initialize_first_class_data(
        ctx: Context<InitializeFirstClassData>,
        seed: Vec<u8>,
        key: String,
        value: [u8; 32],     // placeholder - update this to use U256 struct from spl_math crate
        timestamp: u32
    ) -> Result<()> {
        instructions::initialize_first_class_data::initialize_first_class_data(
            ctx,
            seed,
            key,
            value,
            timestamp
        )
    }

    pub fn update_first_class_data(
        ctx: Context<UpdateFirstClassData>,
        key: String,
        value: [u8; 32],
        timestamp: u32
    ) -> Result<()> {
        instructions::update_first_class_data::update_first_class_data(
            ctx,
            key,
            value,
            timestamp
        )
    }
}