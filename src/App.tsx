import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  getGetWalletSessionQueryKey,
  getGetShieldVaultQueryKey,
  getGetZcashStatusQueryKey,
  getGetAssetBalancesQueryKey,
  getGetChainStatusQueryKey,
  getGetChainTransactionsQueryKey,
  getGetAssetCatalogQueryKey,
  getGetPrivateRouteQueryKey,
  getResolveAssetQueryKey,
  getGetTorStatusQueryKey,
  getGetNativeBalanceQueryKey,
  getListPrivateRoutesQueryKey,
  getListShieldDepositsQueryKey,
  useCreateWalletChallenge,
  useCreateWalletSession,
  useCreatePrivateRoute,
  useSignPrivateRoute,
  useCancelPrivateRoute,
  useGetChainStatus,
  useGetChainTransactions,
  useGetAssetCatalog,
  useGetAssetBalances,
  useGetNativeBalance,
  useGetPrivateRoute,
  useResolveAsset,
  useGetWalletSession,
  useListPrivateRoutes,
  useGetTorStatus,
  useGetZcashStatus,
  useGetShieldVault,
  useListShieldDeposits,
  useCancelShieldDeposit,
  type AssetCatalogItem,
} from '@/api';
import { useAppKit } from '@reown/appkit/react';
import {
  useAccount,
  useSignMessage,
  useSignTypedData,
  useWalletClient,
  usePublicClient,
} from 'wagmi';
import { encodeFunctionData, formatEther, parseEther } from 'viem';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Activity, ArrowRight, Check, ChevronRight, CircleHelp,
  ExternalLink, LockKeyhole, Network,
  WalletCards, X, Lock, ArrowDown, FileText, Mail,
  Send, Loader2, ShieldCheck, Globe
} from 'lucide-react';
import {
  Link, Route, Switch, useLocation, useParams, Router as WouterRouter,
} from 'wouter';
import { AutomationPage } from './pages/AutomationPage';
import { HostRouter } from './pages/service/HostRouter';
import { I18nProvider, useI18n, LOCALES, type Locale } from '@/lib/i18n';
import { generateDepositProof, generateWithdrawProof } from './privacy/privacy-client';

const queryClient = new QueryClient();

type Order = { id: string; mode: 'Route intent'; sent: string; received: string; status: string; date: string };
type AssistantMessage = { role: 'user' | 'assistant'; content: string };
type WalletAssetBalance = { balanceRaw: string; balanceFormatted: string };
const SEALED_CASH_POOL = (import.meta.env.VITE_SEALEDCASH_POOL_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const NATIVE_ASSET = '0x0000000000000000000000000000000000000000' as const;
const depositAbi = [{
  type: 'function',
  name: 'depositNative',
  stateMutability: 'payable',
  inputs: [
    { name: 'commitment', type: 'bytes32' },
    { name: 'encryptedOutput', type: 'bytes' },
    { name: 'proof', type: 'bytes' },
  ],
  outputs: [],
}] as const;
const withdrawAbi = [{
  type: 'function',
  name: 'withdraw',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'root', type: 'bytes32' }, { name: 'inputNullifiers', type: 'bytes32[2]' }, { name: 'inputCount', type: 'uint8' },
    { name: 'asset', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'recipient', type: 'address' },
    { name: 'relayer', type: 'address' }, { name: 'relayerFee', type: 'uint256' }, { name: 'outputCommitments', type: 'bytes32[2]' },
    { name: 'outputCount', type: 'uint8' }, { name: 'encryptedOutputs', type: 'bytes[2]' }, { name: 'proof', type: 'bytes' },
  ],
  outputs: [],
}] as const;

const PRODUCT_TOUR_STORAGE_KEY = 'sealedcash-product-tour-v1';

const TOR_REQUIREMENT_STORAGE_KEY = 'sealedcash-require-tor';
const PRIVACY_FEATURES = [
  'Privacy-First Routing',
  'Non-Custodial Design',
  'Wallet-Owned Access',
  'Verified Chain Reads',
  'Fail-Closed Execution',
  'Robinhood Chain Mainnet',
  'Transparent Route Status',
  'No Seed Phrase Collection',
];

const orders: Order[] = [];

function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();
  return <label className="locale-control">
    <Globe size={13} aria-hidden="true" />
    <span className="sr-only">Select language</span>
    <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label="Select language" data-testid="select-locale">
      {Object.entries(LOCALES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  </label>;
}

function Logo({ light = false }: { light?: boolean }) {
  return <span className="brand" data-testid="text-brand"><img className="brand-logo" src={`${import.meta.env.BASE_URL}sealedcash-logo.png`} alt="" /><span className="brand-wordmark">SEALED<span style={{ color: light ? '#888888' : 'var(--silver)' }}>CASH</span></span></span>;
}

function BrandMark({ className = '' }: { className?: string }) {
  return <img className={`brand-mark ${className}`} src={`${import.meta.env.BASE_URL}sealedcash-logo.png`} alt="" aria-hidden="true" />;
}

function TokenIcon({ symbol, large = false }: { symbol: 'ETH' | 'ZEC'; large?: boolean }) {
  return <span className={`asset-symbol${large ? ' large' : ''}`} aria-hidden="true">
    <img src={`${import.meta.env.BASE_URL}tokens/${symbol.toLowerCase()}.svg`} alt="" />
  </span>;
}

function formatWalletBalance(value: string): string {
  const [whole = '0', fraction = ''] = value.split('.');
  const compactFraction = fraction.slice(0, 6).replace(/0+$/, '');
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return compactFraction ? `${formattedWhole}.${compactFraction}` : formattedWhole;
}

function AssetPicker({ label, assets, balances, walletConnected, balancesLoaded, value, onChange, onAssetResolved, disabled }: {
  label: string;
  assets: AssetCatalogItem[];
  balances: Map<string, WalletAssetBalance>;
  walletConnected: boolean;
  balancesLoaded: boolean;
  value: string;
  onChange: (address: string) => void;
  onAssetResolved: (asset: AssetCatalogItem) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLowerCase();
  const exactAddress = /^0x[a-f0-9]{40}$/i.test(search.trim()) ? search.trim() : '';
  const assetLookup = useResolveAsset(
    { address: exactAddress || '0x0000000000000000000000000000000000000000' },
    { query: { queryKey: getResolveAssetQueryKey({ address: exactAddress || '0x0000000000000000000000000000000000000000' }), enabled: Boolean(exactAddress), retry: false, staleTime: 60_000 } },
  );
  useEffect(() => {
    if (assetLookup.data) onAssetResolved(assetLookup.data);
  }, [assetLookup.data, onAssetResolved]);
  const selected = assets.find((asset) => asset.tokenAddress.toLowerCase() === value.toLowerCase());
  const selectedBalance = selected ? balances.get(selected.tokenAddress.toLowerCase()) : undefined;
  const filtered = assets.filter((asset) =>
    !normalizedSearch ||
    asset.symbol.toLowerCase().includes(normalizedSearch) ||
    asset.name.toLowerCase().includes(normalizedSearch) ||
    asset.tokenAddress.toLowerCase().includes(normalizedSearch),
  );
  const looksLikeContractAddress = /^0x[a-f0-9]{40}$/i.test(search.trim());

  return <div className="asset-picker">
    <span>{label}</span>
    <button type="button" className="asset-picker-trigger" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span className="asset-picker-selection">{selected && <AssetLogo asset={selected} />}<span><strong>{selected?.symbol ?? 'Select asset'}</strong><small>{selected ? `${selected.name.replace(' • Robinhood Token', '')}${selectedBalance ? ` · Balance ${formatWalletBalance(selectedBalance.balanceFormatted)}` : ''}` : 'Robinhood tokens with active trading support'}</small></span></span>
      <ChevronRight size={15} className={open ? 'asset-picker-chevron open' : 'asset-picker-chevron'} />
    </button>
    {open && <div className="asset-picker-menu">
      <input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Paste contract address or type name / symbol" aria-label={`Search ${label.toLowerCase()} by contract address, name, or symbol`} spellCheck={false} />
      {exactAddress && <div className="asset-picker-lookup" role="status">{assetLookup.isFetching ? <><Loader2 size={13} className="spin" /> Checking Robinhood pools…</> : assetLookup.isError ? 'No active liquidity pool found for this contract.' : assetLookup.data ? `Verified on ${assetLookup.data.pool?.dex ?? 'Robinhood Chain'}` : 'Ready to verify contract.'}</div>}
      <div className="asset-picker-list" role="listbox" aria-label={label}>
        {filtered.length === 0 ? <p className="asset-picker-empty">{looksLikeContractAddress ? 'This contract is not listed as an active, tradable Robinhood Chain asset.' : 'No active, tradable asset found.'}</p> : filtered.map((asset) => <button key={asset.id} type="button" role="option" aria-selected={asset.tokenAddress === value} onClick={() => { onChange(asset.tokenAddress); setOpen(false); setSearch(''); }}>
          <AssetLogo asset={asset} />
          <span className="asset-picker-copy"><strong>{asset.symbol}</strong><small>{asset.name.replace(' • Robinhood Token', '')}{asset.pool ? ` · ${asset.pool.dex}` : ''}</small></span>
          <span className={`asset-picker-wallet-balance ${BigInt(balances.get(asset.tokenAddress.toLowerCase())?.balanceRaw ?? '0') > 0n ? 'has-balance' : ''}`}><strong>{!walletConnected ? 'Connect' : !balancesLoaded ? 'Checking…' : formatWalletBalance(balances.get(asset.tokenAddress.toLowerCase())?.balanceFormatted ?? '0')}</strong><small>{asset.symbol}</small></span>
        </button>)}
      </div>
    </div>}
  </div>;
}

function AssetLogo({ asset }: { asset: AssetCatalogItem }) {
  const [failed, setFailed] = useState(false);
  const localTokenLogo = asset.symbol === 'ETH'
    ? `${import.meta.env.BASE_URL}tokens/eth.svg`
    : asset.symbol === 'WETH'
      ? `${import.meta.env.BASE_URL}tokens/weth.png`
    : asset.symbol === 'USDG'
      ? `${import.meta.env.BASE_URL}tokens/usdg.png`
      : null;
  if (asset.kind === 'pool_token' && asset.logoUrl && !failed) {
    return <span className="asset-picker-symbol company-logo"><img src={asset.logoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /></span>;
  }
  if (localTokenLogo && !failed) {
    return <span className="asset-picker-symbol company-logo"><img src={localTokenLogo} alt="" onError={() => setFailed(true)} /></span>;
  }
  if (asset.kind !== 'stock_token' || failed) {
    return <span className="asset-picker-symbol"><span>{asset.symbol.slice(0, 4)}</span></span>;
  }
  return <span className="asset-picker-symbol company-logo"><img src={`/api/chain/assets/${encodeURIComponent(asset.symbol)}/logo`} alt="" loading="lazy" onError={() => setFailed(true)} /></span>;
}

function formatAssetUnits(value: string, asset?: AssetCatalogItem): string {
  if (!asset || !/^[0-9]+$/.test(value)) return value;
  if (asset.decimals === 0) return value;
  const padded = value.padStart(asset.decimals + 1, '0');
  const whole = padded.slice(0, -asset.decimals) || '0';
  const fraction = asset.decimals > 0 ? padded.slice(-asset.decimals).replace(/0+$/, '') : '';
  return fraction ? `${whole}.${fraction}` : whole;
}

function parseAssetUnits(value: string, asset?: AssetCatalogItem): string {
  if (!asset) throw new Error('Choose an asset first.');
  const normalized = value.trim();
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(normalized)) {
    throw new Error('Enter a valid amount.');
  }
  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > asset.decimals) {
    throw new Error(`${asset.symbol} supports up to ${asset.decimals} decimal places.`);
  }
  const units = `${whole}${fraction.padEnd(asset.decimals, '0')}`.replace(/^0+(?=\d)/, '');
  if (BigInt(units) <= 0n) throw new Error('Amount must be greater than zero.');
  return units;
}

export function useWalletAuthentication(connected: boolean, address?: string) {
  const queryClient = useQueryClient();
  const signMessage = useSignMessage();
  const [errorMessage, setErrorMessage] = useState('');
  const normalizedAddress = address?.toLowerCase();
  const sessionQueryKey = [...getGetWalletSessionQueryKey(), normalizedAddress ?? 'anonymous'];
  const previousAddress = useRef<string | undefined>(normalizedAddress);
  const session = useGetWalletSession({
    query: {
      queryKey: sessionQueryKey,
      enabled: connected && Boolean(address),
      retry: false,
      staleTime: 0,
      refetchOnMount: 'always',
    },
  });
  const challenge = useCreateWalletChallenge();
  const createSession = useCreateWalletSession();
  const authenticated = Boolean(
    connected &&
    address &&
    session.data?.address.toLowerCase() === address.toLowerCase(),
  );

  const authenticate = async () => {
    if (!address) throw new Error('Connect a wallet first.');
    setErrorMessage('');
    try {
      const issued = await challenge.mutateAsync({ data: { address } });
      const signature = await signMessage.signMessageAsync({ message: issued.message });
      await createSession.mutateAsync({ data: { challengeId: issued.challengeId, signature } });
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      await queryClient.invalidateQueries({ queryKey: [...getListPrivateRoutesQueryKey(), normalizedAddress ?? 'anonymous'] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wallet authentication failed.';
      const rejected = message.toLowerCase().includes('reject') || message.toLowerCase().includes('denied');
      setErrorMessage(
        rejected
          ? 'Signature request was rejected. Approve the sign-in message to continue.'
          : 'Wallet sign-in could not be completed. Please try again.',
      );
      throw error;
    }
  };
  const resetSession = () => {
    queryClient.removeQueries({ queryKey: getGetWalletSessionQueryKey() });
    queryClient.removeQueries({ queryKey: getListPrivateRoutesQueryKey() });
  };

  useEffect(() => {
    if (previousAddress.current !== normalizedAddress || !connected) {
      queryClient.removeQueries({ queryKey: getGetWalletSessionQueryKey() });
      queryClient.removeQueries({ queryKey: getListPrivateRoutesQueryKey() });
      previousAddress.current = normalizedAddress;
    }
  }, [connected, normalizedAddress, queryClient]);

  return {
    authenticated,
    authenticate,
    resetSession,
    loading: challenge.isPending || signMessage.isPending || createSession.isPending,
    error: challenge.isError || createSession.isError,
    errorMessage,
  };
}

function ProductTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      eyebrow: 'Welcome to SealedCash',
      title: 'Why use a sealed route?',
      copy: 'SealedCash is a privacy-first interface for native ETH and active Robinhood stock tokens.',
        note: 'Wallet authentication, verified reads, and native ETH Shield are available. Swap execution is intentionally fail-closed.',
    },
    {
      eyebrow: 'Build a route',
       title: 'Review a private route intent.',
        copy: 'The current release supports creating, signing, cancelling, and reviewing route intents owned by the authenticated wallet.',
        note: 'Swap intent lifecycle is live. Swap quotes, providers, settlement, and execution require verified integrations; Shield is separate.',
    },
    {
      eyebrow: 'Stay informed',
       title: 'Stay informed.',
       copy: 'Use Chain Scan for verified Robinhood Chain reads and Orders for backend-backed private route intents.',
      note: 'You can reopen the main sections at any time from the navigation.',
    },
  ];
  const current = steps[step];

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onComplete();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onComplete]);

  return <div className="tour-backdrop" role="presentation">
    <section className="product-tour" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-copy">
      <div className="tour-progress" aria-hidden="true">{steps.map((_, index) => <i key={index} className={index <= step ? 'active' : ''} />)}</div>
      <div className="eyebrow">{current.eyebrow}</div>
      <h2 id="tour-title">{current.title}</h2>
      <p id="tour-copy">{current.copy}</p>
      <div className="tour-note"><ShieldCheck size={15} aria-hidden="true" /><span>{current.note}</span></div>
      <div className="tour-footer">
        <span className="mono">{step + 1} of {steps.length}</span>
        <button className="tour-skip" onClick={onComplete} data-testid="button-skip-tour">Skip tour</button>
        <div className="tour-actions">
          <button onClick={() => setStep((currentStep) => Math.max(0, currentStep - 1))} disabled={step === 0} data-testid="button-tour-back">Back</button>
          <button className="tour-next" autoFocus onClick={() => step === steps.length - 1 ? onComplete() : setStep((currentStep) => currentStep + 1)} data-testid="button-tour-next">{step === steps.length - 1 ? 'Finish' : 'Next'}</button>
        </div>
      </div>
    </section>
  </div>;
}


