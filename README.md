# Ember

A MetaMask-style Ethereum wallet that lives in the browser. Create a new 12-word recovery phrase or import one you already have, then connect to dApps, sign messages, and send ETH.

Ember is a **local wallet**. The phrase is encrypted with your password (AES-GCM + PBKDF2) and stored in `localStorage`. It is never sent to a server.

## Try it

```bash
npm install
npm run dev -- --port 43173
```

Open [http://localhost:43173](http://localhost:43173). The left pane is a demo dApp (Hearth Swap). The right pane is Ember.

1. Create a wallet or import a 12-word phrase.
2. Unlock Ember.
3. In Hearth Swap, click **Connect Ember** and confirm in the wallet.
4. Sign in, sign a swap order, or send a zero-value self-check transaction.

Default network is **Sepolia**. Switch networks from the wallet header.

## What it does

- BIP-39 12-word create / import (`m/44'/60'/0'/0/index`, same as MetaMask)
- Password-encrypted vault, lock / unlock
- Multiple HD accounts
- Ethereum, Sepolia, Base, Arbitrum, Optimism, Polygon
- Native send, receive QR, token balances (ETH + USDC)
- EIP-1193 `window.ethereum` + EIP-6963 announce so dApps can find Ember
- Connect, `personal_sign`, EIP-712 typed data, `eth_sendTransaction`, `wallet_switchEthereumChain`
- Activity list with explorer links

## Safety

- Prefer a **new phrase** or a testnet account while you evaluate Ember.
- A page wallet is more exposed to XSS than a browser extension. Do not use a phrase that holds funds you cannot lose.
- Resetting the wallet deletes the local vault. If you did not write the phrase down, the accounts are gone.

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui, viem, `@scure/bip39`.
