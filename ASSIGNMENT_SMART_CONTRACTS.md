# Assignment: ERC-4337 Smart Contracts

**Objective:**
Develop the necessary smart contracts for a custom Account Abstraction implementation on Sepolia testnet.

---

## Part 1: The Smart Contracts

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

## Part 2: Bonus - Build Your Own EntryPoint

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
To test this, you cannot use the `MinimalAccount` from Part 1 *as is*, because it likely hardcoded the official EntryPoint address or set it in the constructor.

1.  Deploy `SimpleEntryPoint`.
2.  Deploy a **new** `MinimalAccount` (or Factory) that accepts your `SimpleEntryPoint` address in its constructor.
3.  Point your `execute_user_op.js` script to your new `SimpleEntryPoint` address.
