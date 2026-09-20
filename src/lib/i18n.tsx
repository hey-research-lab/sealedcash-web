import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Locale = 'en' | 'zh-CN' | 'ja' | 'ru' | 'de' | 'fr';

export const LOCALES: Record<Locale, string> = {
  'en': 'English',
  'zh-CN': '简体中文',
  'ja': '日本語',
  'ru': 'Русский',
  'de': 'Deutsch',
  'fr': 'Français'
};

const en = {
  // Navigation & Shared
  "brand": "SEALEDCASH",
  "nav.protocol": "PROTOCOL",
  "nav.mechanism": "MECHANISM",
  "nav.services": "SERVICES",
  "nav.workflow": "WORKFLOW",
  "nav.why_us": "WHY US?",
  "nav.launch": "Launch App",
  "nav.connect": "Connect",
  
  // Footer
  "footer.desc": "Privacy-first routing. Built for considered movement on Robinhood Chain.",
  "footer.product": "Product",
  "footer.swap_desk": "Swap desk",
  "footer.ledger": "Ledger",
  "footer.network": "Network",
  "footer.protocol": "Protocol",
  "footer.about": "About",
  "footer.architecture": "Architecture",
  "footer.whitepaper": "Whitepaper",
  "footer.docs": "Docs",
  "footer.legal": "Legal",
  "footer.tos": "Terms of service",
  "footer.privacy": "Privacy policy",
  "footer.resources": "Resources",
  "footer.tutorial": "Tutorial",
  "footer.logs": "Logs",
  "footer.rights": "© 2026 SealedCash. All rights reserved.",
  "footer.version": "v0.8.4 / 2026 release",
  "footer.report_bug": "Report a bug",
  
  // Whitepaper Modal
  "wp.eyebrow": "SC / 001 — field notes",
  "wp.title": "A quieter path for value.",
  "wp.p1": "SealedCash provides wallet authentication, verified Robinhood Chain reads, and a live native ETH Shield flow with local proofs, private withdrawals, relaying, and settlement readiness checks. Swap quotes, providers, and swap execution remain unavailable.",
  "wp.p2": "The complete protocol paper is being prepared for public review.",
  "wp.btn": "Continue exploring",

  // Tour
  "tour.skip": "Skip tour",
  "tour.back": "Back",
  "tour.next": "Next",
  "tour.finish": "Finish",
  "tour.step1.eyebrow": "Welcome to SealedCash",
  "tour.step1.title": "Why use a sealed route?",
  "tour.step1.copy": "SealedCash is a wallet-authenticated foundation for verified Robinhood Chain reads and private route intents.",
  "tour.step1.note": "Wallet connection uses Reown on Robinhood Chain Mainnet. Native ETH Shield deposits and private withdrawals are live; swap features remain unavailable.",
  "tour.step2.eyebrow": "Build a route",
  "tour.step2.title": "Review a private route intent.",
  "tour.step2.copy": "Review private route intents owned by the authenticated wallet. Quote discovery and execution require verified integrations.",
  "tour.step2.note": "Swap quotes, swap providers, and swap execution are unavailable. This does not describe the live native ETH Shield flow.",
  "tour.step3.eyebrow": "Stay informed",
  "tour.step3.title": "Track every local order.",
  "tour.step3.copy": "Use Orders for backend-backed route intents and Chain Scan for verified read-only chain data.",
  "tour.step3.note": "You can reopen the main sections at any time from the navigation.",

  // Landing Hero
  "landing.hero.kicker": "SEALEDCASH Protocol",
  "landing.hero.title1": "A quieter standard",
  "landing.hero.title2": "for privacy",
  "landing.hero.title3": "routing",
  "landing.hero.sub": "Native ETH privacy is live with local zero-knowledge proofs, finalized shielded notes, and private withdrawals. Swap quotes, providers, and swap execution remain unavailable.",
  "landing.hero.btn_app": "Get app",
  "landing.hero.btn_more": "View more details ↗",
  "landing.hero.explore": "Explore the protocol",
  "landing.hero.explore_sub": "Continue below",
  "landing.hero.privacy_features": "Privacy features",
  
  // Landing About
  "landing.about.eyebrow": "01 / About SealedCash",
  "landing.about.title": "Privacy is a route, not a setting.",
  "landing.about.copy": "SealedCash provides native ETH Shield deposits, local proofs, private withdrawals, relaying, and settlement readiness checks. Swap quotes, providers, and swap execution remain unavailable.",
  "landing.about.origin": "01 / ORIGIN",
  "landing.about.origin.wallet": "Wallet",
  "landing.about.origin.asset": "Asset",
  "landing.about.origin.intent": "Intent",
  "landing.about.origin.intent_val": "Send ETH or stock token",
  "landing.about.transit": "02 / PRIVATE REVIEW",
  "landing.about.transit.protocol": "Privacy layer",
  "landing.about.transit.protocol_val": "Fail-closed",
  "landing.about.transit.action": "Action",
  "landing.about.transit.action_val": "Shielded Transfer",
  "landing.about.transit.linkage": "Shielded Linkage",
  "landing.about.settlement": "03 / EXECUTION STATUS",
  "landing.about.settlement.destination": "Execution",
  "landing.about.settlement.destination_val": "Protected",
  "landing.about.settlement.status": "Status",
  "landing.about.settlement.status_val": "Awaiting verification",
  "landing.about.f1.title": "Read-only by default",
  "landing.about.f1.desc": "The current API exposes verified chain reads and authenticated route intents. Provider connectivity is not connected.",
  "landing.about.f2.title": "Settlement pending",
  "landing.about.f2.desc": "No transfer is represented as complete until verified chain evidence and settlement integrations exist.",
  "landing.about.f3.title": "Proof over promises",
  "landing.about.f3.desc": "The interface distinguishes verified reads from integrations that are not connected. No order execution is represented.",

  // Landing Mechanism
  "landing.mech.eyebrow": "02 / The architecture",
  "landing.mech.title1": "Broad on the outside.",
  "landing.mech.title2": "Private in the middle.",
  "landing.mech.copy": "The current surface includes native ETH Shield deposits, local proofs, private withdrawals, and finalized settlement gates. Swap route intents remain separate.",

  // Landing Comparison
  "landing.comp.eyebrow": "03 / The paths",
  "landing.comp.title": "Read-only foundation.",
  "landing.comp.copy": "Native ETH Shield is operational with finalized readiness gates. Swap quotes, providers, and swap execution are unavailable.",
  "landing.comp.sealed.title": "Route intent",
  "landing.comp.sealed.badge": "Privacy review",
  "landing.comp.sealed.li1": "Integration pending",
  "landing.comp.sealed.li2": "Swap route is intent-only; native ETH Shield executes when readiness and finalized-note gates pass",
  "landing.comp.sealed.li3": "No privacy guarantee",
  "landing.comp.route.wallet": "Wallet",
  "landing.comp.route.provider": "Not connected",
  "landing.comp.route.destination": "Destination",

  // Landing Workflow
  "landing.wf.eyebrow": "04 / Private route",
  "landing.wf.title1": "One route.",
  "landing.wf.title2": "Three quiet moves.",
  "landing.wf.copy": "A clear view of the currently supported wallet, chain-read, and route-intent capabilities.",
  "landing.wf.key1": "Read-only foundation",
  "landing.wf.key2": "Fail-closed settlement",
  "landing.wf.s1.label": "DISCOVER",
  "landing.wf.s1.title": "Review API status.",
  "landing.wf.s1.copy": "Provider discovery starts after a verified integration is connected.",
  "landing.wf.s1.state": "Not connected",
  "landing.wf.s2.label": "SHIELD",
  "landing.wf.s2.title": "Break the public link.",
  "landing.wf.s2.copy": "Native ETH Shield executes after backend readiness and finalized Merkle gates pass.",
  "landing.wf.s2.state": "Private layer",
  "landing.wf.s3.label": "SETTLE",
  "landing.wf.s3.title": "Arrive at the destination.",
  "landing.wf.s3.copy": "Swap route intents remain review-only; native ETH Shield settlement is available after its finalized gates pass.",
  "landing.wf.s3.state": "Read-only",

  // Landing Providers
  "landing.prov.eyebrow": "05 / Coverage",
  "landing.prov.title": "A wider market view. A quieter route.",
  "landing.prov.copy": "Provider discovery is not connected. Wallet access remains user-controlled through Reown on Robinhood Chain.",
  "landing.prov.note": "Provider data is not connected",
  "landing.prov.b1": "ROUTE DISCOVERY SURFACE",
  "landing.prov.b2": "CURRENT SURFACE / READ-ONLY",
  "landing.prov.s1.label": "01 / DISCOVER",
  "landing.prov.s1.t1": "Provider data",
  "landing.prov.s1.d1": "Not connected",
  "landing.prov.s1.t2": "Quotes",
  "landing.prov.s1.d2": "Not connected",
  "landing.prov.s1.t3": "Liquidity",
  "landing.prov.s1.d3": "Not connected",
  "landing.prov.s1.t4": "Execution",
  "landing.prov.s1.d4": "Not connected",
  "landing.prov.s2.label": "02 / SELECT",
  "landing.prov.s2.title": "Private route",
  "landing.prov.s2.sub": "Settlement pending",
  "landing.prov.s3.label": "03 / STATUS",
  "landing.prov.s3.net": "Wallet network",
  "landing.prov.s3.net_val": "Robinhood Chain",
  "landing.prov.s3.acc": "Wallet access",
  "landing.prov.s3.acc_val": "Non-custodial",
  "landing.prov.s3.exec": "Execution",
  "landing.prov.s3.exec_val": "Not connected",
  "landing.prov.f1.title": "Provider data pending",
  "landing.prov.f1.desc": "No provider or quote endpoint is connected.",
  "landing.prov.f2.title": "Wallet-owned access",
  "landing.prov.f2.desc": "Reown connects the wallet without giving SealedCash custody of keys.",
  "landing.prov.f3.title": "Clear route state",
  "landing.prov.f3.desc": "Only backend-supported status and intent records are shown.",

  // Landing CTA
  "landing.cta.quote_hidden": "The best privacy product is the one that makes the private path feel ordinary.",
  "landing.cta.quote_author": "— Design principle / SealedCash",
  "landing.cta.title": "Ready to move quietly?",
  "landing.cta.copy": "Connect through Reown on Robinhood Chain Mainnet and review the supported read-only application surface. No funds are moved.",
  "landing.cta.btn": "Launch app",

  // Docs Page
  "docs.version": "Field Manual / v0.8.4",
  "docs.title_main": "SealedCash Documentation",
  "docs.lead_main": "Technical clarification and implementation details for the SealedCash 2026 mainnet-connected release.",
  "docs.ov.title": "Overview",
  "docs.ov.p1": "SealedCash provides wallet-authenticated Robinhood Chain reads and native ETH Shield deposits, local proofs, private withdrawals, relaying, and settlement readiness checks. Swap quotes, providers, and swap execution remain unavailable.",
  "docs.ov.p2": "The 2026 release combines standard wallet connections with a clear representation of route availability and risk.",
  "docs.st.title": "Current Product Status",
  "docs.st.p1": "The current deployment is the {strong_rel}. Wallet, read-only chain data, and native ETH Shield execution are live; swap features remain unavailable.",
  "docs.st.rel": "SealedCash 2026 mainnet-connected release",
  "docs.st.li1": "{strong_live} Reown wallet connection, network status, latest block data, gas price, and connected wallet native ETH balance on Robinhood Chain Mainnet.",
  "docs.st.li2": "{strong_sim} Swap quotes, swap providers, and swap execution are unavailable. Shield supports native ETH only and derives balances from finalized, unspent local notes.",
  "docs.st.live": "Available:",
  "docs.st.sim": "Not connected:",
  "docs.ar.title": "Transit Architecture",
  "docs.ar.p1": "The core proposition relies on a three-stage transit model to reduce direct on-chain linkage without sacrificing liquidity broadness:",
  "docs.ar.li1": "{strong_disc} Provider and quote discovery is not connected.",
  "docs.ar.disc": "Discover:",
  "docs.ar.li2": "{strong_orch} Native ETH Shield generates proofs locally and supports private withdrawal through the verified relayer and settlement path.",
  "docs.ar.orch": "Private settlement:",
  "docs.ar.li3": "{strong_settle} Native ETH Shield returns funds to a user-controlled destination after finalized Merkle and readiness gates. Swap bridge and settlement execution remain unavailable.",
  "docs.ar.settle": "Settlement:",
  "docs.ar.note": "Note: no privacy feature provides an anonymity guarantee.",
  "docs.nw.title": "Network & Wallet",
  "docs.nw.p1": "Wallet access remains non-custodial and user-controlled. Connection is established via Reown (formerly WalletConnect), specifically restricted to the Robinhood Chain Mainnet.",
  "docs.nw.sub": "Network Parameters",
  "docs.nw.l1": "Network Name",
  "docs.nw.v1": "Robinhood Chain Mainnet",
  "docs.nw.l2": "Chain ID",
  "docs.nw.l3": "Native Currency",
  "docs.nw.l4": "RPC URL",
  "docs.nw.l5": "Block Explorer",
  "docs.mo.title": "Execution status",
  "docs.mo.p1": "The current interface exposes native ETH Shield execution and clearly labels unavailable swap execution.",
  "docs.mo.li1": "Swap provider routing, swap quotes, and swap settlement are not connected.",
  "docs.mo.li2": "{strong_seal} Native ETH Shield settlement readiness is reported by the backend; finalized Merkle gates still fail closed.",
  "docs.mo.seal": "Settlement status:",
  "docs.pr.title": "Privacy Boundaries & Risk",
  "docs.pr.p1": "We do not claim zero metadata or guaranteed anonymity. True privacy depends on several contextual factors outside the immediate swap contract.",
  "docs.pr.n_title": "Privacy depends on:",
  "docs.pr.n_desc": "Implementation architecture, timing analysis, swap amounts, endpoint exposure, wallet/RPC provider observations, and overall user behavior.",
  "docs.pr.p2": "Native ETH Shield actions are executed through the verified pool and local-note flow. Users should not infer Shield capabilities from swap route-intent records.",
  "docs.tr.title": "Troubleshooting",
  "docs.tr.p1": "If you encounter issues while using the application:",
  "docs.tr.li1": "{strong_fail} Ensure your wallet supports Reown AppKit and Robinhood Chain (ID 4663). Check your local network connection.",
  "docs.tr.fail": "Wallet fails to connect:",
  "docs.tr.li2": "{strong_rpc} The configured RPC may experience rate limits. Try refreshing or switching to a dedicated node.",
  "docs.tr.rpc": "RPC Errors:",
  "docs.tr.li3": "{strong_stall} Route execution is waiting because solver and settlement integrations are not connected.",
  "docs.tr.stall": "Execution pending:",
  "docs.ref.title": "Official References",
  "docs.ref.p1": "For deeper technical integration and protocol standards, consult the following external documentation:",
  "docs.ref.l1": "Robinhood Chain Connecting Guide",
  "docs.ref.l2": "Reown AppKit Installation (Wagmi)",
  "docs.ref.l3": "Reown Custom Networks",
  "docs.ref.l4": "Privacy implementation boundaries",
  "docs.ref.l5": "Wallet security and privacy basics",

  // App Shell & Sidebar
  "app.sidebar.ws": "Workspace",
   "app.sidebar.overview": "Overview",
   "app.sidebar.assets": "Assets",
  "app.sidebar.swap": "Swap",
  "app.sidebar.orders": "Orders",
  "app.sidebar.providers": "Providers",
  "app.sidebar.settings": "Settings",
  "app.shell.net": "Robinhood Chain Mainnet",
  "app.shell.connect": "Connect",
  "app.shell.nav.p1": "Private routing",
  "app.shell.nav.p2": "Live chain data",
   "app.nav.vault": "Vault",
   "app.nav.private_routing": "Private Routing",
   "app.nav.chain_scan": "Chain Scan",
   "app.nav.new_route": "New Route",
   "app.nav.transactions": "Transactions",
   "app.nav.block_monitor": "Block Monitor",
  "app.shell.doc": "Documentation",
  "app.shell.status.live": "Robinhood Chain live",
  "app.shell.status.unavail": "Robinhood Chain disconnected",
  "app.shell.status.readonly": "Read-only RPC",
   "app.overview.eyebrow": "Operations / 00",
   "app.overview.title": "Overview.",
   "app.overview.copy": "Verified read-only chain and wallet signals for Robinhood Chain Mainnet.",
   "app.assets.eyebrow": "Wallet / 01",
   "app.assets.title": "Assets.",
   "app.assets.copy": "Only your connected wallet’s verified native ETH read is shown here.",
   "app.blocks.eyebrow": "Network / 02",
   "app.blocks.title": "Live blocks.",
   "app.blocks.copy": "Verified read-only data from Robinhood Chain Mainnet.",
   "app.blocks.scanner_title": "Live chain data",
   "app.blocks.scanner_copy": "Latest transactions from Robinhood Chain Mainnet, refreshed every 12 seconds.",
   "app.blocks.live_badge": "Live",
   "app.blocks.latest_block": "Latest block",
   "app.blocks.loaded_count": "Loaded transactions",
   "app.blocks.block_time": "Block time UTC",
   "app.blocks.rpc_latency": "RPC latency",
   "app.blocks.search_label": "Filter transactions",
   "app.blocks.search_placeholder": "Hash, address, or block number",
   "app.blocks.search_note": "Filtering loaded transactions only",
   "app.blocks.refresh": "Refresh",
   "app.blocks.updating": "Updating…",
   "app.blocks.error": "Live transaction data could not be loaded.",
   "app.blocks.retry": "Retry",
   "app.blocks.empty": "No transactions in the latest block.",
   "app.blocks.no_matches": "No loaded transactions match this filter.",
    "app.network.eyebrow": "Network / 03",
    "app.network.title": "Block monitor.",
    "app.network.copy": "Verified read-only chain status and the latest block signal from Robinhood Chain Mainnet.",
   "app.blocks.transfer": "Transfer",
   "app.blocks.th.hash": "Transaction hash",
   "app.blocks.th.method": "Method",
   "app.blocks.th.block": "Block",
   "app.blocks.th.time": "Time UTC",
   "app.blocks.th.from": "From",
   "app.blocks.th.to": "To",
   "app.blocks.th.value": "Value ETH",
   "app.blocks.th.gas": "Gas",
   "app.data.live_verified": "Verified live reads",
   "app.data.live": "Live",
   "app.data.loading": "Loading…",
   "app.data.error": "Live read failed. Try again shortly.",
   "app.data.connected": "Wallet connected",
   "app.data.disconnected": "Wallet disconnected",
   "app.data.wallet_read": "Connected wallet",
   "app.data.connect_balance": "Connect a wallet to read its native ETH balance.",
   "app.data.connect_assets": "Connect a wallet to view its native ETH balance.",
   "app.data.address": "Address",
   "app.data.native_balance": "Native ETH balance",
   "app.data.block": "Block",
   "app.data.hash": "Block hash",
   "app.data.timestamp": "Block timestamp (UTC)",
   "app.data.gas": "Gas price",
   "app.data.latency": "RPC latency",
   "app.data.chain_id": "Chain ID",
   "app.data.explorer": "Open explorer",
   "app.data.read_status": "Read status",

  // Swap Page
  "swap.title.eyebrow": "Private routing terminal / 01",
  "swap.title.main": "Prepare a transfer request.",
  "swap.title.status": "Requests can be saved",
  "swap.title.pending": "Database backed",
  "swap.act.title": "Recent activity",
  "swap.act.view": "View all orders",
  "swap.act.sealed": "SEALED ROUTE",
  "swap.act.ago": "{time} ago",
  "swap.tab.sealed": "Sealed",
  "swap.tab.transit": "Sending is not available yet",
  "swap.form.sealed.t": "Private route intents",
  "swap.form.sealed.p": "Authenticate to review route intents owned by this wallet. Execution is not connected.",
  "swap.form.send": "You send",
  "swap.form.recv": "Output estimate pending",
  "swap.form.btn.conn": "Connect to continue",
  "swap.form.btn.conf": "Not ready",
  "swap.form.btn.build": "Not ready",
  "swap.form.btn.quote": "Not ready",
  "swap.form.meta.sealed": "Private settlement / pending",
  "swap.form.meta.time": "Pending",
  "swap.stat.vol": "READ STATUS",
  "swap.stat.prov": "PROVIDERS NOT CONNECTED",
  "swap.stat.avg": "ROUTE INTENTS",
  "swap.pos.title": "Your position",
  "swap.pos.live": "LIVE NATIVE BALANCE",
  "swap.pos.unavail": "Balance could not be loaded.",
  "swap.pos.block": "Robinhood Chain block {block}",
  "swap.pos.pending": "pending",
  "swap.pos.conn": "Connect to read your native ETH balance.",
  "swap.prev.title": "Route preview",
  "swap.prev.live": "Live",
  "swap.prev.tr": "Transit",
  "swap.prev.pr": "Provider not connected",
  "swap.prev.ar": "Arrival pending",
  "swap.prev.direct": "Direct",
  "swap.toast.quote": "Quotes are not connected",
  "swap.toast.order": "Order preview created",
  "swap.loading": "Loading…",
  "swap.form.aria": "Swap form",
  "swap.tab.aria": "Swap mode",
  "swap.form.switch": "Switch assets",

  // Orders Page
  "orders.title.eyebrow": "Ledger / 02",
  "orders.title.main": "Route intents.",
  "orders.title.p": "Backend-backed private route intents owned by the authenticated wallet.",
  "orders.btn.new": "New route not ready",
  "orders.panel.title": "Recent activity",
  "orders.panel.count": "{count} records",
  "orders.th.order": "Order",
  "orders.th.mode": "Mode",
  "orders.th.mov": "Movement",
  "orders.th.stat": "Status",
  "orders.th.date": "Date",

  // Order Detail Page
  "order.back": "← Orders",
  "order.subtitle": "Route intent",
  "order.grid.amt": "Intent amounts",
  "order.grid.send": "Input",
  "order.grid.recv": "Minimum output",
  "order.grid.route": "Route parameters",
  "order.grid.prov": "Provider not connected",
  "order.grid.tr": "Transit layer",
  "order.grid.fee": "Fee pending",
  "order.grid.stat": "Local status",
  "order.grid.date": "Initiated on",
  "order.grid.id": "Internal ID",
  "order.settle.title": "Destination commitment",
  "order.settle.p": "A commitment is stored; no settlement is executed.",
  "order.settle.copy": "Copy",
  "order.settle.copied": "Copied",
  "order.notice.title": "Backend route intent",
  "order.notice.p": "This record is an authenticated swap route intent. No funds were transferred by this record; native ETH Shield is a separate live capability.",

  // Providers Page
  "prov.title.eyebrow": "Network / 03",
  "prov.title.main": "Providers not connected.",
  "prov.title.p": "Provider discovery is not connected to the current backend.",
  "prov.th.prov": "Provider",
  "prov.th.type": "Type",
  "prov.th.pair": "Pairs",
  "prov.th.stat": "Status",
  "prov.stat.active": "Active",
  "prov.stat.sim": "Not connected",
  "prov.online": "0 connected",
  "prov.routes": "Routes not connected",
  "prov.notes": "Coverage notes",
  "prov.last": "Last route check",
  "prov.seconds": "No check available",
  "prov.spread": "Spread pending",
  "prov.region": "Current region",
  "prov.global": "Global",
  "prov.note": "Provider identity and route quality are shown before you commit. SealedCash does not custody your assets.",

  // Settings Page
  "set.title.eyebrow": "Preferences / 04",
  "set.title.main": "Settings.",
  "set.title.p": "Manage your local workspace.",
  "set.sec.lang": "Language",
  "set.sec.lang_p": "Select your preferred interface language.",
  "set.sec.disp": "Display",
  "set.sec.disp_p": "Terminal visual density.",
  "set.disp.opt": "Default",
  "set.sec.tour": "Product Tour",
  "set.sec.tour_p": "Replay the introduction sequence.",
  "set.tour.btn": "Restart tour",
  "set.sec.conn": "Connection",
  "set.sec.conn_p": "Manage wallet access on Robinhood Chain.",
  "set.conn.btn": "Disconnect wallet",
  "set.conn.none": "No wallet connected",
  "set.toast.lang": "Language updated",
  "set.toast.tour": "Tour restarted",

  // Connect Page
  "conn.title.eyebrow": "Access / 00",
  "conn.title.main": "Connect wallet.",
  "conn.title.p": "SealedCash requires a wallet on Robinhood Chain Mainnet.",
  "conn.btn": "Connect via Reown",
  "conn.feat1": "Non-custodial",
  "conn.feat2": "Robinhood Chain",
  "conn.feat3": "Read-only preview",

  // Assistant
  "ast.title": "Privacy Assistant",
  "ast.sub": "SealedCash knowledge only",
  "ast.notice": "Never share seed phrases or private keys.",
  "ast.loading": "Checking SealedCash…",
  "ast.ph": "Ask about privacy routing…",
  "ast.aria.ask": "Ask about SealedCash",
  "ast.aria.send": "Send question",
  "ast.unavailable": "Assistant could not respond",
  "ast.brand": "SealedCash AI",
  "order.transit": "Transit status",
  "order.updated": "Updated just now",
  "order.quote": "Quote pending",
  "order.in_transit": "Transit pending",
  "order.settled": "Settlement pending",
  "order.route_selected": "Provider not connected",
  "order.route_fee": "Provider and fee data are not connected.",
  "order.transit_started": "Private settlement pending",
  "order.transit_pending": "Shielded transfer is pending.",
  "order.destination_pending": "Destination commitment only",
  "order.settlement_pending": "Settlement is pending.",
  "order.details": "Order details",
  "order.sent": "You sent",
  "order.receive": "You receive",
  "order.fee": "Network fee",
  "order.privacy": "Privacy route",
  "order.off": "Off",
  "order.address": "Destination address",
  "order.copy": "Copy destination address",
  "order.copied": "Address copied locally.",
  "set.default": "Route defaults",
  "set.default_p": "No route creation defaults are available.",
  "set.validity": "Quote validity pending",
  "set.validity_p": "Quote reservation is not connected.",
  "set.confirm": "Confirm before leaving",
  "set.confirm_p": "Ask before navigating away from an active order.",
  "set.seconds": "{count} seconds",
  "set.minutes": "{count} minutes",
  "set.session": "Session",
  "set.network": "Network",
  "set.wallet": "Wallet",
  "set.not_connected": "Not connected",
  "set.execution": "Swap execution",
  "set.pending": "Pending integration",
  "set.toast.sealed": "Route defaults are not ready",
  "conn.connected": "Wallet connected",
  "conn.manage": "Manage wallet",
  "conn.goto": "Go to swap desk",
  "conn.description": "Connect an EVM wallet through Reown AppKit. SealedCash only enables Robinhood Chain Mainnet.",
  "conn.open": "Open wallet connection",

  // 404
  "404.title": "404 Page Not Found",
  "404.p": "Path not found in local preview.",
  "404.btn": "Return home",
  
  // Formatters
  "fmt.duration.min": "min",
  "fmt.duration.sec": "s",
  "app.assets.verified_one": "1 verified asset",
  "app.assets.connect_view": "Connect to view assets",
  "app.assets.eth_name": "Ethereum Native",
  "app.assets.indexing_pending": "Token indexing pending",
  "app.assets.indexing_desc": "Only native ETH balance is currently verified on this network."
};