function Docs() {
  return <main className="docs-root app-root">
    <header className="landing-header" style={{ position: 'fixed', background: 'rgba(2,2,2,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--line)' }}>
      <Link href="/" aria-label="SealedCash home"><Logo /></Link>
      <Link href="/app/overview" className="button white-pill">Launch App</Link>
    </header>
    <article className="docs-content" style={{ maxWidth: 900, margin: '0 auto', padding: '140px 24px 100px' }}>
      <div className="eyebrow">Implementation status</div>
      <h1 className="display" style={{ margin: '16px 0' }}>SealedCash Documentation</h1>
      <p className="lead">A precise description of the currently connected application surface.</p>
      <section className="docs-section"><h2>Capability matrix</h2><div className="docs-param-grid">
         <div className="docs-param-row"><strong>Live</strong><span>Wallet connection, wallet authentication, chain reads, native ETH balance, native ETH Shield deposits, local proof generation, private withdrawals, relaying, and settlement readiness checks.</span></div>
        <div className="docs-param-row"><strong>Foundation</strong><span>Signed route intents and wallet-approved automation policies are persisted. Automation decisions are audited and fail closed without fresh quote, monitoring, and settlement evidence; no transaction is submitted.</span></div>
         <div className="docs-param-row"><strong>Swap features unavailable</strong><span>Swap quotes, swap providers, and swap execution are unavailable. They are separate from the live native ETH Shield flow.</span></div>
      </div></section>
      <section className="docs-section"><h2>Wallet connection and auth</h2><ol><li>Reown AppKit connects an EVM wallet restricted to Robinhood Chain Mainnet, chain ID 4663.</li><li>The UI requests <code>POST /api/wallet-auth/challenges</code> with the wallet address.</li><li>The wallet signs the returned challenge message through Wagmi.</li><li>The signature is submitted to <code>POST /api/wallet-auth/sessions</code>; the server creates an HttpOnly wallet session.</li><li>Authenticated UI reads <code>GET /api/wallet-auth/session</code>. Disconnect clears private client cache and ends the local wallet context.</li></ol></section>
      <section className="docs-section"><h2>Live chain reads</h2><p>Only these labels may be shown as live:</p><ul><li><code>GET /api/chain/status</code> — network, latest block, timestamp, gas price, RPC latency.</li><li><code>GET /api/chain/transactions</code> — latest-block transaction records.</li><li><code>GET /api/chain/accounts/:address/balance</code> — native ETH balance at the returned block.</li></ul><p>These are read-only Robinhood RPC reads. They are not quotes, execution, or settlement signals.</p></section>
      <section className="docs-section"><h2>Private route intent model</h2><p>The backend stores an authenticated wallet-owned intent with input token and amount, output token and minimum output, maximum total fee basis points, destination commitment, signing payload, expiry, and state. The UI exposes create, EIP-712 sign, cancel, list, and detail controls. These operations persist an intent only; they do not execute a transaction.</p><ul><li><code>POST /api/private-routes</code> — create an owner-scoped unsigned intent.</li><li><code>POST /api/private-routes/:routeId/signature</code> — verify and store the wallet signature.</li><li><code>POST /api/private-routes/:routeId/cancel</code> — cancel an active unsigned intent.</li><li>Backend states: <code>intent_created</code>, <code>intent_signed</code>, <code>cancelled</code>, <code>expired</code>.</li></ul></section>
       <section className="docs-section"><h2>Automation safety model</h2><p>Authenticated wallets can define token and destination allowlists, per-swap and UTC daily caps, fee and slippage ceilings, and policy expiry. Policies remain drafts until the wallet explicitly signs their EIP-712 approval payload. Pause, resume, and permanent revoke controls affect new decisions.</p><p>Every evaluation stores its inputs, policy result, reasons, freshness timestamps, and available evidence. Missing or stale quote, monitoring, or settlement evidence blocks a swap decision. Shield native ETH execution uses its own readiness and finalized Merkle gates.</p></section>
      <section className="docs-section"><h2>Tor access model</h2><p>SealedCash supports a controlled reverse gateway as its Tor-compatible ingress model. The gateway must terminate the operator-provided Tor address, strip all incoming <code>X-SealedCash-Tor-*</code> headers, and inject a fresh HMAC assertion over timestamp, HTTP method, path, and gateway ID. <code>GET /api/tor/status</code> reports connected only when the API verifies that assertion. The interface states are requested, connected, not connected, and verification failed.</p><p>When “Require verified Tor transport” is enabled, the client sends <code>X-SealedCash-Require-Tor: 1</code>. Wallet auth, private routes, account-balance reads, and assistant traffic then fail with HTTP 412 unless gateway evidence is valid. The gateway must use TLS on its API hop, keep the shared secret outside browser code, disable request-body and identifying-header logs, enforce upstream rate and abuse controls, and monitor status without replaying user requests. DNS resolution for upstream services occurs at the API host, not in the browser; those upstreams still see the API host.</p></section>
       <section className="docs-section"><h2>Privacy and data boundaries</h2><p>Wallet sessions and route records are private to the authenticated wallet. Chain reads are public RPC information. Shield uses native ETH only; local note material stays in this browser. Destination commitments are not destination addresses. Tor ingress does not hide wallet-provider, RPC, browser-extension, destination-site, timing, or public-chain metadata, and it does not prove end-to-end anonymity. Never provide seed phrases or private keys.</p></section>
      <section className="docs-section"><h2>Actual tools and stack</h2><ul><li>Reown AppKit and Wagmi for wallet connection and signing.</li><li>Viem for EVM address and signature primitives.</li><li>React Query with the generated OpenAPI client for typed API calls and cache state.</li><li>Express API routes, Drizzle ORM, and PostgreSQL persistence.</li><li>Robinhood Chain Mainnet RPC for verified read-only chain data.</li></ul></section>
      <section className="docs-section"><h2>Error and security controls</h2><p>UI distinguishes loading, disconnected, empty, and authenticated states. API data is owner-scoped, wallet identity is verified by signature, route queries are wallet-keyed in React Query, and private cache data is cleared on account changes. RPC failures remain disconnected rather than becoming fabricated live values.</p></section>
       <section className="docs-section"><h2>Privacy boundaries</h2><p>SealedCash does not fabricate balances, quotes, proofs, settlement, or transfer receipts. Shield balances are derived only from finalized, unspent local native ETH notes. Swap quotes, providers, and swap execution remain unavailable.</p></section>
    </article>
  </main>;
}

