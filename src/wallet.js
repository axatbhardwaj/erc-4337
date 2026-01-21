import { ethers } from "ethers";

const walletSeed = process.env.WALLET_SEED;
const rpcUrl = process.env.RPC_URL;

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(walletSeed, provider);

export { wallet };
