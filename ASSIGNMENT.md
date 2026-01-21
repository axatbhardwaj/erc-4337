# Assignment: Build Your Own ERC-4337 Smart Account & Bundler

**Objective:**
Manually construct a "UserOperation," act as your own Bundler, and execute it on the Sepolia testnet. You will deploy a Smart Account and make it send a transaction in a single step using standard Ethers.js and Solidity.

---

## Part 1: Setup

1.  **Initialize a Node.js project**:
    ```bash
    npm init -y
    ```
2.  **Install dependencies:**
    *   `ethers` (v6 recommended)
    *   `solc` (Solidity compiler)
    *   `@account-abstraction/contracts` (contains the official interfaces and the EntryPoint artifact)
    *   `dotenv` (for managing environment variables)
3.  **Configuration:**
    *   Create a `.env` file.
    *   Add `RPC_URL` (Alchemy/Infura for Sepolia) and `PRIVATE_KEY` (your Signer).

---

## Part 2: The Smart Contracts

Create a folder `contracts/` and add these two files:

### 1. `MinimalAccount.sol`
A simplified smart wallet compliant with ERC-4337.
*   **Inheritance:** Inherit from `BaseAccount` (from `@account-abstraction/contracts`).
*   **Storage:** Store an `address public owner`.
*   **Validation:** Implement `_validateSignature`.
    *   It should verify the signature against the `owner`.
    *   Return `0` if valid, `SIG_VALIDATION_FAILED` (1) if not.
    *   *Tip:* Use `ECDSA.recover` (OpenZeppelin) or `Etch.recover`.
*   **Execution:**
    *   Create a function `execute` that takes `dest`, `value`, and `func`.
    *   Only the `EntryPoint` should be allowed to call this.

### 2. `MinimalAccountFactory.sol`
A factory to deploy your account using `CREATE2` (deterministic deployment).
*   **Function:** `createAccount(address owner, uint256 salt)`.
*   It should deploy a new `MinimalAccount` if it doesn't exist yet.
*   It should return the address of the account.

### 3. Compilation Script
Since we are not using Hardhat, create a script `compile.js` to compile your contracts.
*   Read the Solidity files.
*   Use `solc` to compile them.
*   Save the **ABI** and **Bytecode** to JSON files (e.g., in a `out/` folder) so they can be used by your bundler script.

---

## Part 3: The "Bundler" Script

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
    *   *Note:* You will need to deploy the Factory first if it's not on-chain, or use an existing one. For this assignment, **deploy your Factory first** using a simple deploy script, then use its address here.
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

## Part 4: Verification

1.  Check Etherscan for your new Smart Account address.
2.  You should see:
    *   **Internal Tx:** The Factory deploying the contract.
    *   **Token Transfer/Call:** The execution logic you put in `callData`.

---

## Part 5: Bonus - Build Your Own EntryPoint

To fully understand the "magic" of ERC-4337, try building a stripped-down version of the EntryPoint contract.

### 1. `SimpleEntryPoint.sol`
Create a contract that implements the core loop of account abstraction: **Verification** and **Execution**.

*   **Function:** `handleOps(UserOperation[] calldata ops)`.
*   **Logic (Pseudo-code):**
    ```solidity
    function handleOps(UserOperation[] calldata ops) external {
        for (uint i = 0; i < ops.length; i++) {
            UserOperation calldata op = ops[i];
            
            // 1. Calculate the UserOpHash
            bytes32 userOpHash = keccak256(abi.encode(op)); // Simplified hash for this exercise
            
            // 2. Verification Step
            // Call validateUserOp on the sender (the Smart Account)
            // Note: In production, you must check the return signature and pay gas.
            try IAccount(op.sender).validateUserOp(op, userOpHash, 0) returns (uint256 validationData) {
                require(validationData == 0, "Validation failed");
            } catch {
                revert("Validation reverted");
            }

            // 3. Execution Step
            // Call the account with the callData
            (bool success, ) = address(op.sender).call(op.callData);
            require(success, "Execution failed");
        }
    }
    ```
*   *Note:* The official EntryPoint has complex logic for gas payment, staking, and protection against DoS vectors. This simple version ignores those for educational purposes.

### 2. Testing Your EntryPoint
To test this, you cannot use the `MinimalAccount` from Part 2 *as is*, because it likely hardcoded the official EntryPoint address or set it in the constructor.

1.  Deploy `SimpleEntryPoint`.
2.  Deploy a **new** `MinimalAccount` (or Factory) that accepts your `SimpleEntryPoint` address in its constructor.
3.  Point your `execute_user_op.js` script to your new `SimpleEntryPoint` address.