function Landing() {
  const { t } = useI18n();

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    
    document.querySelectorAll('.reveal-on-scroll, .section-transition').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return <main className="landing app-root">
    <header className="landing-header">
      <Link href="/" aria-label="SealedCash home" data-testid="link-home"><Logo /></Link>
      <nav className="landing-nav" aria-label="Main navigation">
        <a href="#about" data-testid="link-about">{t('nav.protocol')}</a>
        <a href="#mechanism" data-testid="link-mechanism">{t('nav.mechanism')}</a>
        <a href="#comparison" data-testid="link-comparison">{t('nav.services')}</a>
        <a href="#workflow" data-testid="link-workflow">{t('nav.workflow')}</a>
        <a href="#providers" data-testid="link-providers">{t('nav.why_us')}</a>
      </nav>
      <div className="landing-header-actions">
        <LocaleSwitcher />
        <Link href="/app/overview" className="button white-pill" data-testid="link-header-launch">{t('nav.launch')}</Link>
      </div>
    </header>

    <section className="hero">
      <div className="hero-left">
        <div className="hero-kicker reveal">{t('landing.hero.kicker')}</div>
        <h1 className="display reveal delay-1">
          {t('landing.hero.title1')}<br/>
          <span className="text-gradient">{t('landing.hero.title2')}</span><br/>
          {t('landing.hero.title3')}
        </h1>
        <p className="hero-sub reveal delay-2">
          {t('landing.hero.sub')}
        </p>
        <div className="hero-bottom reveal delay-3">
          <Link href="/app/overview" className="button white-pill large" data-testid="link-hero-launch"><WalletCards size={16} /> {t('landing.hero.btn_app')}</Link>
          <Link href="/docs" className="button text" data-testid="link-read-docs">Read implementation status ↗</Link>
        </div>
        
        <a className="hero-scroll reveal delay-4" href="#about" data-testid="link-hero-explore">
          <span className="hero-scroll-icon"><ArrowDown size={14} /></span>
          <span className="hero-scroll-copy"><strong>{t('landing.hero.explore')}</strong><small>{t('landing.hero.explore_sub')}</small></span>
          <span className="hero-scroll-line" aria-hidden="true" />
        </a>

        <div className="technology-strip reveal delay-4" aria-label={`Privacy features: ${PRIVACY_FEATURES.join(', ')}`}>
          <span className="technology-label">{t('landing.hero.privacy_features')}</span>
          <div className="technology-marquee">
            <div className="technology-track">
              {[0, 1].map((group) => <div className="technology-group" key={group} aria-hidden={group === 1}>
                {PRIVACY_FEATURES.map((feature) => <span key={`${group}-${feature}`}><i />{feature}</span>)}
              </div>)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="hero-right reveal delay-2">
        <div className="hv-container">
           <div className="hv-main-card">
              <div className="hv-pattern"></div>
              <div className="hv-card-content">
                 <div className="hv-badge">SealedCash</div>
                 <h3>Design your<br/>private route.</h3>
              </div>
           </div>
           
           <div className="hv-ui-card">
              <div className="hv-ui-top">
                 <span>Quote Summary</span>
                 <div className="circle-icon"><Activity size={12}/></div>
              </div>
              <div className="hv-ui-mid">
                 <div className="hv-col"><span className="text-[10px] text-muted uppercase tracking-wider">Assets</span><span>ETH + stock tokens</span></div>
                  <div className="hv-col text-right"><span className="text-[10px] text-muted uppercase tracking-wider">Mode</span><span>Route Preview</span></div>
              </div>
              <div className="hv-ui-bot">
                   <span className="amount">Private Route</span>
              </div>
           </div>

           <div className="hv-pill top-pill"><Lock size={12}/> Route Preview</div>
           <div className="hv-pill right-pill"><ArrowRight size={12}/> Target flow</div>
           
           <div className="hv-avatar a1"><div className="inner-av"></div></div>
           <div className="hv-avatar a2"><div className="inner-av"></div></div>

            <div className="hv-bottom-badges">
             <div className="badge-outline">INTENT</div>
             <div className="badge-outline">READ-ONLY</div>
              <div className="badge-outline">FAIL-CLOSED</div>
           </div>
        </div>
      </div>
    </section>

    <section className="landing-section section-transition" id="about">
      <div className="about-wrapper">
        <div className="about-header reveal-on-scroll">
          <div className="eyebrow">01 / About SealedCash</div>
          <h2 className="section-title display">Privacy is a route, not a setting.</h2>
          <p className="section-copy lead">
            Public-chain transfers can expose a readable path between the wallet that sends and the wallet that receives. SealedCash currently provides wallet-authenticated route intents and verified Robinhood Chain data while settlement awaits verified integrations.
          </p>
        </div>

        <div className="about-visual-container reveal-on-scroll delay-1">
          <div className="av-grid">
            <div className="av-col">
              <div className="av-col-header">
                <span className="av-dot" aria-hidden="true"></span>
                <span className="mono">01 / ORIGIN</span>
              </div>
              <div className="av-card">
                <div className="av-row">
                  <span className="av-label">Wallet</span>
                  <span className="av-val mono">0x71C...976F</span>
                </div>
                <div className="av-row">
                  <span className="av-label">Asset</span>
                  <span className="av-val mono">0.84 ETH</span>
                </div>
                <div className="av-row">
                  <span className="av-label">Intent</span>
                  <span className="av-val">Send ETH or stock token</span>
                </div>
              </div>
            </div>

            <div className="av-connector" aria-hidden="true">
               <div className="av-line"></div>
               <div className="av-travel-dot"></div>
            </div>

            <div className="av-col av-shielded">
              <div className="av-col-header">
                <span className="av-dot private" aria-hidden="true"></span>
                <span className="mono text-white">02 / TARGET (IRONWOOD)</span>
              </div>
              <div className="av-card private">
                <div className="av-row">
                  <span className="av-label">Protocol</span>
                  <span className="av-val mono text-white">Halo 2</span>
                </div>
                <div className="av-row">
                  <span className="av-label">Action</span>
                  <span className="av-val text-white">Not connected</span>
                </div>
                <div className="av-encryption-block">
                  <div className="av-scramble" aria-hidden="true">
                    df8a21b 4c9e 02x a1 df8a21b 4c9e 02x a1 df8a21b 4c9e 02x a1 df8a21b 4c9e
                    ztestsapling1... 882nf 9a01 df8a21b 4c9e 02x a1 df8a21b 4c9e 02x a1
                  </div>
                  <div className="av-overlay-lock">
                    <LockKeyhole size={14}/>
                    <span>Future shielded transit</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="av-connector" aria-hidden="true">
               <div className="av-line"></div>
               <div className="av-travel-dot delayed"></div>
            </div>

            <div className="av-col">
              <div className="av-col-header">
                <span className="av-dot" aria-hidden="true"></span>
                <span className="mono">03 / SETTLEMENT</span>
              </div>
              <div className="av-card">
                <div className="av-row">
                  <span className="av-label">Destination</span>
                   <span className="av-val mono">Protected</span>
                </div>
                <div className="av-row">
                  <span className="av-label">Arrival</span>
                   <span className="av-val mono">Awaiting verification</span>
                </div>
                <div className="av-row">
                  <span className="av-label">Status</span>
                   <span className="av-val text-silver">Execution pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="about-footer reveal-on-scroll delay-2">
          <div className="feature-grid">
            <div className="feature-box">
              <div className="feature-icon"><Network size={20} aria-hidden="true" /></div>
              <h3>Provider-agnostic by default</h3>
              <p>SealedCash presents illustrative quotes from multiple provider profiles instead of presenting a single venue as the only route. Provider connectivity is pending integration.</p>
            </div>
            <div className="feature-box">
              <div className="feature-icon"><ShieldCheck size={20} aria-hidden="true" /></div>
              <h3>Privacy by default</h3>
              <p>Wallet-owned access, minimized metadata, and fail-closed transfer states help you review an action before any verified settlement integration is enabled.</p>
            </div>
            <div className="feature-box">
              <div className="feature-icon"><FileText size={20} aria-hidden="true" /></div>
              <h3>Proof over promises</h3>
              <p>Every simulated order exposes its selected mode, provider profile, transit stage, fee estimate, and settlement status. The interface explains what is simulated instead of presenting preview data as live execution.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="paper-band section-transition" id="mechanism">
      <div className="architecture">
        <div className="orbital reveal-on-scroll" aria-label="Diagram showing a private transfer review">
          {Array.from({ length: 14 }, (_, index) => <span className={`orbital-dot particle-${index + 1}`} key={index} />)}
          <div className="orbital-core">
            <img className="orbital-logo" src={`${import.meta.env.BASE_URL}sealedcash-logo.png`} alt="" />
          </div>
        </div>
        <div className="reveal-on-scroll delay-1">
          <div className="eyebrow">02 / The architecture</div>
          <p className="manifesto">Broad on the outside.<br /><span>Private in the middle.</span></p>
          <p className="section-copy">The route is intentionally simple to understand: quote from providers, enter private transit, settle at the destination. The details stay technical so the interface can stay quiet.</p>
        </div>
      </div>
    </section>

    <section className="landing-section section-transition" id="comparison">
      <div className="reveal-on-scroll">
        <div className="eyebrow">03 / The paths</div>
        <h2 className="section-title display">Read-only foundation.</h2>
        <p className="section-copy">Only wallet authentication, chain reads, and route intent records are connected.</p>
      </div>
      <div className="comparison-grid">
        <div className="compare-card reveal-on-scroll delay-1">
          <div className="compare-head">
            <h3>Execution pending</h3>
            <div><span className="badge">Direct Route</span></div>
          </div>
          <div className="compare-route">
            <span className="mono">Wallet</span>
            <div className="route-travel-container direct"><div className="route-travel-dot" /></div>
            <span className="mono">Provider</span>
            <div className="route-travel-container direct"><div className="route-travel-dot" style={{ animationDelay: '0.8s' }} /></div>
            <span className="mono">Destination</span>
          </div>
          <ul className="compare-list">
             <li><Check size={16}/> Provider routing not connected</li>
             <li><Check size={16}/> Quotes not connected</li>
             <li className="muted"><X size={16}/> No funds move</li>
          </ul>
        </div>
        <div className="compare-card highlight reveal-on-scroll delay-2">
          <div className="compare-head">
            <h3>Sealed Swap</h3>
            <div><span className="badge private">Private review</span></div>
          </div>
          <div className="compare-route private-route signal-sweep">
            <span className="mono">Wallet</span>
            <div className="route-travel-container"><div className="route-travel-dot" /></div>
            <span className="shield">Sealed</span>
            <div className="route-travel-container"><div className="route-travel-dot" style={{ animationDelay: '1.5s' }} /></div>
            <span className="mono">Destination</span>
          </div>
          <ul className="compare-list">
              <li><Check size={16}/> Swap settlement is unavailable</li>
              <li><Check size={16}/> This swap route remains an intent-only record; native ETH Shield actions execute when backend readiness and finalized-note gates pass</li>
             <li><Check size={16}/> No privacy guarantee</li>
          </ul>
        </div>
      </div>
    </section>

    <section className="landing-section section-transition" id="workflow">
      <div className="workflow-layout">
        <div className="workflow-intro reveal-on-scroll">
          <div className="eyebrow">04 / Private route</div>
          <h2 className="section-title display">One route.<br /><span>Three quiet moves.</span></h2>
           <p className="section-copy">A clear view of the currently supported wallet, chain-read, and route-intent capabilities.</p>
          <div className="workflow-key">
             <span><i /> Read-only foundation</span>
             <span><Lock size={12} /> Privacy controls</span>
          </div>
        </div>
        <div className="workflow-sequence">
          <article className="workflow-row reveal-on-scroll delay-1">
            <div className="workflow-index">01</div>
             <div className="workflow-copy"><span className="workflow-label">STATUS</span><h3>Review API capabilities.</h3><p>Provider discovery and quote data start after integration.</p></div>
             <div className="workflow-state"><Activity size={14} /><span>Read-only</span></div>
          </article>
          <article className="workflow-row featured reveal-on-scroll delay-2">
            <div className="workflow-index">02</div>
            <div className="workflow-copy"><span className="workflow-label">REVIEW</span><h3>Keep control of the route.</h3><p>Review the asset, amount, recipient commitment, and signing state before any future settlement can be enabled.</p></div>
            <div className="workflow-state"><Lock size={14} /><span>Private layer</span></div>
          </article>
          <article className="workflow-row reveal-on-scroll delay-3">
            <div className="workflow-index">03</div>
            <div className="workflow-copy"><span className="workflow-label">SETTLE</span><h3>Arrive at the destination.</h3><p>Complete the selected provider route and surface a clear record of the movement.</p></div>
            <div className="workflow-state"><ArrowRight size={14} /><span>3—6 min</span></div>
          </article>
        </div>
      </div>
    </section>

    <section className="landing-section section-transition" id="providers">
      <div className="coverage-wrapper">
        <div className="coverage-header">
          <div className="reveal-on-scroll">
            <div className="eyebrow">05 / Coverage</div>
            <h2 className="section-title display">A wider market view. A quieter route.</h2>
          </div>
          <div className="coverage-intro reveal-on-scroll delay-1">
            <p>SealedCash is designed to compare provider profiles before selecting a private route. Discovery stays broad while wallet access remains user-controlled through Reown on Robinhood Chain.</p>
            <span><i /> Coverage data shown below is simulated</span>
          </div>
        </div>

        <div className="coverage-board reveal-on-scroll delay-2">
          <div className="coverage-board-head">
            <div><span className="av-dot" /><strong>ROUTE DISCOVERY SURFACE</strong></div>
            <span className="mono">PROVIDER INTEGRATION PENDING</span>
          </div>

          <div className="coverage-flow">
            <div className="coverage-stage sources">
              <span className="coverage-stage-label">01 / DISCOVER</span>
              <div className="coverage-provider-list">
                <div className="coverage-provider">
                  <div><strong>No providers connected</strong><small>Backend integration required</small></div>
                  <i aria-hidden="true" />
                </div>
              </div>
            </div>

            <div className="coverage-route-connector" aria-hidden="true"><span /><ArrowRight size={14} /></div>

            <div className="coverage-stage shield">
              <span className="coverage-stage-label">02 / SELECT</span>
              <div className="coverage-shield-core">
                <ShieldCheck size={28} />
                <strong>Private route</strong>
                <small>Privacy review model</small>
              </div>
              <div className="coverage-signal"><span /><span /><span /><span /></div>
            </div>

            <div className="coverage-route-connector" aria-hidden="true"><span /><ArrowRight size={14} /></div>

            <div className="coverage-stage settlement">
              <span className="coverage-stage-label">03 / SETTLE</span>
              <div className="coverage-settlement-card">
                <div><span>Wallet network</span><strong>Robinhood Chain</strong></div>
                <div><span>Wallet access</span><strong>Non-custodial</strong></div>
                <div><span>Execution</span><strong className="muted">Simulation only</strong></div>
              </div>
            </div>
          </div>
        </div>

        <div className="coverage-principles reveal-on-scroll delay-3">
          <article><Network size={18} /><div><strong>Broad by design</strong><p>Compare multiple provider profiles instead of defaulting to one venue.</p></div></article>
          <article><LockKeyhole size={18} /><div><strong>Wallet-owned access</strong><p>Reown connects the wallet without giving SealedCash custody of keys.</p></div></article>
          <article><Activity size={18} /><div><strong>Clear route state</strong><p>Discovery, transit, and settlement are shown as separate stages.</p></div></article>
        </div>
      </div>
    </section>

    <section className="quote-band section-transition" aria-label="SealedCash design principle">
      <div className="quote quote-lyrics">
        <span className="quote-mark" aria-hidden="true">“</span>
        <span className="sr-only">The best privacy product is the one that makes the private path feel ordinary.</span>
        <span className="lyric-line" aria-hidden="true">
          {['The', 'best', 'privacy', 'product', 'is', 'the', 'one', 'that', 'makes', 'the', 'private', 'path', 'feel', 'ordinary.'].map((word, index) =>
            <span className="lyric-word" style={{ '--word-index': index } as React.CSSProperties} key={`${word}-${index}`}>{word}</span>
          )}
        </span>
        <span className="quote-mark closing" aria-hidden="true">”</span>
        <small>— Design principle / SealedCash</small>
      </div>
    </section>

    <section className="cta-section section-transition">
      <h2 className="display">Ready to move quietly?</h2>
      <p>Connect through Reown on Robinhood Chain Mainnet, then explore the simulated SealedCash swap desk. No funds are moved.</p>
      <Link href="/app/overview" className="button white-pill large" data-testid="link-footer-launch">Launch preview <ArrowRight size={16} /></Link>
    </section>

    <footer className="landing-footer">
      <div className="footer-grid">
        <div className="footer-brand">
           <Link href="/" aria-label="SealedCash home"><Logo /></Link>
           <p className="muted" style={{marginTop: 15, maxWidth: 250, fontSize: 14, lineHeight: 1.6}}>Privacy-first routing. Built for considered movement on Robinhood Chain.</p>
        </div>
        <div className="footer-links">
          <strong>Product</strong>
          <Link href="/app">Swap desk</Link>
          <Link href="/app/orders">Ledger</Link>
          <Link href="/app/providers">Network</Link>
        </div>
        <div className="footer-links">
          <strong>Protocol</strong>
          <a href="#about">About</a>
          <a href="#mechanism">Architecture</a>
          <Link href="/docs" className="text-left" style={{color:'var(--muted)',fontSize:14}}>Documentation</Link>
        </div>
        <div className="footer-links">
          <strong>Legal</strong>
          <a href="#">Terms of service</a>
          <a href="#">Privacy policy</a>
        </div>
        <div className="footer-links">
          <strong>Resources</strong>
          <a href="https://x.com/Sealed_Cash" target="_blank" rel="noreferrer" data-testid="link-landing-footer-x">X</a>
          <a href="https://github.com/sealedcash-org" target="_blank" rel="noreferrer" data-testid="link-landing-footer-github">GitHub</a>
          <a href="https://www.torproject.org" target="_blank" rel="noreferrer" data-testid="link-landing-footer-tor">Tor</a>
          <Link href="/docs" data-testid="link-landing-footer-docs">Docs</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 SealedCash. All rights reserved.</span>
        <span>v0.8.4 / 2026 release</span>
      </div>
    </footer>
  </main>;
}

function PrivacyInfoPage({ mode }: { mode: 'withdraw' | 'viewing' }) {
  const isWithdraw = mode === 'withdraw';
  return <div className="product-content">
    <div className="page-heading">
      <div><div className="eyebrow">Privacy</div><h1 className="display">{isWithdraw ? 'Withdraw' : 'Viewing Access'}</h1>
         <p>{isWithdraw ? 'Withdraw native ETH privately after finalized Merkle and backend readiness checks pass.' : 'Control how wallet-authenticated private records are accessed.'}</p>
      </div>
      <span className={`status ${isWithdraw ? 'processing' : 'private'}`}>{isWithdraw ? 'Readiness required' : 'Wallet scoped'}</span>
    </div>
    <section className="panel privacy-access-panel" aria-labelledby="privacy-access-title">
      <div className="privacy-access-intro">
        <div className="privacy-access-icon" aria-hidden="true"><LockKeyhole size={22} /></div>
        <div>
          <span className="panel-title">{isWithdraw ? 'Private withdrawal controls' : 'Access model'}</span>
          <h2 id="privacy-access-title">{isWithdraw ? 'Withdrawal is fail-closed' : 'Wallet-owned access'}</h2>
          <p>{isWithdraw
            ? 'Native ETH withdrawal generates a proof locally and submits only after finalized Merkle and backend readiness checks pass.'
            : 'Only the connected wallet can authenticate and review its own route intents. Shared access and viewing keys are not enabled.'}</p>
        </div>
      </div>
      <dl className="privacy-access-grid">
        <div>
          <dt>Current access</dt>
          <dd>{isWithdraw ? 'Native ETH Shield withdrawal' : 'Connected wallet session'}</dd>
        </div>
        <div>
          <dt>Privacy posture</dt>
          <dd>Non-custodial and fail-closed</dd>
        </div>
        <div>
          <dt>Never requested</dt>
          <dd>Seed phrase or private key</dd>
        </div>
      </dl>
      <div className="privacy-access-note">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>{isWithdraw
          ? 'Submission remains blocked whenever proof, Merkle, relayer, or settlement readiness checks fail.'
          : 'Private balance records remain local to this browser and are not shared through this access page.'}</span>
      </div>
    </section>
  </div>;
}

type LocalNote = { commitment: `0x${string}`; encryptedNote: `0x${string}`; noteIv: `0x${string}`; amount: string; asset: string; transactionHash: string; spent?: boolean };
function WithdrawPage({ connected, address, onConnect }: { connected: boolean; address?: string; onConnect: () => void }) {
  const status = useGetZcashStatus({ query: { queryKey: getGetZcashStatusQueryKey(), refetchInterval: 15_000 } });
  const signMessage = useSignMessage();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [selected, setSelected] = useState(0);
  const [recipient, setRecipient] = useState(address ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState(0n);
  useEffect(() => {
    if (!address) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(`sealedcash.notes.${address.toLowerCase()}`) || '[]') as LocalNote[];
      const available = saved.filter((note) => !note.spent && note.asset.toLowerCase() === NATIVE_ASSET.toLowerCase());
      setNotes(available);
      setBalance(available.reduce((total, note) => total + BigInt(note.amount), 0n));
      setRecipient(address);
    } catch { setError('Encrypted local notes could not be loaded.'); }
  }, [address]);
  const withdraw = async () => {
    setError('');
    if (!connected) return onConnect();
    const note = notes[selected];
    if (!note || !address || !walletClient || !publicClient) return setError('Connect a wallet with a confirmed local note.');
    if (!status.data?.executionAvailable) return setError('Withdrawal is disabled until activation readiness is verified.');
    if (!/^0x[0-9a-fA-F]{40}$/.test(recipient)) return setError('Enter a valid withdrawal recipient.');
    if (walletClient.chain?.id !== 4663) return setError('Switch your wallet to Robinhood Chain.');
    setBusy(true);
    try {
      const treeResponse = await fetch('/api/privacy/merkle', { credentials: 'omit' });
      if (!treeResponse.ok) throw new Error('Finalized Merkle state is unavailable.');
      const tree = await treeResponse.json() as { root: string | null; leaves: Array<{ commitment: string; leafIndex: number }> };
      if (!tree.root || !tree.leaves.some((leaf) => leaf.commitment.toLowerCase() === note.commitment.toLowerCase())) throw new Error('This note is not finalized on chain.');
      const signature = await signMessage.signMessageAsync({ message: `SealedCash local note seed v1\nPool: ${SEALED_CASH_POOL}\nWallet: ${address}` });
      const proof = await generateWithdrawProof(signature, SEALED_CASH_POOL, note.amount, tree.root, [], [], recipient, note.noteIv, note.encryptedNote, tree.leaves);
      const zero = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;
      const data = encodeFunctionData({
        abi: withdrawAbi,
        functionName: 'withdraw',
        args: [tree.root as `0x${string}`, [proof.nullifier, zero], 1, NATIVE_ASSET, BigInt(note.amount), recipient as `0x${string}`, '0x0000000000000000000000000000000000000000', 0n, [zero, zero], 0, ['0x', '0x'], proof.proof],
      });
      const hash = await walletClient.sendTransaction({ account: address as `0x${string}`, to: SEALED_CASH_POOL, data });
      await publicClient.waitForTransactionReceipt({ hash });
      const key = `sealedcash.notes.${address.toLowerCase()}`;
      const all = JSON.parse(window.localStorage.getItem(key) || '[]') as LocalNote[];
      const updated = all.map((item) => item.commitment.toLowerCase() === note.commitment.toLowerCase() ? { ...item, spent: true, spentTransactionHash: hash } : item);
      window.localStorage.setItem(key, JSON.stringify(updated));
      setNotes((current) => current.filter((item) => item.commitment.toLowerCase() !== note.commitment.toLowerCase()));
      setBalance((current) => current - BigInt(note.amount));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Withdrawal failed before confirmation.');
    } finally { setBusy(false); }
  };
  return <div className="product-content">
     <div className="page-heading"><div><div className="eyebrow">Privacy</div><h1 className="display">Withdraw</h1><p>Generate and submit a local operation-3 proof for a finalized native ETH note.</p></div><span className={`status ${status.data?.executionAvailable ? 'live' : ''}`}>{status.isLoading ? 'Loading status…' : status.isError ? 'Status unavailable' : status.data?.executionAvailable ? 'Ready' : 'Fail-closed'}</span></div>
    <section className="panel panel-pad">
      <div className="panel-head"><span className="panel-title">Private balance</span><LockKeyhole size={16} aria-hidden="true" /></div>
      <p className="display text-2xl">{formatEther(balance)} ETH</p>
      <p className="note">Only encrypted notes confirmed by this browser are included. Secrets are decrypted inside the proof worker and never sent to the API.</p>
      {notes.length === 0 ? <p className="note">No unspent finalized native ETH notes are available.</p> : <><label className="bridge-input-wrap"><span>Note</span><select value={selected} onChange={(event) => setSelected(Number(event.target.value))}>{notes.map((note, index) => <option key={note.commitment} value={index}>{formatEther(BigInt(note.amount))} ETH · {note.commitment.slice(0, 10)}…</option>)}</select></label><label className="bridge-input-wrap"><span>Recipient</span><input value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label><button className="button primary" type="button" onClick={() => { void withdraw(); }} disabled={busy || !status.data?.executionAvailable}>{busy ? 'Generating proof…' : 'Withdraw native ETH'}</button></>}
      {error && <p className="note" role="alert">{error}</p>}
    </section>
  </div>;
}

