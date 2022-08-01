![Umbrella network - logo](./assets/umb.network-logo.png)

# Aquarius

Umbrella Network's Solana program repository.  The Solana programs are written in rust and compiled to a BPF bytecode variant which can be deployed to a local validator cluster, to one of the public testnets, or mainnet beta.  Development uses the `anchor` framework which includes rust abstractions for program development, cli build, deployment and testing tools.
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

3. Install yarn, which is required for anchor:

```shell
npm i -g corepack
```

source: https://yarnpkg.com/getting-started/install

4. Install anchor:

```shell
npm i -g @project-serum/anchor-cli
```

source: https://book.anchor-lang.com/chapter_2/installation.html

5. Install dependencies:

```shell
npm install
```

6. Setup solana dev environment (not required for building, deploying, testing with anchor):

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
- Then start the validator in a separate terminal window, if required:

```shell
solana-test-validator
```
note: this will create a dir in the working directory called 'test-ledger' which will store the blockchain / log data for the validator.
note: if testing using anchor against local validator, then this validator must be stopped


7. Create keypair to use for testing:

```shell
solana-keygen new --force
```
This should create the following output file: ~/.config/solana/id.json

8. Request some testnet SOL via airdrop program (not required for building, deploying, testing with anchor):

```shell
solana airdrop 5
```
note: sometimes 5 is too much - in that case retry with 2


9. Set the target cluster in the Anchor.toml file:

For local test validator:
```shell
[provider]
cluster = "localnet"
```

For devnet:
```shell
[provider]
cluster = "devnet"
```

10. Compile rust programs / build bytecode artifacts:

```shell
anchor build
```

11. Get program ID's to update in lib source files:

```shell
anchor keys list
```
Then update the following line in each program's lib.rs file with the correct program ID:
```shell
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
```

Then ensure the following line contains the correct ID for each program in Anchor.toml:
```shell
[programs.localnet]
blocks = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
```

12. Also update the following line in programs/chain/src/instructions/initialize.rs with your public key:

```shell
static INITIALIZER: &'static str = "BWujass7Wx77tKWYyckdNnBav6pjVA3tuaDvLAdpfS67";
```

13. Run tests, which include deployments:

- For running rust tests
```shell
anchor test
```

14. Deploy program on devnet/mainnet:

```shell
anchor deploy --provider.cluster <Anchor.toml config> --program-name <program_name>
```