export type TranslationKey = keyof typeof en;
export type Dictionary = Partial<Record<TranslationKey, string>>;

const dictionaries: Record<Locale, Dictionary> = {
  'en': en,
  'zh-CN': {
    "nav.protocol":"协议","nav.mechanism":"机制","nav.services":"服务","nav.workflow":"流程","nav.why_us":"为什么选择我们？","nav.launch":"启动应用",
     "landing.hero.kicker":"SEALEDCASH 协议","landing.hero.title1":"更安静的标准","landing.hero.title2":"为隐私而生","landing.hero.title3":"路由","landing.hero.sub":"SealedCash supports native ETH Shield deposits, local proofs, private withdrawals, relaying, and settlement readiness. Swap quotes, providers, and swap execution are unavailable.","landing.hero.btn_app":"打开应用","landing.hero.btn_more":"查看更多详情 ↗","landing.hero.explore":"探索协议","landing.hero.explore_sub":"继续向下","landing.hero.privacy_features":"隐私功能",
    "landing.about.eyebrow":"01 / 关于 SealedCash","landing.about.title":"隐私是一条路径，而不是一个设置。","landing.about.copy":"SealedCash 提供钱包验证、经过验证的链上读取和私密转账意图记录。结算仍不可用。","landing.mech.eyebrow":"02 / 架构","landing.mech.title1":"外部广泛。","landing.mech.title2":"中间私密。","landing.comp.eyebrow":"03 / 路径","landing.comp.title":"只读基础。","landing.wf.eyebrow":"04 / 私密路由","landing.wf.title1":"一条路由。","landing.wf.title2":"三个安静步骤。","landing.prov.eyebrow":"05 / 覆盖范围","landing.prov.title":"更广阔的市场视野。更安静的路径。","landing.cta.title":"准备安静地行动了吗？","landing.cta.btn":"启动应用"
  },
  'ja': {
    "nav.protocol":"プロトコル","nav.mechanism":"仕組み","nav.services":"サービス","nav.workflow":"ワークフロー","nav.why_us":"選ばれる理由","nav.launch":"アプリを起動",
     "landing.hero.kicker":"SEALEDCASH プロトコル","landing.hero.title1":"より静かな標準","landing.hero.title2":"プライバシーのための","landing.hero.title3":"ルーティング","landing.hero.sub":"SealedCash supports native ETH Shield deposits, local proofs, private withdrawals, relaying, and settlement readiness. Swap quotes, providers, and swap execution are unavailable.","landing.hero.btn_app":"アプリを開く","landing.hero.btn_more":"詳細を見る ↗","landing.hero.explore":"プロトコルを見る","landing.hero.explore_sub":"下へ続く","landing.hero.privacy_features":"プライバシー機能",
    "landing.about.eyebrow":"01 / SealedCash について","landing.about.title":"プライバシーは設定ではなく、経路です。","landing.about.copy":"現在はウォレット認証、検証済みチェーン読み取り、プライベート転送インテントを提供しています。決済は利用できません。","landing.mech.eyebrow":"02 / アーキテクチャ","landing.mech.title1":"外側は広く。","landing.mech.title2":"中間はプライベートに。","landing.comp.eyebrow":"03 / 経路","landing.comp.title":"読み取り専用の基盤。","landing.wf.eyebrow":"04 / プライベートルート","landing.wf.title1":"ひとつの経路。","landing.wf.title2":"三つの静かな動き。","landing.prov.eyebrow":"05 / カバレッジ","landing.prov.title":"より広い市場。より静かな経路。","landing.cta.title":"静かに進む準備はできましたか？","landing.cta.btn":"アプリを起動"
  },
  'ru': {
    "nav.protocol":"ПРОТОКОЛ","nav.mechanism":"МЕХАНИЗМ","nav.services":"СЕРВИСЫ","nav.workflow":"ПРОЦЕСС","nav.why_us":"ПОЧЕМУ МЫ?","nav.launch":"Запустить",
     "landing.hero.kicker":"ПРОТОКОЛ SEALEDCASH","landing.hero.title1":"Более тихий стандарт","landing.hero.title2":"для приватной","landing.hero.title3":"маршрутизации","landing.hero.sub":"SealedCash supports native ETH Shield deposits, local proofs, private withdrawals, relaying, and settlement readiness. Swap quotes, providers, and swap execution are unavailable.","landing.hero.btn_app":"Открыть приложение","landing.hero.btn_more":"Подробнее ↗","landing.hero.explore":"Изучить протокол","landing.hero.explore_sub":"Продолжить ниже","landing.hero.privacy_features":"Функции приватности",
    "landing.about.eyebrow":"01 / О SealedCash","landing.about.title":"Приватность — это маршрут, а не настройка.","landing.about.copy":"Сейчас доступны авторизация кошелька, проверенные данные сети и приватные маршрутные намерения. Приватные расчёты SealedCash находятся в разработке.","landing.mech.eyebrow":"02 / Архитектура","landing.mech.title1":"Широко снаружи.","landing.mech.title2":"Приватно внутри.","landing.comp.eyebrow":"03 / Маршруты","landing.comp.title":"Основа только для чтения.","landing.wf.eyebrow":"04 / Приватный маршрут","landing.wf.title1":"Один маршрут.","landing.wf.title2":"Три тихих шага.","landing.prov.eyebrow":"05 / Охват","landing.prov.title":"Шире рынок. Тише маршрут.","landing.cta.title":"Готовы двигаться тихо?","landing.cta.btn":"Запустить приложение"
  },
  'de': {
    "nav.protocol":"PROTOKOLL","nav.mechanism":"MECHANISMUS","nav.services":"DIENSTE","nav.workflow":"ABLAUF","nav.why_us":"WARUM WIR?","nav.launch":"App starten",
     "landing.hero.kicker":"SEALEDCASH PROTOKOLL","landing.hero.title1":"Ein leiserer Standard","landing.hero.title2":"für private","landing.hero.title3":"Routen","landing.hero.sub":"SealedCash supports native ETH Shield deposits, local proofs, private withdrawals, relaying, and settlement readiness. Swap quotes, providers, and swap execution are unavailable.","landing.hero.btn_app":"App öffnen","landing.hero.btn_more":"Mehr erfahren ↗","landing.hero.explore":"Protokoll erkunden","landing.hero.explore_sub":"Unten weiterlesen","landing.hero.privacy_features":"Datenschutzfunktionen",
    "landing.about.eyebrow":"01 / Über SealedCash","landing.about.title":"Privatsphäre ist eine Route, keine Einstellung.","landing.about.copy":"Derzeit verfügbar sind Wallet-Authentifizierung, verifizierte Chain-Daten und private Routenabsichten. Die private SealedCash-Abwicklung befindet sich in Entwicklung.","landing.mech.eyebrow":"02 / Die Architektur","landing.mech.title1":"Außen breit.","landing.mech.title2":"In der Mitte privat.","landing.comp.eyebrow":"03 / Die Wege","landing.comp.title":"Schreibgeschützte Grundlage.","landing.wf.eyebrow":"04 / Private Route","landing.wf.title1":"Eine Route.","landing.wf.title2":"Drei leise Schritte.","landing.prov.eyebrow":"05 / Abdeckung","landing.prov.title":"Mehr Marktübersicht. Eine leisere Route.","landing.cta.title":"Bereit, sich leise zu bewegen?","landing.cta.btn":"App starten"
  },
  'fr': {
    "nav.protocol":"PROTOCOLE","nav.mechanism":"MÉCANISME","nav.services":"SERVICES","nav.workflow":"PARCOURS","nav.why_us":"POURQUOI NOUS ?","nav.launch":"Lancer l’app",
     "landing.hero.kicker":"PROTOCOLE SEALEDCASH","landing.hero.title1":"Un standard plus discret","landing.hero.title2":"pour un routage","landing.hero.title3":"privé","landing.hero.sub":"SealedCash supports native ETH Shield deposits, local proofs, private withdrawals, relaying, and settlement readiness. Swap quotes, providers, and swap execution are unavailable.","landing.hero.btn_app":"Ouvrir l’app","landing.hero.btn_more":"Voir les détails ↗","landing.hero.explore":"Explorer le protocole","landing.hero.explore_sub":"Continuer ci-dessous","landing.hero.privacy_features":"Fonctions de confidentialité",
    "landing.about.eyebrow":"01 / À propos de SealedCash","landing.about.title":"La confidentialité est un itinéraire, pas un réglage.","landing.about.copy":"SealedCash fournit actuellement l’authentification du portefeuille, des lectures vérifiées et des intentions de routage privé. Le règlement privé SealedCash est en cours de développement.","landing.mech.eyebrow":"02 / L’architecture","landing.mech.title1":"Large à l’extérieur.","landing.mech.title2":"Privé au milieu.","landing.comp.eyebrow":"03 / Les parcours","landing.comp.title":"Une base en lecture seule.","landing.wf.eyebrow":"04 / Route privée","landing.wf.title1":"Une route.","landing.wf.title2":"Trois mouvements discrets.","landing.prov.eyebrow":"05 / Couverture","landing.prov.title":"Une vision plus large. Une route plus discrète.","landing.cta.title":"Prêt à avancer discrètement ?","landing.cta.btn":"Lancer l’app"
  }
};