function ProductHeader({ connected, address, onConnect }: { connected: boolean; address?: string; onConnect: () => void }) {
  const { t } = useI18n();
  const { connector } = useAccount();
  const [location] = useLocation();
  const links = [
    { href: '/app/overview', label: 'Privacy', active: ['/app/overview', '/app/assets', '/app/automation', '/app/shield', '/app/private-routing', '/app/orders', '/app/withdraw', '/app/viewing-access'].includes(location) || location.startsWith('/app/order/') },
    { href: '/app/blocks', label: t('app.nav.chain_scan'), active: location === '/app/blocks' || location === '/app/network' },
  ];
  return <header className="product-header">
    <div className="header-left">
      <Link href="/app/overview" className="header-brand" data-testid="link-product-brand"><Logo /></Link>
      <nav className="header-nav" aria-label="Product navigation">
        {links.map(({ href, label, active }) => (
          <Link key={href} href={href} className={`header-link ${active ? 'active' : ''}`} data-testid={`link-nav-${href.replaceAll('/', '-')}`}>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
    <div className="header-actions">
      <LocaleSwitcher />
      {connected ? (
        <button className="avatar" aria-label={`Manage connected wallet ${address ?? ''}`} title={address} data-testid="button-header-account" onClick={onConnect}>
          {connector?.icon
            ? <img className="wallet-avatar-image" src={connector.icon} alt={`${connector.name} wallet`} />
            : <WalletCards size={16} aria-hidden="true" />}
        </button>
      ) : (
        <button className="button outline-pill" style={{ padding: '8px 16px', fontSize: '12px' }} data-testid="button-header-connect" onClick={onConnect}>
          <WalletCards size={14} /> {t('app.shell.connect')}
        </button>
      )}
    </div>
  </header>;
}

function ProductContextNav() {
  const { t } = useI18n();
  const [location] = useLocation();
  const groups = ['/app/overview', '/app/assets', '/app/automation', '/app/shield', '/app/private-routing', '/app/orders', '/app/withdraw', '/app/viewing-access', '/app', '/launch'].includes(location) || location.startsWith('/app/order/')
    ? [{ href: '/app/overview', label: 'Private Balance', testid: 'link-context-private-balance' }, { href: '/app/shield', label: 'Shield', testid: 'link-context-shield' }, { href: '/app/private-routing', label: 'Private Transfer', testid: 'link-context-private-transfer' }, { href: '/app/withdraw', label: 'Withdraw', testid: 'link-context-withdraw' }, { href: '/app/orders', label: 'Activity', testid: 'link-context-activity' }, { href: '/app/viewing-access', label: 'Viewing Access', testid: 'link-context-viewing-access' }]
    : location === '/app/blocks' || location === '/app/network'
      ? [{ href: '/app/blocks', label: t('app.nav.transactions'), testid: 'link-context-chain-transactions' }, { href: '/app/network', label: t('app.nav.block_monitor'), testid: 'link-context-chain-monitor' }]
      : [{ href: '/app/private-routing', label: t('app.nav.new_route'), testid: 'link-context-routing-new' }, { href: '/app/orders', label: t('app.sidebar.orders'), testid: 'link-context-routing-orders' }, { href: '/app/providers', label: t('app.sidebar.providers'), testid: 'link-context-routing-providers' }];
  return <nav className="product-context-nav" aria-label="Section navigation">
    <div className="product-context-links">
      {groups.map(({ href, label, testid }) => <Link key={href} href={href} className={`product-context-link ${location === href ? 'active' : ''}`} data-testid={testid}>{label}</Link>)}
    </div>
  </nav>;
}

function ProductShell({ children, onConnect, connected, address }: { children: ReactNode; onConnect: () => void; connected: boolean; address?: string }) {
  const [location] = useLocation();
  const { t, formatNumber } = useI18n();
  const chainStatus = useGetChainStatus({
    query: {
      queryKey: getGetChainStatusQueryKey(),
      refetchInterval: 12_000,
      staleTime: 10_000,
      retry: 1,
    },
  });
  const torStatus = useGetTorStatus({
    request: {
      headers: typeof window !== 'undefined' && window.localStorage.getItem(TOR_REQUIREMENT_STORAGE_KEY) === '1'
        ? { 'X-SealedCash-Require-Tor': '1' }
        : undefined,
    },
    query: { queryKey: [...getGetTorStatusQueryKey(), 'shell'], refetchInterval: 15_000, retry: false },
  });
  const [tourOpen, setTourOpen] = useState(false);
  const title = location === '/app' || location === '/launch'
    ? 'Private Transfer'
    : location === '/app/overview' ? t('app.sidebar.overview')
      : location === '/app/assets' ? t('app.sidebar.assets')
      : location === '/app/automation' ? 'Automation'
      : location === '/app/blocks' ? t('app.shell.nav.p2')
      : location === '/app/network' ? t('app.nav.block_monitor')
       : location === '/app/private-routing' ? 'Private Transfer'
       : location === '/app/shield' ? 'Shield'
       : location === '/app/withdraw' ? 'Withdraw'
       : location === '/app/viewing-access' ? 'Viewing Access'
    : location.includes('/order/')
      ? t('orders.th.order')
      : location === '/app/orders'
        ? t('app.sidebar.orders')
        : location === '/app/providers'
          ? t('app.sidebar.providers')
          : t('app.sidebar.settings');

  const chainData = chainStatus.data;
  const blockHeight = chainData?.blockNumber;
  const blockHash = chainData?.blockHash;
  const shortBlockHash = blockHash ? `${blockHash.slice(0, 6)}…${blockHash.slice(-8)}` : null;
  const rpcLatencyState = chainData
    ? chainData.rpcLatencyMs < 300
      ? { className: 'fast', label: 'Fast' }
      : chainData.rpcLatencyMs < 700
        ? { className: 'moderate', label: 'Moderate' }
        : { className: 'slow', label: 'Slow' }
    : null;
  const completeTour = () => {
    try {
      window.localStorage.setItem(PRODUCT_TOUR_STORAGE_KEY, 'complete');
    } catch {
      // The tour still closes when browser storage is unavailable.
    }
    setTourOpen(false);
  };

  return <div className="product-shell app-root">
    <ProductHeader connected={connected} address={address} onConnect={onConnect} />
    <ProductContextNav />
    <div className="product-main">
      {children}
    </div>
    <footer className="product-footer" aria-label="Protocol resources and network status">
      <nav className="product-footer-links" aria-label="Product navigation">
        <Link href="/app/overview" data-testid="link-footer-overview">{t('app.sidebar.overview')}</Link>
        <Link href="/app/orders" data-testid="link-footer-orders">{t('app.sidebar.orders')}</Link>
        <Link href="/app/blocks" data-testid="link-footer-chain-scan">{t('app.shell.nav.p2')}</Link>
        <Link href="/docs" data-testid="link-footer-docs">{t('app.shell.doc')}</Link>
      </nav>
      <div className="product-footer-status" aria-live="polite">
        <Link href="/app/settings" className={`tor-footer-state ${torStatus.data?.state ?? 'unavailable'}`} data-testid="status-footer-tor">
          <i className={torStatus.data?.state === 'connected' ? '' : 'is-muted'} />
          Tor {torStatus.isLoading ? 'checking' : torStatus.data?.state === 'connected' ? 'connected' : torStatus.data?.state === 'requested' ? 'requested' : torStatus.data?.state === 'verification_failed' ? 'verification failed' : 'not connected'}
        </Link>
        {chainData ? <>
          <span className="chain-live-label" data-testid="status-footer-chain"><i /> Robinhood mainnet</span>
          {blockHeight && shortBlockHash && (
            <span className="mono" data-testid="text-footer-block" title={blockHash ?? undefined}>
              #{formatNumber(Number(blockHeight))} · {shortBlockHash}
            </span>
          )}
          <span className={`mono rpc-latency ${rpcLatencyState?.className ?? ''}`} data-testid="text-footer-rpc-latency" aria-label={`${chainData.rpcLatencyMs} millisecond RPC latency, ${rpcLatencyState?.label ?? 'unknown'}`} title={`${rpcLatencyState?.label ?? 'Unknown'} RPC response`}><i aria-hidden="true" />{chainData.rpcLatencyMs} ms RPC</span>
        </> : (
          <span data-testid="status-footer-chain"><i className="is-muted" /> {t('app.shell.status.unavail')}</span>
        )}
      </div>
    </footer>
    {tourOpen && <ProductTour onComplete={completeTour} />}
  </div>;
}

function NetworkPage() {
  const { t } = useI18n();
  return <div className="product-content scanner-page" data-testid="block-monitor">
    <div className="scanner-heading">
      <div><div className="eyebrow">{t('app.network.eyebrow')}</div><h1 className="display">{t('app.network.title')}</h1><p>{t('app.network.copy')}</p></div>
    </div>
    <ChainRead />
  </div>;
}

function ChainRead({ compact = false }: { compact?: boolean }) {
  const { t, formatNumber, formatDateTime } = useI18n();
  const chain = useGetChainStatus({ query: { queryKey: getGetChainStatusQueryKey(), refetchInterval: 12_000, retry: 1 } });
  if (chain.isLoading) return <div className="panel panel-pad" data-testid="state-chain-loading">{t('app.data.loading')}</div>;
  if (chain.isError || !chain.data) return <div className="panel panel-pad" role="alert" data-testid="state-chain-error">{t('app.data.error')}</div>;
  const d = chain.data;
  const rows = [
    [t('app.data.block'), d.blockNumber ? `#${formatNumber(Number(d.blockNumber))}` : '—'],
    [t('app.data.hash'), <span className="mono">{d.blockHash}</span>],
    [t('app.data.timestamp'), formatDateTime(d.blockTimestamp)],
    [t('app.data.gas'), `${formatNumber(Number(d.gasPriceWei) / 1e9, { maximumFractionDigits: 6 })} Gwei`],
    [t('app.data.latency'), `${formatNumber(d.rpcLatencyMs)} ms`],
    [t('app.data.chain_id'), String(d.chainId)],
  ];
  return <div className={`panel panel-pad ${compact ? 'chain-read-compact' : ''}`} data-testid="panel-live-chain">
    <div className="panel-head"><span className="panel-title">{t('app.data.live_verified')}</span><span className="status">{t('app.data.live')}</span></div>
    <div className="info-stack">{rows.map(([label, value]) => <div className="info-item" key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</div>
    {!compact && <a className="button outline-pill" style={{ marginTop: 20 }} href={`https://robinhoodchain.blockscout.com/block/${d.blockNumber}`} target="_blank" rel="noreferrer" data-testid="link-explorer-block">{t('app.data.explorer')} <ExternalLink size={13} /></a>}
  </div>;
}

function OverviewPage({ connected, address, onConnect, orderList }: { connected: boolean; address?: string; onConnect: () => void; orderList: Order[] }) {
  const { t, formatNumber, formatDateTime } = useI18n();
  const balance = useGetNativeBalance(address ?? '', { query: { enabled: connected && Boolean(address), queryKey: getGetNativeBalanceQueryKey(address ?? ''), refetchInterval: 15_000, retry: 1 } });
  
  return <div className="product-content terminal-content">
    <div className="terminal-heading"><div><div className="eyebrow">{t('app.overview.eyebrow')}</div><h1 className="display">{t('app.overview.title')}</h1><p style={{marginTop: '12px', color: 'var(--muted)', fontSize: '14px', maxWidth: '600px'}}>{t('app.overview.copy')}</p></div></div>
    
    <div className="terminal-grid overview-grid">
      <aside className="panel terminal-activity overview-activity reveal" aria-label={t('swap.act.title')}>
        <div className="terminal-panel-head"><span className="panel-title">{t('swap.act.title')}</span><Link href="/app/orders" aria-label={t('swap.act.view')}><ArrowRight size={14} /></Link></div>
        <div className="activity-feed">
          {orderList.slice(0, 5).map((order, index) => <Link href={`/app/order/${order.id}`} className="activity-item" key={`${order.id}-${index}`}>
            <span className="activity-dot sealed" />
            <span><small>ROUTE INTENT</small><strong>{order.sent} → {order.received}</strong><em>{t(order.status === 'Processing' ? 'swap.pos.pending' : 'order.settled')} · {formatDateTime(order.date)}</em></span>
          </Link>)}
        </div>
      </aside>

      <main className="terminal-center overview-center reveal delay-1">
        <section className="panel overview-wallet-card" data-testid="panel-wallet-read">
          <div className="terminal-swap-title" style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--line)' }}>
            <div><h2>{t('app.data.wallet_read')}</h2><p>{connected ? t('app.data.connected') : t('app.data.disconnected')}</p></div>
          </div>
          
          <div style={{ padding: '24px' }}>
            {connected ? (
              <div className="info-stack" style={{ gap: '24px' }}>
                <div className="info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('app.data.address')}</span>
                  <strong className="mono" style={{ fontSize: '16px', wordBreak: 'break-all' }}>{address}</strong>
                </div>
                <div className="info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('app.data.native_balance')}</span>
                  <strong className="mono" style={{ fontSize: '32px', color: '#fff' }}>
                    {balance.data
                      ? `${formatNumber(Number(balance.data.balanceEth), { maximumFractionDigits: 6 })} ETH`
                      : balance.isError
                        ? t('app.data.error')
                        : t('app.data.loading')}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <WalletCards size={48} style={{ margin: '0 auto 16px', color: 'var(--line-strong)' }} />
                <p className="note" style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--muted)' }}>{t('app.data.connect_balance')}</p>
                <button className="button primary" onClick={onConnect} data-testid="button-overview-connect">{t('app.shell.connect')}</button>
              </div>
            )}
          </div>
        </section>
      </main>

      <aside className="terminal-rail overview-rail">
        <div className="overview-chain-card reveal delay-2">
          <ChainRead compact={true} />
        </div>
      </aside>
    </div>
  </div>;
}

function AssetsPage({ connected, address, onConnect }: { connected: boolean; address?: string; onConnect: () => void }) {
  const { t, formatNumber } = useI18n();
  const balance = useGetNativeBalance(address ?? '', { query: { enabled: connected && Boolean(address), queryKey: getGetNativeBalanceQueryKey(address ?? ''), refetchInterval: 15_000, retry: 1 } });
  
  return <div className="product-content terminal-content">
    <div className="terminal-heading" style={{ marginBottom: '32px' }}>
      <div>
        <div className="eyebrow">{t('app.assets.eyebrow')}</div>
        <h1 className="display">{t('app.assets.title')}</h1>
        <p style={{marginTop: '12px', color: 'var(--muted)', fontSize: '14px', maxWidth: '600px'}}>{t('app.assets.copy')}</p>
      </div>
      <div className="terminal-status">
        <span className="status">{connected ? t('app.data.connected') : t('app.data.disconnected')}</span>
        {connected && <span className="mono muted">{t('app.assets.verified_one')}</span>}
      </div>
    </div>
    
    {!connected ? (
      <div className="panel" style={{ padding: '80px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <WalletCards size={48} style={{ margin: '0 auto 24px', color: 'var(--line-strong)' }} />
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>{t('app.assets.connect_view')}</h2>
        <p className="note" style={{ marginBottom: '32px', fontSize: '14px', color: 'var(--muted)' }}>{t('app.data.connect_assets')}</p>
        <button className="button primary" onClick={onConnect} data-testid="button-assets-connect">{t('app.shell.connect')}</button>
      </div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="panel reveal" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <TokenIcon symbol="ETH" large />
              <div>
                <strong style={{ display: 'block', fontSize: '16px', color: '#fff' }}>ETH</strong>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{t('app.assets.eth_name')}</span>
              </div>
            </div>
            <div className="status" style={{ fontSize: '10px' }}>Live</div>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <span style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '8px' }}>Native Balance</span>
            <strong className="mono" style={{ fontSize: '28px', color: '#fff', display: 'block' }}>
              {balance.data
                ? formatNumber(Number(balance.data.balanceEth), { maximumFractionDigits: 6 })
                : balance.isError
                  ? t('app.data.error')
                  : t('app.data.loading')}
            </strong>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Block #{balance.data?.blockNumber ?? '—'}</span>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Robinhood Chain Mainnet</span>
          </div>
        </div>
        
        <div className="panel reveal delay-1" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', background: 'transparent' }}>
          <div style={{ textAlign: 'center' }}>
            <Network size={24} style={{ margin: '0 auto 16px', color: 'var(--silver-deep)' }} />
            <strong style={{ display: 'block', fontSize: '14px', color: 'var(--silver)', marginBottom: '8px' }}>{t('app.assets.indexing_pending')}</strong>
            <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.5', maxWidth: '240px' }}>{t('app.assets.indexing_desc')}</p>
          </div>
        </div>
      </div>
    )}
  </div>;
}

function formatWeiAsEth(valueWei: string) {
  try {
    const value = BigInt(valueWei);
    const whole = value / 1000000000000000000n;
    const fraction = (value % 1000000000000000000n).toString().padStart(18, '0').replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : whole.toString();
  } catch {
    return '—';
  }
}

export function shortenIdentifier(value: string, start = 8, end = 6) {
  return value.length > start + end + 1 ? `${value.slice(0, start)}…${value.slice(-end)}` : value;
}

function BlocksPage() {
  const { t, formatDateTime } = useI18n();
  const [search, setSearch] = useState('');
  const transactions = useGetChainTransactions({
    query: {
      queryKey: getGetChainTransactionsQueryKey(),
      refetchInterval: 12_000,
      staleTime: 10_000,
      retry: 1,
    },
  });
  const rows = transactions.data?.transactions ?? [];
  const needle = search.trim().toLowerCase();
  const filteredRows = rows.filter((row) => !needle || [row.hash, row.from, row.to ?? '', row.blockNumber].some((value) => value.toLowerCase().includes(needle)));
  const hasData = Boolean(transactions.data);

  return <div className="product-content terminal-content scanner-page" data-testid="chain-scanner">
    <div className="scanner-heading">
      <div><div className="eyebrow">{t('app.blocks.eyebrow')}</div><h1 className="display">{t('app.blocks.scanner_title')}</h1><p>{t('app.blocks.scanner_copy')}</p></div>
      {hasData && <span className="status" data-testid="scanner-live-badge"><i />{t('app.blocks.live_badge')}</span>}
    </div>
    <div className="scanner-stats">
      <div><span>{t('app.blocks.latest_block')}</span><strong>{transactions.data?.latestBlockNumber ? `#${transactions.data.latestBlockNumber}` : '—'}</strong></div>
      <div><span>{t('app.blocks.loaded_count')}</span><strong>{rows.length}</strong></div>
      <div><span>{t('app.blocks.block_time')}</span><strong>{transactions.data ? formatDateTime(transactions.data.blockTimestamp) : '—'}</strong></div>
      <div><span>{t('app.blocks.rpc_latency')}</span><strong>{transactions.data ? `${transactions.data.rpcLatencyMs} ms` : '—'}</strong></div>
    </div>
    <section className="panel scanner-panel">
      <div className="scanner-toolbar">
        <div className="scanner-search-wrap"><label htmlFor="scanner-search">{t('app.blocks.search_label')}</label><input id="scanner-search" data-testid="scanner-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('app.blocks.search_placeholder')} /><small>{t('app.blocks.search_note')}</small></div>
        <button className="button outline-pill" type="button" data-testid="scanner-refresh" onClick={() => { void transactions.refetch(); }} disabled={transactions.isFetching}><>{transactions.isFetching && <Loader2 size={14} className="spin" />}{transactions.isFetching ? t('app.blocks.updating') : t('app.blocks.refresh')}</></button>
      </div>
      {transactions.isLoading ? <div className="scanner-state" data-testid="scanner-loading">{t('app.data.loading')}</div>
        : transactions.isError ? <div className="scanner-state" role="alert" data-testid="scanner-error"><p>{t('app.blocks.error')}</p><button className="button primary" onClick={() => { void transactions.refetch(); }} data-testid="scanner-retry">{t('app.blocks.retry')}</button></div>
        : rows.length === 0 ? <div className="scanner-state" data-testid="scanner-empty">{t('app.blocks.empty')}</div>
        : <div className="scanner-table-scroll"><table className="data-table scanner-table"><thead><tr>{['hash','method','block','time','from','to','value','gas'].map((key) => <th key={key}>{t(`app.blocks.th.${key}` as 'app.blocks.th.hash')}</th>)}</tr></thead><tbody>
          {filteredRows.map((row) => <tr key={row.hash} data-testid="scanner-row">
            <td><a className="table-link mono" title={row.hash} href={`https://robinhoodchain.blockscout.com/tx/${row.hash}`} target="_blank" rel="noreferrer" data-testid="scanner-tx-link">{shortenIdentifier(row.hash)}</a></td>
            <td className="mono">{row.inputMethod || t('app.blocks.transfer')}</td><td className="mono">{row.blockNumber}</td><td className="mono">{transactions.data ? formatDateTime(transactions.data.blockTimestamp) : '—'}</td>
            <td><a className="table-link mono" title={row.from} href={`https://robinhoodchain.blockscout.com/address/${row.from}`} target="_blank" rel="noreferrer" data-testid="scanner-from-link">{shortenIdentifier(row.from)}</a></td>
            <td>{row.to ? <a className="table-link mono" title={row.to} href={`https://robinhoodchain.blockscout.com/address/${row.to}`} target="_blank" rel="noreferrer" data-testid="scanner-to-link">{shortenIdentifier(row.to)}</a> : '—'}</td>
            <td className="mono">{formatWeiAsEth(row.valueWei)}</td><td className="mono">{row.gas}</td>
          </tr>)}
        </tbody></table>{filteredRows.length === 0 && <div className="scanner-state">{t('app.blocks.no_matches')}</div>}</div>}
    </section>
  </div>;
}

function SwapPage({ onConnect, connected, address, onToast }: { onConnect: () => void; connected: boolean; address?: string; onToast: (message: string) => void }) {
  const { t, formatNumber, formatDateTime } = useI18n();
  const queryClient = useQueryClient();
  const walletAuth = useWalletAuthentication(connected, address);
  const { signTypedDataAsync } = useSignTypedData();
  const createRoute = useCreatePrivateRoute();
  const signRoute = useSignPrivateRoute();
  const cancelRoute = useCancelPrivateRoute();
  const [createdRoute, setCreatedRoute] = useState<Awaited<ReturnType<typeof createRoute.mutateAsync>> | null>(null);
  const [actionError, setActionError] = useState('');
  const [inputToken, setInputToken] = useState('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE');
  const [outputToken, setOutputToken] = useState('');
  const [inputAmount, setInputAmount] = useState('');
  const [minimumOutputAmount, setMinimumOutputAmount] = useState('');
  const [maximumTotalFeeBps, setMaximumTotalFeeBps] = useState('100');
  const [destinationCommitment, setDestinationCommitment] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState('15');
  const [customAssets, setCustomAssets] = useState<AssetCatalogItem[]>([]);
  const assetCatalog = useGetAssetCatalog({
    query: {
      queryKey: getGetAssetCatalogQueryKey(),
      refetchInterval: 30_000,
      staleTime: 25_000,
      retry: 1,
    },
  });
  const assetBalances = useGetAssetBalances(address ?? '0x0000000000000000000000000000000000000000', {
    query: {
      queryKey: getGetAssetBalancesQueryKey(address ?? '0x0000000000000000000000000000000000000000'),
      enabled: connected && Boolean(address),
      refetchInterval: 12_000,
      staleTime: 9_000,
      retry: 1,
    },
  });
  const catalogAssets = assetCatalog.data?.assets.filter((asset) => asset.active && asset.tradable) ?? [];
  const balanceMap = new Map<string, WalletAssetBalance>(
    assetBalances.data?.balances.map((balance) => [balance.tokenAddress.toLowerCase(), balance]) ?? [],
  );
  const availableAssets = [...catalogAssets, ...customAssets.filter((custom) => !catalogAssets.some((asset) => asset.tokenAddress.toLowerCase() === custom.tokenAddress.toLowerCase()))]
    .sort((left, right) => {
      const leftBalance = BigInt(balanceMap.get(left.tokenAddress.toLowerCase())?.balanceRaw ?? '0');
      const rightBalance = BigInt(balanceMap.get(right.tokenAddress.toLowerCase())?.balanceRaw ?? '0');
      if (leftBalance > 0n && rightBalance === 0n) return -1;
      if (rightBalance > 0n && leftBalance === 0n) return 1;
      return left.symbol.localeCompare(right.symbol);
    });
  const selectedInputAsset = availableAssets.find((asset) => asset.tokenAddress.toLowerCase() === inputToken.toLowerCase());
  const selectedOutputAsset = availableAssets.find((asset) => asset.tokenAddress.toLowerCase() === outputToken.toLowerCase());
  const createdInputAsset = createdRoute ? availableAssets.find((asset) => asset.tokenAddress.toLowerCase() === createdRoute.inputToken.toLowerCase()) : undefined;
  const createdOutputAsset = createdRoute ? availableAssets.find((asset) => asset.tokenAddress.toLowerCase() === createdRoute.outputToken.toLowerCase()) : undefined;
  const routes = useListPrivateRoutes({
    query: {
      queryKey: [...getListPrivateRoutesQueryKey(), address?.toLowerCase() ?? 'anonymous'],
      enabled: walletAuth.authenticated,
      retry: false,
      staleTime: 5_000,
    },
  });
  const nativeBalance = useGetNativeBalance(address ?? '', {
    query: {
      enabled: connected && Boolean(address),
      queryKey: getGetNativeBalanceQueryKey(address ?? ''),
      refetchInterval: 15_000,
      staleTime: 12_000,
      retry: 1,
    },
  });
  const balanceLabel = nativeBalance.data
    ? `${formatNumber(Number(nativeBalance.data.balanceEth), { maximumFractionDigits: 6 })} ETH`
    : nativeBalance.isLoading
      ? t('swap.loading')
      : '—';
  const authenticateWallet = async () => {
    if (!connected) {
      onConnect();
      return;
    }
    if (!walletAuth.authenticated) {
      try {
        await walletAuth.authenticate();
        onToast('Wallet authenticated. You can now create a private route intent.');
      } catch {
        onToast('Wallet authentication was not completed.');
      }
      return;
    }
    onToast('Wallet authenticated.');
  };
  const refreshRoutes = async (routeId?: string) => {
    await queryClient.invalidateQueries({ queryKey: getListPrivateRoutesQueryKey() });
    if (routeId) await queryClient.invalidateQueries({ queryKey: getGetPrivateRouteQueryKey(routeId) });
  };
  const generateCommitment = () => {
    const bytes = window.crypto.getRandomValues(new Uint8Array(32));
    setDestinationCommitment(`0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`);
  };
  const submitIntent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError('');
    try {
      const inputAmountUnits = parseAssetUnits(inputAmount, selectedInputAsset);
      const minimumOutputAmountUnits = parseAssetUnits(minimumOutputAmount, selectedOutputAsset);
      const route = await createRoute.mutateAsync({
        data: {
          inputToken,
          inputAmount: inputAmountUnits,
          outputToken,
          minimumOutputAmount: minimumOutputAmountUnits,
          maximumTotalFeeBps: Number(maximumTotalFeeBps),
          destinationCommitment,
          expiresAt: new Date(Date.now() + Number(expiryMinutes) * 60_000).toISOString(),
        },
      });
      setCreatedRoute(route);
      await refreshRoutes(route.id);
      onToast('Route intent created and stored. Review it before signing.');
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'status' in error && error.status === 401) {
        walletAuth.resetSession();
        setActionError('Wallet session expired. Authenticate again, then create the intent.');
        return;
      }
      setActionError(error instanceof Error ? error.message : 'Route intent could not be created.');
    }
  };
  const signIntent = async () => {
    if (!createdRoute) return;
    setActionError('');
    try {
      const signature = await signTypedDataAsync(createdRoute.signingPayload as Parameters<typeof signTypedDataAsync>[0]);
      const route = await signRoute.mutateAsync({ routeId: createdRoute.id, data: { signature } });
      setCreatedRoute(route);
      await refreshRoutes(route.id);
      onToast('Route intent signature verified and stored.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Route intent was not signed.');
    }
  };
  const cancelIntent = async () => {
    if (!createdRoute) return;
    setActionError('');
    try {
      const route = await cancelRoute.mutateAsync({ routeId: createdRoute.id });
      setCreatedRoute(route);
      await refreshRoutes(route.id);
      onToast('Unsigned route intent cancelled.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Route intent could not be cancelled.');
    }
  };
  const recentRoutes = routes.data?.slice(0, 4) ?? [];
  const actionPending = createRoute.isPending || signRoute.isPending || cancelRoute.isPending;
  const addCustomAsset = useCallback((asset: AssetCatalogItem) => {
    setCustomAssets((current) => current.some((item) => item.tokenAddress.toLowerCase() === asset.tokenAddress.toLowerCase()) ? current : [...current, asset]);
  }, []);
  const routeFlowStage = createdRoute
    ? 'intent'
    : walletAuth.authenticated
      ? 'authenticated'
      : connected
        ? 'connected'
        : 'idle';
  return <div className="product-content terminal-content">
    <div className="terminal-heading"><div><div className="eyebrow">{t('swap.title.eyebrow')}</div><h1 className="display">{t('swap.title.main')}</h1></div><div className="terminal-status"><span className="status">{t('swap.title.status')}</span></div></div>
    <div className="terminal-grid private-routing-grid">
      <aside className="panel terminal-activity reveal" aria-label={t('swap.act.title')}>
        <div className="terminal-panel-head"><span className="panel-title">{t('swap.act.title')}</span><Link href="/app/orders" aria-label={t('swap.act.view')}><ArrowRight size={14} /></Link></div>
          <div className="activity-feed">{!walletAuth.authenticated ? <div className="scanner-state">Sign in to load your intents.</div> : routes.isLoading ? <div className="scanner-state">{t('app.data.loading')}</div> : recentRoutes.length === 0 ? <div className="scanner-state">No route intents yet.</div> : recentRoutes.map((route) => <Link key={route.id} href={`/app/order/${route.id}`} className="intent-activity"><span className="status">{route.status.replaceAll('_', ' ')}</span><strong className="mono">{shortenIdentifier(route.id, 7, 4)}</strong><small>{route.inputAmount} base units</small></Link>)}</div>
      </aside>

      <main className="terminal-center">
        <section className="panel terminal-swap reveal delay-1" aria-label={t('swap.form.aria')}>
          <div className="terminal-tabs" aria-label={t('swap.tab.aria')}><span className="terminal-mode-label">Transfer request</span><span>Assets will not move yet</span></div>
          <div className="terminal-swap-title"><span className="asset-symbol"><FileText size={15} /></span><div><h2>Choose the assets for your request</h2><p>You can save and sign this request, but SealedCash cannot send or exchange the assets yet.</p></div></div>
          <div className="swap-box terminal-swap-box">
            {!connected ? <div className="scanner-state intent-gate"><LockKeyhole size={22} /><p>Connect a wallet to create an intent.</p><button className="button primary" onClick={onConnect}><WalletCards size={14} /> Connect wallet</button></div>
              : !walletAuth.authenticated ? <div className="scanner-state intent-gate"><LockKeyhole size={22} /><p>Your wallet is connected. Sign a free message to start a private session—no transaction or fund transfer.</p>{walletAuth.errorMessage && <p className="intent-error" role="alert">{walletAuth.errorMessage}</p>}<button className="button primary" onClick={() => { void authenticateWallet(); }} disabled={walletAuth.loading}>{walletAuth.loading ? <><Loader2 size={16} className="spin" /> Confirm in wallet…</> : <>Sign in with wallet <ArrowRight size={16} /></>}</button></div>
              : createdRoute ? <div className="intent-created" aria-live="polite">
                <header className="intent-created-header"><div><span className="intent-created-kicker"><Check size={15} aria-hidden="true" /> Request saved</span><h3>Review and sign your request</h3><p>Signing confirms this saved request. It still will not move any assets.</p></div><span className="status">{createdRoute.status === 'intent_created' ? 'Waiting for signature' : createdRoute.status.replaceAll('_', ' ')}</span></header>
                <div className="intent-summary-grid">
                  <section className="intent-amount-card" aria-label="Asset to use">{createdInputAsset && <AssetLogo asset={createdInputAsset} />}<div><span>You use</span><strong>{formatAssetUnits(createdRoute.inputAmount, createdInputAsset)} <em>{createdInputAsset?.symbol ?? 'units'}</em></strong><small>{createdRoute.inputAmount} smallest units</small></div></section>
                  <span className="intent-summary-arrow" aria-hidden="true"><ArrowRight size={20} /></span>
                  <section className="intent-amount-card" aria-label="Minimum asset to receive">{createdOutputAsset && <AssetLogo asset={createdOutputAsset} />}<div><span>Minimum you receive</span><strong>{formatAssetUnits(createdRoute.minimumOutputAmount, createdOutputAsset)} <em>{createdOutputAsset?.symbol ?? 'units'}</em></strong><small>{createdRoute.minimumOutputAmount} smallest units</small></div></section>
                </div>
                <dl className="intent-meta-grid"><div><dt>Request ID</dt><dd className="mono" title={createdRoute.id}>{shortenIdentifier(createdRoute.id, 12, 8)}</dd></div><div><dt>Expires</dt><dd>{formatDateTime(createdRoute.expiresAt)}</dd></div></dl>
                {actionError && <p className="intent-error" role="alert">{actionError}</p>}
                {createdRoute.status === 'intent_created' && <div className="intent-primary-actions"><button type="button" className="button primary" disabled={actionPending} onClick={() => { void signIntent(); }}>{signRoute.isPending ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />} Review and sign</button><button type="button" className="button outline-pill" disabled={actionPending} onClick={() => { void cancelIntent(); }}>Cancel request</button></div>}
                <div className="intent-secondary-actions"><Link href={`/app/order/${createdRoute.id}`} className="button text">View full details <ArrowRight size={14} /></Link><button type="button" className="button text" onClick={() => { setCreatedRoute(null); setActionError(''); }}>Create another request</button></div>
              </div>
              : <form className="intent-form" onSubmit={(event) => { void submitIntent(event); }}>
                <div className="intent-form-grid"><AssetPicker label="Asset you want to use" assets={availableAssets} balances={balanceMap} walletConnected={connected} balancesLoaded={Boolean(assetBalances.data)} value={inputToken} onChange={(address) => { setInputToken(address); setInputAmount(''); }} onAssetResolved={addCustomAsset} disabled={assetCatalog.isLoading || assetCatalog.isError} /><AssetPicker label="Asset you want to receive" assets={availableAssets} balances={balanceMap} walletConnected={connected} balancesLoaded={Boolean(assetBalances.data)} value={outputToken} onChange={(address) => { setOutputToken(address); setMinimumOutputAmount(''); }} onAssetResolved={addCustomAsset} disabled={assetCatalog.isLoading || assetCatalog.isError} /><label><span>Amount to use</span><input required inputMode="decimal" placeholder={`0.0${selectedInputAsset ? ` ${selectedInputAsset.symbol}` : ''}`} value={inputAmount} onChange={(event) => setInputAmount(event.target.value)} /></label><label><span>Minimum amount you would accept</span><input required inputMode="decimal" placeholder={`0.0${selectedOutputAsset ? ` ${selectedOutputAsset.symbol}` : ''}`} value={minimumOutputAmount} onChange={(event) => setMinimumOutputAmount(event.target.value)} /></label><label><span>Highest fee allowed</span><input required type="number" min="0" max="1000" step="1" value={maximumTotalFeeBps} onChange={(event) => setMaximumTotalFeeBps(event.target.value)} /><small>100 basis points equals 1%.</small></label><label><span>Request expires after</span><select value={expiryMinutes} onChange={(event) => setExpiryMinutes(event.target.value)}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">60 minutes</option></select></label></div>
                {assetCatalog.isLoading && <p className="note">Loading the official Robinhood Chain asset registry…</p>}
                {assetCatalog.isError && <p className="intent-error" role="alert">The official asset registry could not be loaded. Asset selection is blocked.</p>}
                {selectedOutputAsset?.price && <p className="note">Market reference: {selectedOutputAsset.symbol} is currently shown at ${selectedOutputAsset.price.bid}–${selectedOutputAsset.price.ask} {selectedOutputAsset.price.currency}. This is market information, not a price SealedCash can execute.</p>}
                <label className="intent-commitment"><span>Private destination code</span><div><input required pattern="^0x[a-fA-F0-9]{64}$" placeholder="Generate a private destination code" value={destinationCommitment} onChange={(event) => setDestinationCommitment(event.target.value)} spellCheck={false} /><button type="button" className="button outline-pill" onClick={generateCommitment}>Generate code</button></div><small>This code represents the destination without storing a wallet address in this request.</small></label>
                <p className="intent-warning"><ShieldCheck size={14} /> Saving this request will not move any assets. Prices, providers, private routing, and final delivery are not connected yet.</p>
                {actionError && <p className="intent-error" role="alert">{actionError}</p>}
                <button className="button primary intent-submit" type="submit" disabled={createRoute.isPending}>{createRoute.isPending ? <Loader2 size={14} className="spin" /> : <FileText size={14} />} Save transfer request</button>
              </form>}
          </div>
        </section>
      </main>

      <aside className="terminal-rail">
        <section className="panel terminal-side-card reveal delay-2"><div className="terminal-panel-head"><span className="panel-title">Your position</span><span className="mono muted">01</span></div><div className="position-value"><small>LIVE NATIVE BALANCE</small><strong data-testid="text-live-native-balance">{connected ? balanceLabel : '—'}</strong><p>{connected ? (nativeBalance.isError ? 'Balance could not be loaded.' : `Robinhood Chain block ${nativeBalance.data?.blockNumber ?? 'pending'}`) : 'Connect to read your native ETH balance.'}</p></div>{!connected && <button className="button outline-pill terminal-connect" onClick={onConnect}><WalletCards size={13} /> Connect</button>}</section>
        <section className="panel terminal-side-card reveal delay-3"><div className="terminal-panel-head"><span className="panel-title">Route preview</span><span className="status"><Activity size={11} /> {t('set.pending')}</span></div>
          <div className={`mini-route flow-${routeFlowStage}`} aria-label={`Route flow: ${routeFlowStage}`}>
            <span className="route-wallet-node" aria-label="Wallet" title="Wallet"><WalletCards size={14} aria-hidden="true" /></span>
            <i className="route-flow-segment route-flow-segment-one" aria-hidden="true" />
            <b className="route-core-node" aria-label="Sealed route"><BrandMark /></b>
            <i className="route-flow-segment route-flow-segment-two" aria-hidden="true" />
            <span className="route-intent-node" aria-label="Saved request" title="Saved request"><FileText size={15} aria-hidden="true" /></span>
          </div>
          <div className="info-stack compact"><div className="info-item"><span>Transit</span><strong>Pending</strong></div><div className="info-item"><span>Provider</span><strong>Not connected</strong></div><div className="info-item"><span>Execution</span><strong>Not connected</strong></div></div>
        </section>
      </aside>
    </div>
  </div>;
}

function OrdersPage({ connected, address, onConnect }: { connected: boolean; address?: string; onConnect: () => void }) {
  const { t, formatDateTime } = useI18n();
  const walletAuth = useWalletAuthentication(connected, address);
  const routes = useListPrivateRoutes({
    query: {
      queryKey: [...getListPrivateRoutesQueryKey(), address?.toLowerCase() ?? 'anonymous'],
      enabled: walletAuth.authenticated,
      retry: false,
      staleTime: 10_000,
    },
  });
  const authenticate = async () => {
    if (!connected) return onConnect();
    try {
      await walletAuth.authenticate();
    } catch {
      return;
    }
  };
  const data = routes.data ?? [];
  return <div className="product-content"><div className="page-heading"><div><div className="eyebrow">{t('orders.title.eyebrow')}</div><h1 className="display">{t('orders.title.main')}</h1><p>Persistent route intents owned by the authenticated wallet.</p></div></div>
    {!walletAuth.authenticated
      ? <section className="panel panel-pad scanner-state"><p>Your wallet is connected. Sign a free message to load your private routes—no transaction or fund transfer.</p><button className="button primary" onClick={() => { void authenticate(); }} disabled={walletAuth.loading}>{walletAuth.loading ? <Loader2 size={14} className="spin" /> : connected ? 'Sign in with wallet' : 'Connect wallet'}</button></section>
      : <section className="panel panel-pad"><div className="panel-head"><span className="panel-title">Backend routes</span><span className="mono muted" style={{ fontSize: 11 }}>{data.length} routes</span></div>
        {routes.isLoading ? <div className="scanner-state">{t('app.data.loading')}</div>
          : routes.isError ? <div className="scanner-state">Routes could not be loaded.</div>
          : data.length === 0 ? <div className="scanner-state">No route intents created.</div>
          : <div style={{ overflowX: 'auto' }}><table className="data-table"><thead><tr><th>Route</th><th>Input</th><th>Minimum output</th><th>Status</th><th>Expires</th><th /></tr></thead><tbody>{data.map((route) => <tr key={route.id}><td className="mono">{shortenIdentifier(route.id, 8, 4)}</td><td className="mono">{route.inputAmount}</td><td className="mono">{route.minimumOutputAmount}</td><td><span className="status">{route.status.replaceAll('_', ' ')}</span></td><td className="mono">{formatDateTime(route.expiresAt)}</td><td><Link href={`/app/order/${route.id}`} className="table-link"><ChevronRight size={16} /></Link></td></tr>)}</tbody></table></div>}
      </section>}
  </div>;
}

function OrderDetailPage({ connected, address, onConnect }: { connected: boolean; address?: string; onConnect: () => void }) {
  const { t, formatDateTime } = useI18n();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const walletAuth = useWalletAuthentication(connected, address);
  const { signTypedDataAsync } = useSignTypedData();
  const signRoute = useSignPrivateRoute();
  const cancelRoute = useCancelPrivateRoute();
  const [actionError, setActionError] = useState('');
  const route = useGetPrivateRoute(id ?? '', {
    query: {
      queryKey: [...getGetPrivateRouteQueryKey(id ?? ''), address?.toLowerCase() ?? 'anonymous'],
      enabled: walletAuth.authenticated && Boolean(id),
      retry: false,
    },
  });
  if (!walletAuth.authenticated) return <div className="product-content"><section className="panel panel-pad scanner-state"><p>Your wallet is connected. Sign a free message to continue—no transaction or fund transfer.</p><button className="button primary" onClick={() => connected ? void walletAuth.authenticate() : onConnect()}>{connected ? 'Sign in with wallet' : 'Connect wallet'}</button></section></div>;
  if (route.isLoading) return <div className="product-content"><section className="panel panel-pad scanner-state">{t('app.data.loading')}</section></div>;
  if (!route.data) return <div className="product-content"><section className="panel panel-pad scanner-state">Route not found.</section></div>;
  const item = route.data;
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: getGetPrivateRouteQueryKey(item.id) });
    await queryClient.invalidateQueries({ queryKey: getListPrivateRoutesQueryKey() });
  };
  const signIntent = async () => {
    setActionError('');
    try {
      const signature = await signTypedDataAsync(item.signingPayload as Parameters<typeof signTypedDataAsync>[0]);
      await signRoute.mutateAsync({ routeId: item.id, data: { signature } });
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Intent was not signed.');
    }
  };
  const cancelIntent = async () => {
    setActionError('');
    try {
      await cancelRoute.mutateAsync({ routeId: item.id });
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Intent could not be cancelled.');
    }
  };
  return <div className="product-content"><div className="page-heading"><div><Link href="/app/orders" className="eyebrow">{t('order.back')}</Link><h1 className="display">{shortenIdentifier(item.id, 12, 6)}</h1><p>{formatDateTime(item.createdAt)}</p></div><span className="status">{item.status.replaceAll('_', ' ')}</span></div>
    <div className="detail-layout"><section className="panel panel-pad"><div className="panel-head"><span className="panel-title">Route intent</span><LockKeyhole size={16} color="var(--silver)" /></div><div className="info-stack"><div className="info-item"><span>Input token</span><strong className="mono">{shortenIdentifier(item.inputToken, 10, 6)}</strong></div><div className="info-item"><span>Input amount</span><strong>{item.inputAmount}</strong></div><div className="info-item"><span>Output token</span><strong className="mono">{shortenIdentifier(item.outputToken, 10, 6)}</strong></div><div className="info-item"><span>Minimum output</span><strong>{item.minimumOutputAmount}</strong></div><div className="info-item"><span>Maximum total fee</span><strong>{item.maximumTotalFeeBps} bps</strong></div><div className="info-item"><span>Expires</span><strong>{formatDateTime(item.expiresAt)}</strong></div></div>{item.status === 'intent_created' && new Date(item.expiresAt) > new Date() && <div className="intent-actions detail-intent-actions"><button className="button primary" disabled={signRoute.isPending || cancelRoute.isPending} onClick={() => { void signIntent(); }}>{signRoute.isPending ? <Loader2 size={14} className="spin" /> : <ShieldCheck size={14} />} Sign intent</button><button className="button outline-pill" disabled={signRoute.isPending || cancelRoute.isPending} onClick={() => { void cancelIntent(); }}>Cancel unsigned intent</button></div>}{actionError && <p className="intent-error" role="alert">{actionError}</p>}</section><aside className="panel panel-pad"><div className="panel-head"><span className="panel-title">Privacy</span></div><p className="note">Only a destination commitment is stored. Contract execution and solver settlement remain disabled until verified integrations are available.</p><div className="address-box"><span>{shortenIdentifier(item.destinationCommitment, 14, 8)}</span></div></aside></div>
  </div>;
}

