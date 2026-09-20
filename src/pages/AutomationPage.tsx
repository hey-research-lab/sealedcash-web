import { useState } from 'react';
import { Loader2, Plus, Play, Pause, RefreshCw, XCircle, ShieldCheck } from 'lucide-react';
import { useSignTypedData } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListAutomationPolicies,
  useCreateAutomationPolicy,
  useApproveAutomationPolicy,
  usePauseAutomationPolicy,
  useResumeAutomationPolicy,
  useRevokeAutomationPolicy,
  useListAutomationDecisions,
  useEvaluateAutomationRequest,
  useCancelAutomationDecision,
  useRetryAutomationDecision,
  getListAutomationPoliciesQueryKey,
  getListAutomationDecisionsQueryKey,
  type AutomationPolicy,
  type AutomationDecision,
} from '@/api';

import { useWalletAuthentication, shortenIdentifier } from '../App';
import { useI18n } from '@/lib/i18n';



export function AutomationPage({ connected, address, onConnect, walletAuth }: { connected: boolean; address?: string; onConnect: () => void, walletAuth: ReturnType<typeof useWalletAuthentication> }) {
  const { t, formatDateTime } = useI18n();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'policies' | 'decisions' | 'create'>('policies');
  
  const policies = useListAutomationPolicies({
    query: {
      queryKey: [...getListAutomationPoliciesQueryKey(), address?.toLowerCase() ?? 'anonymous'],
      enabled: walletAuth.authenticated,
      retry: false,
      staleTime: 10_000,
    }
  });

  const decisions = useListAutomationDecisions({
    query: {
      queryKey: [...getListAutomationDecisionsQueryKey(), address?.toLowerCase() ?? 'anonymous'],
      enabled: walletAuth.authenticated,
      retry: false,
      staleTime: 10_000,
    }
  });

  const createPolicy = useCreateAutomationPolicy();
  const approvePolicy = useApproveAutomationPolicy();
  const pausePolicy = usePauseAutomationPolicy();
  const resumePolicy = useResumeAutomationPolicy();
  const revokePolicy = useRevokeAutomationPolicy();
  const cancelDecision = useCancelAutomationDecision();
  const retryDecision = useRetryAutomationDecision();

  const { signTypedDataAsync } = useSignTypedData();
  const [actionError, setActionError] = useState('');
  const evaluateDecision = useEvaluateAutomationRequest();

  const [formData, setFormData] = useState<{
    inputTokens: string;
    outputTokens: string;
    perSwapCap: string;
    dailyCap: string;
    maxFeeBps: number;
    maxSlippageBps: number;
    expiresAt: string;
    destinationPolicy: 'any' | 'allowlist';
    destinations: string;
  }>({
    inputTokens: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    outputTokens: '',
    perSwapCap: '1000000000000000000',
    dailyCap: '5000000000000000000',
    maxFeeBps: 50,
    maxSlippageBps: 100,
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16),
    destinationPolicy: 'any' as const,
    destinations: '',
  });

  const parseList = (value: string) => value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);

  const handleCreate = async () => {
    setActionError('');
    try {
      await createPolicy.mutateAsync({
        data: {
          allowedInputTokens: parseList(formData.inputTokens),
          allowedOutputTokens: parseList(formData.outputTokens),
          perSwapCap: formData.perSwapCap,
          dailyCap: formData.dailyCap,
          maxFeeBps: formData.maxFeeBps,
          maxSlippageBps: formData.maxSlippageBps,
          expiresAt: new Date(formData.expiresAt).toISOString(),
          destinationPolicy: formData.destinationPolicy,
          destinationAllowlist: formData.destinationPolicy === 'allowlist' ? parseList(formData.destinations) : [],
        }
      });
      await queryClient.invalidateQueries({ queryKey: getListAutomationPoliciesQueryKey() });
      setView('policies');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to create policy');
    }
  };

  const handleApprove = async (policy: AutomationPolicy) => {
     try {
        const signature = await signTypedDataAsync(policy.signingPayload as any);
        await approvePolicy.mutateAsync({ policyId: policy.id, data: { signature } });
        await queryClient.invalidateQueries({ queryKey: getListAutomationPoliciesQueryKey() });
      } catch(error) {
         setActionError(error instanceof Error ? error.message : 'Wallet approval was not completed.');
     }
  };

  const handleAction = async (action: typeof pausePolicy | typeof resumePolicy | typeof revokePolicy, id: string) => {
    setActionError('');
    try {
      await action.mutateAsync({ policyId: id });
      await queryClient.invalidateQueries({ queryKey: getListAutomationPoliciesQueryKey() });
    } catch(error) {
       setActionError(error instanceof Error ? error.message : 'Policy state could not be changed.');
    }
  };

  const handleDecisionAction = async (action: typeof retryDecision | typeof cancelDecision, id: string) => {
     setActionError('');
     try {
       await action.mutateAsync({ decisionId: id });
       await queryClient.invalidateQueries({ queryKey: getListAutomationDecisionsQueryKey() });
     } catch (error) {
       setActionError(error instanceof Error ? error.message : 'Decision state could not be changed.');
     }
  };

  const runFailClosedCheck = async (policy: AutomationPolicy) => {
    setActionError('');
    try {
      await evaluateDecision.mutateAsync({
        data: {
          policyId: policy.id,
          inputToken: policy.allowedInputTokens[0],
          outputToken: policy.allowedOutputTokens[0],
          inputAmount: '1',
          feeBps: 0,
          slippageBps: 0,
          destination: policy.destinationAllowlist[0] ?? 'unverified-destination',
          quoteObservedAt: null,
          monitoringObservedAt: null,
          settlementObservedAt: null,
          executionEvidence: null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListAutomationDecisionsQueryKey() });
      setView('decisions');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Safety decision could not be recorded.');
    }
  };

  const authenticate = async () => {
    if (!connected) return onConnect();
    try {
      await walletAuth.authenticate();
    } catch {
      return;
    }
  };

  return <div className="product-content">
    <div className="page-heading">
      <div>
        <div className="eyebrow">Controls / 04</div>
        <h1 className="display">Automation.</h1>
        <p>Wallet-owned limits and a fail-closed audit trail for future automated execution.</p>
      </div>
      {walletAuth.authenticated && <div className="header-tabs">
        <button className={`header-tab ${view === 'policies' ? 'active' : ''}`} onClick={() => setView('policies')}>Policies</button>
        <button className={`header-tab ${view === 'decisions' ? 'active' : ''}`} onClick={() => setView('decisions')}>Decisions</button>
      </div>}
    </div>

    {!walletAuth.authenticated ? (
      <section className="panel panel-pad scanner-state">
        <p>Your wallet is connected. Sign a free message to load your automation policies—no transaction or fund transfer.</p>
        <button className="button primary" onClick={authenticate} disabled={walletAuth.loading}>
          {walletAuth.loading ? <Loader2 size={14} className="spin" /> : connected ? 'Sign in with wallet' : 'Connect wallet'}
        </button>
      </section>
    ) : view === 'create' ? (
      <section className="panel panel-pad">
         <div className="panel-head"><span className="panel-title">New Automation Policy</span></div>
         <p className="note" style={{marginBottom: 20}}>
             Policies remain drafts until explicitly approved in your wallet. Approval stores only the signature; SealedCash never asks for or stores seed phrases or private keys.
         </p>
          <form className="form-layout automation-form" onSubmit={(event) => { event.preventDefault(); void handleCreate(); }}>
            <div className="info-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
               <span style={{marginBottom: 8}}>Allowed input token addresses</span>
               <textarea required value={formData.inputTokens} onChange={e => setFormData({...formData, inputTokens: e.target.value})} placeholder="One address per line" />
            </div>
            <div className="info-item" style={{ flexDirection: 'column', alignItems: 'stretch', marginTop: 16 }}>
               <span style={{marginBottom: 8}}>Allowed output token addresses</span>
               <textarea required value={formData.outputTokens} onChange={e => setFormData({...formData, outputTokens: e.target.value})} placeholder="One address per line" />
            </div>
            <div className="info-item" style={{ flexDirection: 'column', alignItems: 'stretch', marginTop: 16 }}>
              <span style={{marginBottom: 8}}>Per Swap Cap (Wei)</span>
              <input type="text" style={{ background: 'var(--surface-3)', border: '1px solid var(--line-strong)', padding: '10px 14px', borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'var(--font-mono)' }} value={formData.perSwapCap} onChange={e => setFormData({...formData, perSwapCap: e.target.value})} />
            </div>
            <div className="info-item" style={{ flexDirection: 'column', alignItems: 'stretch', marginTop: 16 }}>
              <span style={{marginBottom: 8}}>Daily Cap (Wei)</span>
              <input type="text" style={{ background: 'var(--surface-3)', border: '1px solid var(--line-strong)', padding: '10px 14px', borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'var(--font-mono)' }} value={formData.dailyCap} onChange={e => setFormData({...formData, dailyCap: e.target.value})} />
            </div>
            <div className="info-item" style={{ flexDirection: 'column', alignItems: 'stretch', marginTop: 16 }}>
              <span style={{marginBottom: 8}}>Max Fee (BPS)</span>
              <input type="number" style={{ background: 'var(--surface-3)', border: '1px solid var(--line-strong)', padding: '10px 14px', borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'var(--font-mono)' }} value={formData.maxFeeBps} onChange={e => setFormData({...formData, maxFeeBps: Number(e.target.value)})} />
            </div>
            <div className="info-item" style={{ flexDirection: 'column', alignItems: 'stretch', marginTop: 16 }}>
              <span style={{marginBottom: 8}}>Max Slippage (BPS)</span>
              <input type="number" style={{ background: 'var(--surface-3)', border: '1px solid var(--line-strong)', padding: '10px 14px', borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'var(--font-mono)' }} value={formData.maxSlippageBps} onChange={e => setFormData({...formData, maxSlippageBps: Number(e.target.value)})} />
            </div>
             <div className="info-item" style={{ flexDirection: 'column', alignItems: 'stretch', marginTop: 16 }}>
               <span style={{marginBottom: 8}}>Policy expiry (UTC)</span>
               <input required type="datetime-local" value={formData.expiresAt} onChange={e => setFormData({...formData, expiresAt: e.target.value})} />
             </div>
             <div className="info-item" style={{ flexDirection: 'column', alignItems: 'stretch', marginTop: 16 }}>
               <span style={{marginBottom: 8}}>Destination policy</span>
               <select value={formData.destinationPolicy} onChange={e => setFormData({...formData, destinationPolicy: e.target.value as 'any' | 'allowlist'})}>
                 <option value="any">Any destination</option>
                 <option value="allowlist">Allowlisted destinations only</option>
               </select>
             </div>
             {formData.destinationPolicy === 'allowlist' && <div className="info-item" style={{ flexDirection: 'column', alignItems: 'stretch', marginTop: 16 }}>
               <span style={{marginBottom: 8}}>Allowed destinations</span>
               <textarea required value={formData.destinations} onChange={e => setFormData({...formData, destinations: e.target.value})} placeholder="One destination per line" />
             </div>}
            
            <div className="intent-actions" style={{ marginTop: 24 }}>
               <button className="button primary" type="submit" disabled={createPolicy.isPending}>
                  {createPolicy.isPending ? <Loader2 size={14} className="spin" /> : 'Create Draft Policy'}
               </button>
               <button className="button outline-pill" type="button" onClick={() => setView('policies')}>Cancel</button>
            </div>
            {actionError && <p className="intent-error" role="alert">{actionError}</p>}
          </form>
      </section>
    ) : view === 'decisions' ? (
       <section className="panel panel-pad">
        <div className="panel-head">
          <span className="panel-title">Decision Audit Log</span>
          <span className="mono muted" style={{ fontSize: 11 }}>{decisions.data?.length ?? 0} records</span>
        </div>
        <p className="note" style={{marginBottom: 20}}>
            Automated execution fails closed whenever quote, monitoring, or settlement evidence is missing or older than 60 seconds. These records preserve the inputs and exact policy result.
        </p>
        {decisions.isLoading ? <div className="scanner-state"><Loader2 size={14} className="spin" /> Loading...</div>
          : decisions.isError ? <div className="scanner-state">Log could not be loaded.</div>
          : decisions.data?.length === 0 ? <div className="scanner-state">No execution history.</div>
          : <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Decision</th><th>Policy</th><th>Status</th><th>Submitted</th><th>Attempts</th><th></th></tr></thead>
                <tbody>
                  {decisions.data?.map(d => (
                    <tr key={d.id}>
                      <td className="mono">{shortenIdentifier(d.id, 8, 4)}</td>
                      <td className="mono">{shortenIdentifier(d.policyId, 8, 4)}</td>
                      <td><span className={`status ${d.status === 'blocked' ? 'error' : ''}`}>{d.status}</span></td>
                      <td className="mono">{d.submittedAt ? formatDateTime(d.submittedAt) : '—'}</td>
                      <td className="mono">{d.attemptCount}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                           {d.status === 'blocked' && <button className="button text" style={{padding: '4px', height: 'auto'}} onClick={() => handleDecisionAction(retryDecision, d.id)}><RefreshCw size={14} /></button>}
                            {(['blocked', 'approved', 'failed'] as const).includes(d.status as 'blocked' | 'approved' | 'failed') && <button aria-label="Cancel decision" className="button text" style={{padding: '4px', height: 'auto'}} onClick={() => handleDecisionAction(cancelDecision, d.id)}><XCircle size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </section>
    ) : (
      <section className="panel panel-pad">
        <div className="panel-head">
           <span className="panel-title">Automation Policies</span>
          <button className="button outline-pill" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => setView('create')}><Plus size={12} /> New Policy</button>
        </div>
        {policies.isLoading ? <div className="scanner-state"><Loader2 size={14} className="spin" /> Loading...</div>
          : policies.isError ? <div className="scanner-state">Policies could not be loaded.</div>
           : policies.data?.length === 0 ? <div className="scanner-state">No automation policies yet.</div>
          : <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Policy ID</th><th>Version</th><th>Status</th><th>Per Swap</th><th>Daily Cap</th><th>Approved</th><th>Actions</th></tr></thead>
                <tbody>
                  {policies.data?.map(p => (
                    <tr key={p.id}>
                      <td className="mono">{shortenIdentifier(p.id, 8, 4)}</td>
                      <td className="mono">v{p.version}</td>
                      <td><span className={`status ${p.status === 'active' ? 'live' : ''}`}>{p.status}</span></td>
                       <td className="mono" title={p.perSwapCap}>{p.perSwapCap}</td>
                       <td className="mono" title={p.dailyCap}>{p.dailyCap}</td>
                      <td className="mono">{p.approvedAt ? formatDateTime(p.approvedAt) : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                           {p.status === 'draft' && <button className="button outline-pill" style={{padding: '4px 10px', fontSize: 10}} onClick={() => handleApprove(p)}>Approve</button>}
                           {p.status === 'active' && <button className="button text" style={{padding: '4px', height: 'auto'}} onClick={() => handleAction(pausePolicy, p.id)} title="Pause"><Pause size={14} /></button>}
                           {p.status === 'paused' && <button className="button text" style={{padding: '4px', height: 'auto'}} onClick={() => handleAction(resumePolicy, p.id)} title="Resume"><Play size={14} /></button>}
                           {(p.status === 'active' || p.status === 'paused') && <button className="button text" style={{padding: '4px', height: 'auto'}} onClick={() => handleAction(revokePolicy, p.id)} title="Revoke"><XCircle size={14} /></button>}
                            {p.status === 'active' && <button className="button text" style={{padding: '4px 8px', height: 'auto'}} onClick={() => { void runFailClosedCheck(p); }} disabled={evaluateDecision.isPending} title="Record a fail-closed safety decision"><ShieldCheck size={14} /> Check</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
        {actionError && <p className="intent-error" role="alert">{actionError}</p>}
      </section>
    )}
  </div>;
}
