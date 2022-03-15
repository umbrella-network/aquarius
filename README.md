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


5. Create keypair to use for testing:

```shell
solana-keygen new --force
```
This should create the following output file: ~/.config/solana/id.json

6. Request some testnet SOL via airdrop program:

```shell
solana airdrop 5
```
note: sometimes 5 is too much - in that case retry with 2

7. Compile rust programs / build bytecode artifacts

```shell
npm run build:program-rust
```

8. Deploy specific program to target cluster:

```shell
solana pogram deploy dist/program/{program_name}.so
```

-or-

9. Run tests, which include deployments:

- For running rust tests
```shell
npm run test:rust
```

- For running typescript client tests
```shell
npm run test:client
```