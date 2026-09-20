import { useEffect } from 'react';
import { getGetZcashStatusQueryKey, useGetZcashStatus } from '@/api';
import { ServiceLayout } from './ServiceLayout';
import { Loader2, ShieldCheck, Zap } from 'lucide-react';

export function ProverServicePage() {
  useEffect(() => {
    document.title = 'SealedCash Prover | Zero-Knowledge Execution';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Zero-knowledge proof generation and execution for SealedCash private routing.');
  }, []);

  const { data: status, isLoading, isError } = useGetZcashStatus({
    query: {
      queryKey: getGetZcashStatusQueryKey(),
      refetchInterval: 10000,
    }
  });

  const isReady = !isError && status?.components?.prover === true;
  const isExecuting = !isError && status?.executionAvailable === true;
  
  return (
    <ServiceLayout name="Prover Service">
      <div className="svc-eyebrow">
        <div className={`svc-status-dot ${isReady ? 'active' : ''}`} />
        {isLoading ? 'Checking readiness' : isError ? 'Status Unavailable' : isReady ? 'Prover Available' : 'Prover Not Ready'}
      </div>
      
      <h1 className="svc-title">Zero-Knowledge Execution</h1>
      <p className="svc-lead">
        The Prover Service generates UltraHonk proofs for SealedCash privacy operations. A proof demonstrates that circuit constraints were satisfied without publishing the private witness.
      </p>

      <div className="svc-grid">
        <div className="svc-card">
          <div className="svc-card-header">
            <span>Component Status</span>
            <span className={`svc-badge ${isReady ? 'ready' : ''}`}>{isReady ? 'Ready' : 'Offline'}</span>
          </div>
          <div className="svc-card-value">
            {isLoading ? <Loader2 size={20} className="spin" /> : <ShieldCheck size={20} />}
            Proof Generation
          </div>
          <div className="svc-card-desc">
            Proof generation is enabled only when the pinned circuit artifact passes its configured integrity check.
          </div>
        </div>

        <div className="svc-card">
          <div className="svc-card-header">
            <span>Execution Status</span>
            <span className={`svc-badge ${isExecuting ? 'ready' : ''}`}>{isExecuting ? 'Active' : 'Fail-Closed'}</span>
          </div>
          <div className="svc-card-value">
            {isLoading ? <Loader2 size={20} className="spin" /> : <Zap size={20} />}
            On-Chain Execution
          </div>
          <div className="svc-card-desc">
            Private execution remains unavailable unless every production readiness component is verified.
          </div>
        </div>
      </div>

      <div className="svc-terminal">
        <div className="svc-terminal-header">
          <div className={`svc-status-dot ${isReady ? 'active' : ''}`} style={{ width: 6, height: 6 }} />
          syslog • prover-mainnet
        </div>
        <div className="svc-terminal-body">
          <div className="svc-terminal-line">
            <span className="svc-terminal-time">{new Date().toISOString().split('T')[1].split('.')[0]}</span>
            <span>{isLoading ? 'Polling service readiness...' : isError ? 'Readiness endpoint unavailable. Retrying.' : isReady ? 'UltraHonk artifact integrity verified. Prover configured.' : 'Service not ready. Proof requests remain disabled.'}</span>
          </div>
          {!isLoading && !isError && (
            <div className="svc-terminal-line">
              <span className="svc-terminal-time">{new Date().toISOString().split('T')[1].split('.')[0]}</span>
              <span>Execution mode: {isExecuting ? 'LIVE' : 'FAIL_CLOSED'}</span>
            </div>
          )}
        </div>
      </div>
    </ServiceLayout>
  );
}