const staticTextKeys = new WeakMap<Text, TranslationKey>();
const englishTextKeys = new Map(
  Object.entries(en).map(([key, value]) => [value, key as TranslationKey]),
);

function translateStaticText(locale: Locale) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Text | null;

  while ((node = walker.nextNode() as Text | null)) {
    const parent = node.parentElement;
    if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(parent.tagName)) continue;

    const current = node.nodeValue ?? '';
    const trimmed = current.trim();
    if (!trimmed) continue;

    const key = staticTextKeys.get(node) ?? englishTextKeys.get(trimmed);
    if (!key) continue;

    staticTextKeys.set(node, key);
    const translated = dictionaries[locale][key] ?? en[key];
    const next = current.replace(trimmed, translated);
    if (current !== next) node.nodeValue = next;
  }
}

interface I18nContextType {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  formatNumber: (val: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (isoString: string, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (isoString: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('sealedcash-locale') as Locale;
    return saved && LOCALES[saved] ? saved : 'en';
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    translateStaticText(locale);

    const observer = new MutationObserver(() => translateStaticText(locale));
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [locale]);

  const setLocale = (loc: Locale) => {
    setLocaleState(loc);
    localStorage.setItem('sealedcash-locale', loc);
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>) => {
    let str = dictionaries[locale]?.[key] ?? dictionaries['en'][key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return str;
  };

  const formatNumber = (val: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(locale, options).format(val);
  };

  const formatDate = (isoString: string, options?: Intl.DateTimeFormatOptions) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(date);
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, formatNumber, formatDate, formatDateTime }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