function ProvidersPage() {
  const assets = useGetAssetCatalog({ query: { queryKey: getGetAssetCatalogQueryKey(), staleTime: 60_000, retry: 1 } });
  const stockTokenCount = assets.data?.assets.filter((asset) => asset.kind === 'stock_token').length ?? 0;
  return <div className="product-content"><div className="page-heading"><div><div className="eyebrow">Network / 03</div><h1 className="display">Services and connections.</h1><p>See which information sources work now and which services are still needed before assets can be sent.</p></div><span className="status">Sending not connected</span></div><div className="detail-layout"><section className="panel panel-pad"><div className="panel-head"><span className="panel-title">Working now</span><Network size={16} /></div><div className="info-stack"><div className="info-item"><span>Robinhood Chain</span><strong>Reading public network data</strong></div><div className="info-item"><span>Official asset list</span><strong>{assets.isLoading ? 'Checking…' : assets.isError ? 'Could not load' : `${stockTokenCount} stock tokens available`}</strong></div><div className="info-item"><span>Stock market prices</span><strong>{assets.isLoading ? 'Checking…' : assets.isError ? 'Could not load' : 'Information only'}</strong></div></div></section><section className="panel panel-pad"><div className="panel-head"><span className="panel-title">Still needed before sending assets</span><CircleHelp size={16} /></div><div className="info-stack"><div className="info-item"><span>Final exchange price</span><strong>Not connected</strong></div><div className="info-item"><span>Service that finds available funds</span><strong>Not connected</strong></div><div className="info-item"><span>Service that completes the transfer</span><strong>Not connected</strong></div><div className="info-item"><span>Private transfer network</span><strong>Not ready</strong></div></div><p className="intent-warning">A service will only be marked as working after the full transfer has been tested and confirmed on Robinhood Chain.</p></section></div></div>;
}

