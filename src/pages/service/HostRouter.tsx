import { ReactNode, useEffect, useState } from 'react';
import { ProverServicePage } from './ProverServicePage';
import { RelayerServicePage } from './RelayerServicePage';
import { IndexerServicePage } from './IndexerServicePage';

export function HostRouter({ children }: { children: ReactNode }) {
  const [hostname, setHostname] = useState(window.location.hostname);

  useEffect(() => {
    const handleLocationChange = () => setHostname(window.location.hostname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const name = hostname.toLowerCase();
  
  if (name.startsWith('prover.') || name === 'prover.sealedcash.com') {
    return <ProverServicePage />;
  }
  
  if (name.startsWith('relayer.') || name === 'relayer.sealedcash.com') {
    return <RelayerServicePage />;
  }
  
  if (name.startsWith('indexer.') || name === 'indexer.sealedcash.com') {
    return <IndexerServicePage />;
  }

  // Also support query param for testing in dev environments
  const searchParams = new URLSearchParams(window.location.search);
  const fakeHost = searchParams.get('host');
  if (fakeHost === 'prover') return <ProverServicePage />;
  if (fakeHost === 'relayer') return <RelayerServicePage />;
  if (fakeHost === 'indexer') return <IndexerServicePage />;

  return <>{children}</>;
}
