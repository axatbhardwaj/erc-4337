# Assignment: Build Your Own ERC-4337 Bundler (Off-Chain)

**Objective:**
Manually construct a "UserOperation," act as your own Bundler, and execute it on the Sepolia testnet.

---

## Part 1: Setup

1.  **Initialize a Bun project**:
    ```bash
    bun init -y
    ```
2.  **Install dependencies:**
    *   `ethers` (v6 recommended)
    *   `solc` (Solidity compiler)
    *   `@account-abstraction/contracts` (contains the official interfaces and the EntryPoint artifact)
    *   *Note: Bun loads `.env` files automatically, so `dotenv` is not required.*
3.  **Configuration:**
    *   Create a `.env` file.
    *   Add `RPC_URL` (Alchemy/Infura for Sepolia) and `PRIVATE_KEY` (your Signer).

---

## Part 2: The "Bundler" Script

Create a script `execute_user_op.js`. This script will act as the Bundler.

### Task A: Constants & Setup
*   **EntryPoint Address:** `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` (Sepolia canonical).
*   **Provider & Signer:** Initialize an `ethers.JsonRpcProvider` and `ethers.Wallet` using your config.

### Task B: Get the Smart Account Address
*   Load the `MinimalAccountFactory` ABI and Bytecode.
*   Use `ethers.getCreate2Address` or interact with the Factory contract (if already deployed) to calculate the *counterfactual address*.
*   **Do not deploy it yet.** We will deploy it via the UserOp.

### Task C: Funding
*   Send 0.01 Sepolia ETH to the *counterfactual address* calculated in Task B.
*   *Why?* The Smart Account needs to pay the EntryPoint for gas during the transaction.

### Task D: Construct the `UserOperation`
Construct a JSON object conforming to the `UserOperation` struct:
1.  **sender:** Your calculated Smart Account address.
2.  **nonce:** `0` (since it's new).
3.  **initCode:**
    *   This is crucial. It tells EntryPoint "if this contract doesn't exist, create it first".
    *   Format: `[Factory Address] + [Interface.encodeFunctionData("createAccount", ...)]`.
    *   *Note:* You will need to deploy the Factory first if it's not on-chain, or use an existing one.
4.  **callData:**
    *   The action you want to take.
    *   Format: `[Interface.encodeFunctionData("execute", [dest, value, data])]`.
5.  **gasLimits:**
    *   `callGasLimit`, `verificationGasLimit`, `preVerificationGasLimit`. Set these manually (e.g., `200000`, `1000000`, `50000` respectively) or estimate them.
6.  **gasPrices:**
    *   `maxFeePerGas`, `maxPriorityFeePerGas`. Get these from the provider (`provider.getFeeData()`).
7.  **paymasterAndData:** `0x` (we are paying for ourselves).
8.  **signature:** Set to `0x` initially.

### Task E: Signing
1.  **Pack** the UserOp (excluding signature).
    *   You can use `ethers.AbiCoder` or a helper library.
2.  **Hash** it using `EntryPoint.getUserOpHash(userOp)`.
3.  **Sign** the hash with your private key.
4.  Put the signature back into the `UserOperation` object.

### Task F: Submission (The "Bundle")
1.  Create an instance of the **EntryPoint** contract using `ethers.Contract`.
2.  Call `entryPoint.handleOps([userOp], signerAddress)`.
3.  Wait for the transaction receipt.

---

## Part 3: Verification

1.  Check Etherscan for your new Smart Account address.
2.  You should see:
    *   **Internal Tx:** The Factory deploying the contract.
    *   **Token Transfer/Call:** The execution logic you put in `callData`.
