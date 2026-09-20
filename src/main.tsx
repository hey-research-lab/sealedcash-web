import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { wagmiAdapter } from '@/lib/reown';
import { setBaseUrl } from '@/api';

import './index.css';

setBaseUrl(import.meta.env.VITE_API_BASE_URL || null);

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <App />
    </WagmiProvider>
  </ErrorBoundary>,
);
