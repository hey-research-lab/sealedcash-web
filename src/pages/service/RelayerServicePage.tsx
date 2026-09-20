import { useEffect } from 'react';
import { getGetZcashStatusQueryKey, useGetZcashStatus } from '@/api';
import { ServiceLayout } from './ServiceLayout';
import { Loader2, Route, LockKeyhole } from 'lucide-react';

export function RelayerServicePage() {
  useEffect(() => {
    document.title = 'SealedCash Relayer | Private Transaction Transport';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Private transaction relay and transport layer for SealedCash.');
  }, []);

  const { data: status, isLoading, isError } = useGetZcashStatus({
    query: {
      queryKey: getGetZcashStatusQueryKey(),
      refetchInterval: 10000,
    }
  });

  const isReady = !isError && status?.components?.relayer === true;
  
  return (
    <ServiceLayout name="Relayer Service">
      <div className="svc-eyebrow">
        <div className={`svc-status-dot ${isReady ? 'active' : ''}`} />
        {isLoading ? 'Checking readiness' : isError ? 'Status Unavailable' : isReady ? 'Relayer Available' : 'Relayer Not Ready'}
      </div>
      
      <h1 className="svc-title">Private Transport Layer</h1>
      <p className="svc-lead">
        The Relayer Service submits verified SealedCash operations to Robinhood Chain. It keeps transaction submission separate from proof generation and fails closed when its authenticated upstream is unavailable.
      </p>

      <div className="svc-grid">
        <div className="svc-card">
          <div className="svc-card-header">
            <span>Component Status</span>
            <span className={`svc-badge ${isReady ? 'ready' : ''}`}>{isReady ? 'Ready' : 'Offline'}</span>
          </div>
          <div className="svc-card-value">
            {isLoading ? <Loader2 size={20} className="spin" /> : <Route size={20} />}
            Transaction Relay
          </div>
          <div className="svc-card-desc">
            Authenticated submission of verified proof packages to Robinhood Chain.
          </div>
        </div>

        <div className="svc-card">
          <div className="svc-card-header">
            <span>Network Context</span>
            <span className="svc-badge">Robinhood Chain</span>
          </div>
          <div className="svc-card-value">
            {isLoading ? <Loader2 size={20} className="spin" /> : <LockKeyhole size={20} />}
            Identity Protection
          </div>
          <div className="svc-card-desc">
            User-configured relayer fees are bound into the proof inputs and enforced by the privacy pool.
          </div>
        </div>
      </div>

      <div className="svc-terminal">
        <div className="svc-terminal-header">
          <div className={`svc-status-dot ${isReady ? 'active' : ''}`} style={{ width: 6, height: 6 }} />
          syslog • relayer-mainnet
        </div>
        <div className="svc-terminal-body">
          <div className="svc-terminal-line">
            <span className="svc-terminal-time">{new Date().toISOString().split('T')[1].split('.')[0]}</span>
            <span>{isLoading ? 'Polling service readiness...' : isError ? 'Readiness endpoint unavailable. Retrying.' : isReady ? 'Authenticated relayer upstream configured.' : 'Relayer not ready. Submissions remain disabled.'}</span>
          </div>
        </div>
      </div>
    </ServiceLayout>
  );
}
