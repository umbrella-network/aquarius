use crate::errors::ChainError;
use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Authority {
    pub owner: Pubkey
}

#[account]
#[derive(Default)]
pub struct Block {
    pub block_id: u32,
    pub root: [u8; 32],
    pub timestamp: u32
}

#[account]
#[derive(Default)]
pub struct Status {
    pub padding: u32,
    pub last_id: u32,
    pub last_data_timestamp: u32,
    pub next_block_id: u32
}

#[account]
#[derive(Default)]
pub struct FirstClassData {
    pub key: String,
    pub value: [u8; 32],
    pub timestamp: u32
}

#[account]
#[derive(Default)]
pub struct VerifyResult {
    pub root: [u8; 32],
    pub result: bool,
}
