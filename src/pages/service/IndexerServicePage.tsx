import { useEffect } from 'react';
import { getGetZcashStatusQueryKey, useGetZcashStatus } from '@/api';
import { ServiceLayout } from './ServiceLayout';
import { Loader2, Database, Network } from 'lucide-react';

export function IndexerServicePage() {
  useEffect(() => {
    document.title = 'SealedCash Indexer | Chain State Synchronization';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Chain state indexing and synchronization for SealedCash protocol events.');
  }, []);

  const { data: status, isLoading, isError } = useGetZcashStatus({
    query: {
      queryKey: getGetZcashStatusQueryKey(),
      refetchInterval: 10000,
    }
  });

  const isMonitorReady = !isError && status?.components?.settlementMonitor === true;
  const isNodeReady = !isError && status?.components?.node === true;
  const isOverallReady = isMonitorReady && isNodeReady;
  
  return (
    <ServiceLayout name="Indexer Service">
      <div className="svc-eyebrow">
        <div className={`svc-status-dot ${isOverallReady ? 'active' : ''}`} />
        {isLoading ? 'Checking readiness' : isError ? 'Status Unavailable' : isOverallReady ? 'Indexer Ready' : 'Indexer Not Ready'}
      </div>
      
      <h1 className="svc-title">Chain State Synchronization</h1>
      <p className="svc-lead">
        The Indexer Service reads finalized privacy-pool events from Robinhood Chain and maintains the protocol checkpoint used by SealedCash monitoring.
      </p>

      <div className="svc-grid">
        <div className="svc-card">
          <div className="svc-card-header">
            <span>Settlement Monitor</span>
            <span className={`svc-badge ${isMonitorReady ? 'ready' : ''}`}>{isMonitorReady ? 'Ready' : 'Not Ready'}</span>
          </div>
          <div className="svc-card-value">
            {isLoading ? <Loader2 size={20} className="spin" /> : <Database size={20} />}
            Event Ingestion
          </div>
          <div className="svc-card-desc">
             Finalized event ingestion with configured confirmation depth and deployment identity checks.
          </div>
        </div>

        <div className="svc-card">
          <div className="svc-card-header">
            <span>RPC Node</span>
            <span className={`svc-badge ${isNodeReady ? 'ready' : ''}`}>{isNodeReady ? 'Connected' : 'Offline'}</span>
          </div>
          <div className="svc-card-value">
            {isLoading ? <Loader2 size={20} className="spin" /> : <Network size={20} />}
            Upstream Connection
          </div>
          <div className="svc-card-desc">
            Configured Robinhood Chain RPC access for block, receipt, and protocol event reads.
          </div>
        </div>
      </div>

      <div className="svc-terminal">
        <div className="svc-terminal-header">
          <div className={`svc-status-dot ${isOverallReady ? 'active' : ''}`} style={{ width: 6, height: 6 }} />
          syslog • indexer-mainnet
        </div>
        <div className="svc-terminal-body">
          <div className="svc-terminal-line">
            <span className="svc-terminal-time">{new Date().toISOString().split('T')[1].split('.')[0]}</span>
            <span>{isLoading ? 'Polling indexer readiness...' : isError ? 'Readiness endpoint unavailable. Retrying.' : isOverallReady ? 'Node and settlement monitor are configured.' : 'Indexer not ready. Monitoring remains fail-closed.'}</span>
          </div>
        </div>
      </div>
    </ServiceLayout>
  );
}
