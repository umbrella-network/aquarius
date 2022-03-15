![Umbrella network - logo](./assets/umb.network-logo.png)

# Aquarius

Umbrella Network's Solana integration repository.  The Solana programs are written in rust and compiled to a BPF bytecode variant which can be deployed to a local validator cluster, to one of the public testnets, or mainnet beta.

## Setup for Dev Environment

1. Install rust:

```shell
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

source: https://www.rust-lang.org/tools/install

2. Install solana CLI tools:

```shell
sh -c "$(curl -sSfL https://release.solana.com/v1.9.12/install)"
```
Ensure that the solana program path is included in your PATH env variable.

source: https://docs.solana.com/cli/install-solana-cli-tools

3. Install dependencies:

```shell
npm install
```

4. Setup solana dev environment:

OPTION A - public devnet
- To use the public 'devnet' cluster, use the following command to configure solana:

```shell
solana config set --url https://api.devnet.solana.com
```
OPTION B - local validator
- To deploy and test against a local validator, use the following to configure solana:

```shell
solana config set --url http://localhost:8899
```
- Then start the validator in a separate terminal window:

```shell
solana-test-validator
```
note: this will create a dir in the working directory called 'test-ledger' which will store the blockchain / log data for the validator.


5. Create keypair
6. Request airdrop
7. Compile rust programs / build bytecode artifacts
8. Deploy to target cluster
- or -
9. Run tests, which include deployments