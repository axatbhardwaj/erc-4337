# ERC-4337 Account Abstraction Solution

This document describes the working ERC-4337 implementation on Sepolia testnet.

## Deployed Contracts

| Contract | Address | Etherscan |
|----------|---------|-----------|
| EntryPoint (v0.7) | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | [View](https://sepolia.etherscan.io/address/0x0000000071727De22E5E9d8BAf0edAc6f37da032) |
| MinimalAccountFactory | `0x38b37ff60729f548F8Df62A2dbeDedDFCCb539F5` | [View](https://sepolia.etherscan.io/address/0x38b37ff60729f548F8Df62A2dbeDedDFCCb539F5) |
| BundlerPaymaster | `0x80306570EF600350484781082A4886C46C11D623` | [View](https://sepolia.etherscan.io/address/0x80306570EF600350484781082A4886C46C11D623) |
| Smart Account | `0xF894A59B5424f519A44aD88417D296D6c76E1f45` | [View](https://sepolia.etherscan.io/address/0xF894A59B5424f519A44aD88417D296D6c76E1f45) |

## Successful Transactions

| Script | Bundle TX | Block |
|--------|-----------|-------|
| sendEth.js | [`0xed00b142be93bfd59c994d8221d4fc2b2285f2ceb1fb3dd43d9a7ac3a5875af8`](https://sepolia.etherscan.io/tx/0xed00b142be93bfd59c994d8221d4fc2b2285f2ceb1fb3dd43d9a7ac3a5875af8) | 10115827 |
| sendEthSponsored.js | [`0x756f2dc8b53d6f2a7eeb5d84cdf52895bdd8b71c3eb3070827e9921c760b1048`](https://sepolia.etherscan.io/tx/0x756f2dc8b53d6f2a7eeb5d84cdf52895bdd8b71c3eb3070827e9921c760b1048) | 10115834 |
| uniswapSwap.js | [`0x02cbd60aad78c00fb6454f2ec72a803c643c1d6b2f2604a0c88acf6a97089143`](https://sepolia.etherscan.io/tx/0x02cbd60aad78c00fb6454f2ec72a803c643c1d6b2f2604a0c88acf6a97089143) | 10115838 |

## Setup Instructions

### Prerequisites

- [Bun](https://bun.sh/) runtime
- [Foundry](https://book.getfoundry.sh/) for Solidity compilation

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

Create a `.env` file:

```bash
MNEMONIC="your twelve word mnemonic phrase here"
rpc=https://1rpc.io/sepolia
```

### 3. Compile Contracts

```bash
forge build
```

### 4. Deploy Factory (if needed)

```bash
bun run src/deployFactory.js
```

### 5. Deploy Paymaster (if needed)

```bash
bun run src/deployPaymaster.js
```

## Running the Bundler

Start the bundler in a terminal:

```bash
bun run src/bundler.js
```

The bundler listens on `http://localhost:3000` and processes UserOps every 5 seconds.

## Running Scripts

### Send ETH (Self-Paid)

Send ETH from your smart account, paying gas from the account balance:

```bash
bun run scripts/sendEth.js <recipient> <amount_in_eth>
```

Example:
```bash
bun run scripts/sendEth.js 0x1234...abcd 0.001
```

### Send ETH (Paymaster Sponsored)

Send ETH with gas sponsored by the paymaster:

```bash
bun run scripts/sendEthSponsored.js <recipient> <amount_in_eth>
```

Example:
```bash
bun run scripts/sendEthSponsored.js 0x1234...abcd 0.001
```

### Uniswap Swap

Swap tokens via Uniswap V3:

```bash
bun run scripts/uniswapSwap.js <tokenIn> <tokenOut> <amountIn> [fee]
```

Examples:
```bash
# Swap ETH for USDC
bun run scripts/uniswapSwap.js ETH 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 0.001

# Swap USDC for WETH
bun run scripts/uniswapSwap.js 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 WETH 1000000
```

Fee tiers: `500` (0.05%), `3000` (0.3%), `10000` (1%)

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Script    │────▶│   Bundler   │────▶│  EntryPoint │
│  (Client)   │     │ (localhost) │     │  (Sepolia)  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           │                   ▼
                           │            ┌─────────────┐
                           │            │   Smart     │
                           │            │   Account   │
                           │            └─────────────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Paymaster  │     │   Target    │
                    │ (optional)  │     │  Contract   │
                    └─────────────┘     └─────────────┘
```

## Key Components

- **MinimalAccount**: ERC-4337 compliant smart contract wallet
- **MinimalAccountFactory**: Deploys smart accounts with CREATE2
- **BundlerPaymaster**: Sponsors gas for UserOps unconditionally
- **Bundler**: Off-chain service that batches and submits UserOps

## ERC-4337 v0.7 Notes

This implementation uses ERC-4337 v0.7 with packed UserOperation fields:

- `accountGasLimits`: packed `verificationGasLimit` (high 128 bits) + `callGasLimit` (low 128 bits)
- `gasFees`: packed `maxPriorityFeePerGas` (high 128 bits) + `maxFeePerGas` (low 128 bits)
- `paymasterAndData`: `address (20 bytes) + validationGasLimit (16 bytes) + postOpGasLimit (16 bytes)`