function SettingsPage({ connected, address }: { connected: boolean; address?: string }) {
  const { t } = useI18n();
  const [requireTor, setRequireTor] = useState(() => {
    try { return window.localStorage.getItem(TOR_REQUIREMENT_STORAGE_KEY) === '1'; } catch { return false; }
  });
  const torStatus = useGetTorStatus({
    request: { headers: requireTor ? { 'X-SealedCash-Require-Tor': '1' } : undefined },
    query: { queryKey: [...getGetTorStatusQueryKey(), requireTor ? 'required' : 'optional'], refetchInterval: 10_000, retry: false },
  });
  const torState = torStatus.isError ? 'verification_failed' : torStatus.data?.state ?? (requireTor ? 'requested' : 'unavailable');
  const setTorRequirement = () => {
    const next = !requireTor;
    setRequireTor(next);
    try {
      if (next) window.localStorage.setItem(TOR_REQUIREMENT_STORAGE_KEY, '1');
      else window.localStorage.removeItem(TOR_REQUIREMENT_STORAGE_KEY);
    } catch {
      // The in-memory preference still applies to the status request.
    }
  };
  return <div className="product-content"><div className="page-heading"><div><div className="eyebrow">{t('set.title.eyebrow')}</div><h1 className="display">{t('set.title.main')}</h1><p>Local interface preferences, verified transport requirements, and wallet-session status.</p></div></div><section className="panel panel-pad settings-grid"><div className="panel-head"><span className="panel-title">{t('set.sec.lang')}</span><LocaleSwitcher /></div><p className="note">{t('set.sec.lang_p')}</p><div className="setting-row"><div><h3>Require verified Tor transport</h3><p>Fail closed for wallet auth, route-intent records, account-balance reads, and assistant requests unless the controlled gateway proves this request arrived through its Tor ingress.</p></div><button type="button" className={`switch ${requireTor ? 'on' : ''}`} role="switch" aria-checked={requireTor} onClick={setTorRequirement} data-testid="switch-require-tor"><span /></button></div><div className="tor-status-card" data-testid="panel-tor-status"><div className="panel-head"><span className="panel-title">Tor transport evidence</span><span className={`status tor-${torState}`}>{torState === 'unavailable' ? 'not connected' : torState.replace('_', ' ')}</span></div><p className="note">{torState === 'connected' ? 'The API verified a fresh assertion from the configured controlled gateway.' : torState === 'requested' ? 'Tor is required, but this request has no valid gateway assertion. Sensitive requests will be blocked.' : torState === 'verification_failed' ? 'Gateway headers were present but invalid, stale, or could not be verified. Sensitive requests are blocked when Tor is required.' : 'This request has no verified Tor gateway evidence. Enabling the requirement blocks sensitive requests.'}</p><ul className="privacy-limitations"><li>A normal browser toggle cannot route traffic through Tor. Use the operator-provided Tor gateway address in Tor Browser.</li><li>Wallet providers, RPC services, destination sites, and browser extensions can still receive metadata.</li><li>The gateway proves ingress only; it does not guarantee anonymity or hide public-chain activity.</li></ul></div><div style={{ paddingTop: 30 }}><span className="eyebrow mb-4 block">Session</span><div className="info-stack"><div className="info-item"><span>Network</span><strong>{t('app.shell.net')}</strong></div><div className="info-item"><span>Wallet</span><strong>{connected && address ? `${address.slice(0, 8)}…${address.slice(-6)}` : t('set.not_connected')}</strong></div><div className="info-item"><span>Execution</span><strong>Not connected — no verified provider or settlement path</strong></div></div></div></section></div>;
}

