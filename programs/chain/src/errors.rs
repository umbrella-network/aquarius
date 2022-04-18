use anchor_lang::prelude::*;

#[error_code]
pub enum ChainError {
    NotInitializer,
    NotReplicator,
    CannotSubmitOlderData,
    DoNotSpam,
    OnlyOwnerViolation,
    WrongFCDKeyForAccount,
}
