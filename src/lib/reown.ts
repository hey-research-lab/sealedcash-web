import { createAppKit } from '@reown/appkit/react';
import { defineChain, type AppKitNetwork } from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

export const robinhoodChain = defineChain({
  id: 4663,
  caipNetworkId: 'eip155:4663',
  chainNamespace: 'eip155',
  name: 'Robinhood Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_CHAIN_RPC_URL || 'https://rpc.example.invalid'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Robinhood Chain Explorer',
      url: import.meta.env.VITE_CHAIN_EXPLORER_URL || 'https://explorer.example.invalid',
    },
  },
});

export const reownNetworks: [AppKitNetwork] = [robinhoodChain];

const metadata = {
  name: 'SealedCash',
  description: 'Wallet-authenticated Robinhood Chain reads and private route-intent records. Swap execution requires verified integrations.',
  url: 'https://sealedcash.com',
  icons: ['https://sealedcash.com/favicon-512.png'],
};

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error('VITE_REOWN_PROJECT_ID is required to initialize wallet connections.');
}

export const wagmiAdapter = new WagmiAdapter({
  networks: reownNetworks,
  projectId,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: reownNetworks,
  projectId,
  metadata,
  // Do not interrupt the landing page for a previously connected wallet that
  // is currently on another network. Network changes are requested only when
  // the user explicitly opens the wallet flow or submits an on-chain action.
  allowUnsupportedChain: true,
});