function ShieldPage({ connected, address, onConnect }: { connected: boolean; address?: string; onConnect: () => void }) {
  const queryClient = useQueryClient();
  const walletAuth = useWalletAuthentication(connected, address);
  const cancelDeposit = useCancelShieldDeposit();
  const signMessage = useSignMessage();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [assetAddress, setAssetAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [actionError, setActionError] = useState('');
  const [localNoteRevision, setLocalNoteRevision] = useState(0);

  const status = useGetZcashStatus({
    query: {
      queryKey: getGetZcashStatusQueryKey(),
      refetchInterval: 15_000,
      staleTime: 10_000,
      retry: 1,
    },
  });
  const catalog = useGetAssetCatalog({
    query: {
      queryKey: getGetAssetCatalogQueryKey(),
      staleTime: 60_000,
    },
  });
  const balances = useGetAssetBalances(address || '0x0000000000000000000000000000000000000000', {
    query: {
      queryKey: getGetAssetBalancesQueryKey(address || '0x0000000000000000000000000000000000000000'),
      enabled: connected && Boolean(address),
      refetchInterval: 15_000,
    },
  });
  const vault = useGetShieldVault({
    query: {
      queryKey: [...getGetShieldVaultQueryKey(), address?.toLowerCase() ?? 'anonymous'],
      enabled: walletAuth.authenticated,
      retry: false,
      staleTime: 5_000,
    },
  });
  const deposits = useListShieldDeposits({
    query: {
      queryKey: [...getListShieldDepositsQueryKey(), address?.toLowerCase() ?? 'anonymous'],
      enabled: walletAuth.authenticated,
      retry: false,
      staleTime: 5_000,
    },
  });

  const balanceMap = useMemo(() => {
    const map = new Map<string, WalletAssetBalance>();
    if (balances.data?.balances) {
      for (const b of balances.data.balances) {
        map.set(b.tokenAddress.toLowerCase(), b);
      }
    }
    return map;
  }, [balances.data]);

  // Shield currently calls depositNative; do not present ERC20 assets as private deposits.
  const assets = (catalog.data?.assets.filter((asset) => asset.active && asset.tradable && asset.tokenAddress.toLowerCase() === NATIVE_ASSET) || [])
    .sort((left, right) => {
      const leftHeld = BigInt(balanceMap.get(left.tokenAddress.toLowerCase())?.balanceRaw ?? '0') > 0n;
      const rightHeld = BigInt(balanceMap.get(right.tokenAddress.toLowerCase())?.balanceRaw ?? '0') > 0n;
      if (leftHeld !== rightHeld) return leftHeld ? -1 : 1;
      return left.symbol.localeCompare(right.symbol);
    });

  useEffect(() => {
    if (!assetAddress && assets.length > 0) {
      const defaultAsset = assets.find(a => a.symbol === 'WETH') || assets[0];
      setAssetAddress(defaultAsset.tokenAddress);
    }
  }, [assets, assetAddress]);

  const selectedAsset = assets.find((a) => a.tokenAddress.toLowerCase() === assetAddress.toLowerCase());
  const selectedBalance = selectedAsset ? balanceMap.get(selectedAsset.tokenAddress.toLowerCase()) : undefined;
  const amountValid = /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(amount) && Number(amount) > 0;
  const refreshVault = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetShieldVaultQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListShieldDepositsQueryKey() }),
    ]);
  };
  const prepareDeposit = async () => {
    setActionError('');
    if (!connected) {
      onConnect();
      return;
    }
    if (!walletAuth.authenticated) {
      try {
        await walletAuth.authenticate();
      } catch {
        setActionError(walletAuth.errorMessage || 'Wallet sign-in was not completed.');
      }
      return;
    }
    try {
      if (!walletClient || !publicClient || !address) throw new Error('Connect a Robinhood Chain wallet first.');
      if (walletClient.chain?.id !== 4663) throw new Error('Switch your wallet to Robinhood Chain before depositing.');
      if (!amountValid) throw new Error('Enter a valid native ETH amount.');
      const seedSignature = await signMessage.signMessageAsync({
        message: `SealedCash local note seed v1\nPool: ${SEALED_CASH_POOL}\nWallet: ${address}`,
      });
      const proof = await generateDepositProof(seedSignature, SEALED_CASH_POOL, parseEther(amount).toString());
      const data = encodeFunctionData({
        abi: depositAbi,
        functionName: 'depositNative',
        args: [proof.commitment, proof.encryptedOutput, proof.proof],
      });
      const hash = await walletClient.sendTransaction({
        account: address as `0x${string}`,
        to: SEALED_CASH_POOL,
        value: BigInt(proof.amount),
        data,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      const storageKey = `sealedcash.notes.${address.toLowerCase()}`;
       const existing = JSON.parse(window.localStorage.getItem(storageKey) || '[]') as unknown[];
      existing.push({
        commitment: proof.commitment,
        encryptedNote: proof.noteCiphertext,
        noteIv: proof.noteIv,
        amount: proof.amount,
        asset: NATIVE_ASSET,
        transactionHash: hash,
        createdAt: new Date().toISOString(),
      });
      window.localStorage.setItem(storageKey, JSON.stringify(existing));
       setLocalNoteRevision((revision) => revision + 1);
      setAmount('');
      await refreshVault();
      setActionError('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Native deposit could not be completed.');
    }
  };
  const cancelDraft = async (depositId: string) => {
    setActionError('');
    try {
      await cancelDeposit.mutateAsync({ depositId });
      await refreshVault();
    } catch {
      setActionError('This shield deposit request could not be cancelled.');
    }
  };

  const components = status.data?.components;
  const componentState = (value: boolean | undefined) => status.isLoading
    ? 'Loading…'
    : status.isError
      ? 'Status unavailable'
      : value === true ? 'Operational' : 'Not operational';
  const localShieldedEthBalance = useMemo(() => {
    if (!address) return null;
    try {
      const raw = JSON.parse(window.localStorage.getItem(`sealedcash.notes.${address.toLowerCase()}`) || '[]') as Array<{ amount?: string; asset?: string }>;
      const total = raw
        .filter((note) => note.asset?.toLowerCase() === NATIVE_ASSET)
        .reduce((sum, note) => sum + BigInt(/^[0-9]+$/.test(note.amount || '') ? note.amount! : '0'), 0n);
      return formatEther(total);
    } catch {
      return null;
    }
  }, [address, localNoteRevision]);
  const checks = [
    ['Privacy engine', components?.node],
    ['Proof service', components?.prover],
    ['Robinhood bridge', components?.bridge],
    ['Private relayer', components?.relayer],
    ['Settlement monitor', components?.settlementMonitor],
  ] as const;

  return <div className="product-content shield-page">
    <div className="page-heading">
      <div>
        <div className="eyebrow">SealedCash privacy protocol</div>
        <h1 className="display">Shield</h1>
        <p>A non-custodial privacy pool designed for Robinhood Chain. Private keys, note keys, and proofs stay on your device.</p>
      </div>
    </div>

    <section className="shield-vault-overview" aria-label="Shielded vault balance">
      <div>
        <span>Private balance</span>
        <strong>{localShieldedEthBalance === null ? '—' : `${formatWalletBalance(localShieldedEthBalance)} ETH`}</strong>
        <small>{localShieldedEthBalance === null ? 'Connect and authenticate to read finalized, unspent local ETH notes.' : 'Finalized, unspent native ETH notes tracked locally in this browser.'}</small>
      </div>
      <div className="shield-vault-state">
        <span>Vault status</span>
        <strong>{vault.isLoading ? 'Loading…' : vault.isError ? 'Status unavailable' : vault.data?.executionAvailable ? 'Ready' : 'Not ready'}</strong>
      </div>
      <div className="shield-vault-state">
        <span>Pending deposits</span>
        <strong>{vault.data?.pendingDeposits ?? '—'}</strong>
      </div>
    </section>

    <div className="shield-layout">
      <div className="bridge-terminal">
        <div className="bridge-section">
          <div className="bridge-section-header">1. Deposit asset</div>
          <AssetPicker
            label="Asset"
            assets={assets}
            balances={balanceMap}
            walletConnected={connected}
            balancesLoaded={!balances.isPending}
            value={assetAddress}
            onChange={setAssetAddress}
            onAssetResolved={() => {}}
          />

          <div className="bridge-input-wrap" style={{ marginTop: 24 }}>
            <label htmlFor="shield-amount">Amount</label>
            <div className="bridge-input-flex">
              <input
                id="shield-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />
              <button
                className="bridge-max-btn"
                type="button"
                onClick={() => setAmount(selectedBalance?.balanceFormatted || '0')}
              >
                Max
              </button>
            </div>
          </div>
        </div>

        <div className="bridge-section">
            <div className="bridge-section-header">2. SealedCash shielded pool</div>
          <div className="bridge-auto-destination">
            <div className="bridge-auto-icon"><ShieldCheck size={18} /></div>
            <div>
                <strong>Independent non-custodial protocol</strong>
                <p>SealedCash will use its own contracts, circuits, proving artifacts, relayer network, and encrypted-note format.</p>
            </div>
             <span className={`status ${status.data?.executionAvailable ? 'live' : ''}`}>
               {status.isLoading ? 'Loading status…' : status.isError ? 'Status unavailable' : status.data?.executionAvailable ? 'Ready' : 'Not ready'}
            </span>
          </div>

          <div className="bridge-input-wrap" style={{ marginTop: 24 }}>
            <label>Deposit wallet</label>
            <div className="bridge-readonly-value mono">
              {connected && address ? address : 'Connect wallet'}
            </div>
            <small className="muted" style={{ fontSize: 11, marginTop: 4 }}>The request starts from this wallet. No private key or seed phrase is ever requested.</small>
          </div>
        </div>

        <div className="bridge-action">
          {!connected ? (
            <button className="button primary" style={{ width: '100%' }} type="button" onClick={onConnect}>
              <WalletCards size={16} /> Connect Wallet
            </button>
           ) : (
             <button className="button primary" style={{ width: '100%' }} type="button" disabled={!status.data?.executionAvailable || signMessage.isPending} onClick={() => { void prepareDeposit(); }}>
               {signMessage.isPending ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />} {status.isLoading ? 'Checking Shield readiness…' : status.isError ? 'Shield status unavailable' : status.data?.executionAvailable ? 'Deposit native ETH' : 'Shield not ready'}
            </button>
          )}
          {actionError && <p className="intent-error" role="alert">{actionError}</p>}
            <small>Native ETH deposits and private withdrawals remain fail-closed unless finalized Merkle-root and execution readiness checks pass. Note secrets never leave this browser.</small>
        </div>
      </div>

      <div className="bridge-analytics">
        <div className="bridge-panel">
          <div className="bridge-panel-head">
            <span>SealedCash Protocol</span>
             <span className="status">Pinned UltraHonk release</span>
          </div>
          <div className="bridge-checks">
             {[['Robinhood Chain · 4663', true], ['SealedCash pool contract', components?.node], ['SealedCash verifier', components?.prover], ['Independent relayers', components?.relayer]] .map(([label, ready]) => (
                <div className="bridge-check-item" key={String(label)}>
                 <span className="bridge-check-label"><i className={`indicator ${ready === true ? 'ready' : ''}`} /> {label}</span>
                 <span className="bridge-check-val">{ready === true ? 'Operational' : componentState(ready as boolean | undefined)}</span>
              </div>
            ))}
          </div>
            <p className="intent-error mt-4" style={{ margin: '16px 0 0', fontSize: 12 }} role="status">{status.isLoading ? 'Checking backend Shield readiness…' : status.isError ? 'Backend Shield status is unavailable; execution remains fail-closed.' : 'Execution remains fail-closed until finalized Merkle-root and readiness gates pass.'}</p>
        </div>

        <div className="bridge-panel bridge-route-panel">
          <div className="bridge-panel-head"><span>How Shielding Works</span><span className="status">Architecture</span></div>
          <ol className="bridge-route-steps">
             <li><span>01</span><div><strong>Deposit native ETH</strong><small>Submit native ETH from the connected wallet to the verified SealedCash pool.</small></div></li>
             <li><span>02</span><div><strong>Create rotating notes</strong><small>Each output uses a fresh note key so deposits and later spends are harder to link.</small></div></li>
             <li><span>03</span><div><strong>Prove locally</strong><small>A dedicated browser worker generates and verifies the proof against pinned SealedCash circuit artifacts.</small></div></li>
             <li><span>04</span><div><strong>Relay privately</strong><small>Any compatible relayer can submit public proof data without receiving private keys or decrypted notes.</small></div></li>
          </ol>
           <p className="bridge-route-disclaimer">Native ETH deposits are submitted directly to the verified SealedCash pool only after activation readiness passes. Note material is encrypted locally and never sent to the API.</p>
        </div>

        <div className="bridge-panel" style={{ marginTop: 16 }}>
           <div className="bridge-panel-head"><span>Native ETH transaction</span></div>
          <div className="bridge-summary-item">
             <span>Pool fee</span>
              <span className="mono">Contract-defined</span>
          </div>
          <div className="bridge-summary-item">
             <span>Network fee</span>
              <span className="mono">Wallet preview</span>
          </div>
          <div className="bridge-summary-item total">
             <span>Note state</span>
              <span className="mono">Stored after confirmation</span>
          </div>
        </div>

        <div className="bridge-panel shield-deposit-list" style={{ marginTop: 16 }}>
          <div className="bridge-panel-head"><span>Deposit Requests</span><span className="status">{deposits.data?.length ?? 0}</span></div>
          {!walletAuth.authenticated ? <p className="note">Sign in with your wallet to view deposit requests.</p>
            : deposits.isLoading ? <p className="note">Loading deposit requests…</p>
            : deposits.data?.length ? deposits.data.slice(0, 5).map((deposit) => {
              const asset = assets.find((item) => item.tokenAddress.toLowerCase() === deposit.inputToken.toLowerCase());
              return <div className="shield-deposit-row" key={deposit.id}>
                <div><strong>{formatAssetUnits(deposit.inputAmount, asset)} {deposit.inputSymbol}</strong><small>{deposit.status.replace('_', ' ')}</small></div>
                {deposit.status === 'draft' && <button type="button" onClick={() => { void cancelDraft(deposit.id); }} disabled={cancelDeposit.isPending}>Cancel</button>}
              </div>;
            }) : <p className="note">No shield deposit requests yet.</p>}
        </div>

        <div className="bridge-info" style={{ marginTop: 16 }}>
          <Network size={16} className="text-silver mb-2 block" />
           <p className="text-sm muted m-0 leading-relaxed">Local proof generation, native ETH submission, relaying, and private withdrawal are enabled only when backend readiness and finalized Merkle gates pass. The UI never stores note secrets in the API.</p>
        </div>
      </div>
    </div>
  </div>;
}

function ConnectPage({ connected, address, onConnect }: { connected: boolean; address?: string; onConnect: () => void }) {
  const { t } = useI18n();
  if (connected) return <div className="product-content"><div className="panel panel-pad" style={{ textAlign: 'center', padding: '60px 20px' }}><div className="avatar mx-auto mb-4 w-12 h-12 text-sm bg-surface-2 border-line-strong"><BrandMark /></div><h2 className="display text-2xl mb-2 text-white">{t('conn.connected')}</h2><p className="muted mb-2">{t('app.shell.net')}</p><p className="mono muted mb-6">{address ? `${address.slice(0, 8)}…${address.slice(-6)}` : ''}</p><div className="flex justify-center gap-3 flex-wrap"><button className="button outline-pill" data-testid="button-manage-wallet" onClick={onConnect}>{t('conn.manage')}</button><Link href="/app" className="button primary">{t('conn.goto')} <ArrowRight size={14} /></Link></div></div></div>;
  return <div className="product-content"><div className="panel panel-pad" style={{ maxWidth: 480, margin: '40px auto 0', padding: 40 }}><div className="eyebrow mb-4">{t('app.shell.net')}</div><h2 className="display text-3xl mb-3 text-white">{t('conn.title.main')}</h2><p className="muted mb-8 text-[15px] leading-relaxed">{t('conn.description')}</p><button className="wallet-option" data-testid="button-connect-reown" onClick={onConnect}><span className="wallet-name"><span className="wallet-token">R</span>{t('conn.open')}</span><ChevronRight size={16} /></button></div></div>;
}

function NotFoundPage() {
  const { t } = useI18n();
  return <div className="app-root flex items-center justify-center bg-surface text-ink text-center p-8"><div><h1 className="display text-6xl mb-4 text-white">{t('404.title')}</h1><p className="muted mb-8">{t('404.p')}</p><Link href="/" className="button outline-pill">{t('404.btn')}</Link></div></div>;
}

function PrivacyAssistant() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      content: t('ast.ph'),
    },
  ]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || loading) return;

    const nextMessages: AssistantMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/privacy-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(window.localStorage.getItem(TOR_REQUIREMENT_STORAGE_KEY) === '1' ? { 'X-SealedCash-Require-Tor': '1' } : {}),
        },
        body: JSON.stringify({ message: question, history: messages.slice(-8) }),
      });
      const data = await response.json() as { answer?: string; message?: string };
      if (!response.ok) throw new Error(data.message || t('ast.unavailable'));
      setMessages([...nextMessages, {
        role: 'assistant',
        content: data.answer || t('404.p'),
      }]);
    } catch (error) {
      setMessages([...nextMessages, {
        role: 'assistant',
        content: error instanceof Error ? error.message : t('ast.loading'),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return <>
    <button
      className={`assistant-toggle ${open ? 'active' : ''}`}
      type="button"
      aria-label={open ? `${t('ast.title')} — close` : `${t('ast.title')} — open`}
      aria-expanded={open}
      aria-controls="privacy-assistant-panel"
      onClick={() => setOpen(!open)}
      data-testid="button-privacy-assistant"
    >
      <span className="assistant-toggle-mark">
        <img src={`${import.meta.env.BASE_URL}sealedcash-logo.png`} alt="" />
      </span>
      <span className="assistant-toggle-label">{t('ast.brand')}</span>
    </button>
    {open && <section
      id="privacy-assistant-panel"
      className="assistant-panel reveal"
       aria-label={t('ast.title')}
    >
      <header className="assistant-head">
        <div className="assistant-identity">
          <span className="assistant-mark"><img src={`${import.meta.env.BASE_URL}sealedcash-logo.png`} alt="" /></span>
           <div><strong>{t('ast.title')}</strong><small>{t('ast.sub')}</small></div>
        </div>
        <span className="assistant-state">AI</span>
      </header>
       <div className="assistant-notice"><Lock size={12} /> {t('ast.notice')}</div>
      <div className="assistant-messages" role="log" aria-live="polite">
        {messages.map((message, index) => (
          <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}>
            {message.content}
          </div>
        ))}
         {loading && <div className="assistant-message assistant loading"><Loader2 size={14} /> {t('ast.loading')}</div>}
      </div>
      <form className="assistant-form" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
         <label className="sr-only" htmlFor="assistant-question">{t('ast.aria.ask')}</label>
        <input
          id="assistant-question"
          value={input}
          maxLength={1000}
          onChange={(event) => setInput(event.target.value)}
           placeholder={t('ast.ph')}
          disabled={loading}
        />
         <button type="submit" aria-label={t('ast.aria.send')} disabled={!input.trim() || loading}>
          <Send size={16} />
        </button>
      </form>
    </section>}
  </>;
}

function AppContent() {
  const [toast, setToast] = useState<string | null>(null);
  const { open } = useAppKit();
  const { t } = useI18n();
  const { address, isConnected } = useAccount();
  const [orderList, setOrderList] = useState<Order[]>(orders);
  const showToast = (message: string) => { setToast(message); setTimeout(() => setToast(null), 3000); };
  const connectWallet = () => { void open({ view: isConnected ? 'Account' : 'Connect' }); };
  
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TooltipProvider>
          <HostRouter>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Switch>
                <Route path="/"><Landing /></Route>
                <Route path="/docs"><Docs /></Route>
                <Route path="/launch"><ProductShell connected={isConnected} address={address} onConnect={connectWallet}><OverviewPage connected={isConnected} address={address} onConnect={connectWallet} orderList={orderList} /></ProductShell></Route>
                <Route path="/app"><ProductShell connected={isConnected} address={address} onConnect={connectWallet}><SwapPage connected={isConnected} address={address} onConnect={connectWallet} onToast={showToast} /></ProductShell></Route>
                <Route path="/app/private-routing"><ProductShell connected={isConnected} address={address} onConnect={connectWallet}><SwapPage connected={isConnected} address={address} onConnect={connectWallet} onToast={showToast} /></ProductShell></Route>
                <Route path="/app/shield"><ProductShell connected={isConnected} address={address} onConnect={connectWallet}><ShieldPage connected={isConnected} address={address} onConnect={connectWallet} /></ProductShell></Route>
                <Route path="/app/withdraw"><ProductShell connected={isConnected} address={address} onConnect={connectWallet}><WithdrawPage connected={isConnected} address={address} onConnect={connectWallet} /></ProductShell></Route>
                <Route path="/app/viewing-access"><ProductShell connected={isConnected} address={address} onConnect={connectWallet}><PrivacyInfoPage mode="viewing" /></ProductShell></Route>
                <Route path="/app/overview"><ProductShell connected={isConnected} address={address} onConnect={connectWallet}><OverviewPage connected={isConnected} address={address} onConnect={connectWallet} orderList={orderList} /></ProductShell></Route>
                <Route path="/app/assets"><ProductShell connected={isConnected} address={address} onConnect={connectWallet}><AssetsPage connected={isConnected} address={address} onConnect={connectWallet} /></ProductShell></Route>
                <Route path="/app/automation"><AutomationRoute connected={isConnected} address={address} onConnect={connectWallet} /></Route>
                <Route path="/app/blocks"><ProductShell connected={isConnected} address={address} onConnect={connectWallet}><BlocksPage /></ProductShell></Route>
                <Route path="/app/network"><ProductShell connected={isConnected} address={address} onConnect={connectWallet}><NetworkPage /></ProductShell></Route>
                <Route path="/app/orders"><ProductShell connected={isConnected} address={address} onConnect={connectWallet}><OrdersPage connected={isConnected} address={address} onConnect={connectWallet} /></ProductShell></Route>
                <Route path="/app/order/:id"><ProductShell connected={isConnected} address={address} onConnect={connectWallet}><OrderDetailPage connected={isConnected} address={address} onConnect={connectWallet} /></ProductShell></Route>
                <Route path="/app/providers"><ProductShell connected={isConnected} address={address} onConnect={connectWallet}><ProvidersPage /></ProductShell></Route>
                <Route path="/app/settings"><ProductShell connected={isConnected} address={address} onConnect={connectWallet}><SettingsPage connected={isConnected} address={address} /></ProductShell></Route>
                <Route><NotFoundPage /></Route>
              </Switch>
            </WouterRouter>
            <PrivacyAssistant />
            {toast && <div className="toast">{toast}</div>}
            <Toaster />
          </HostRouter>
        </TooltipProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

function AutomationRoute({ connected, address, onConnect }: { connected: boolean; address?: string; onConnect: () => void }) {
  const walletAuth = useWalletAuthentication(connected, address);
  return <ProductShell connected={connected} address={address} onConnect={onConnect}>
    <AutomationPage connected={connected} address={address} onConnect={onConnect} walletAuth={walletAuth} />
  </ProductShell>;
}
export default function App() {
  return <I18nProvider><AppContent /></I18nProvider>;
}
