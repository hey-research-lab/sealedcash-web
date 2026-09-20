# SealedCash Web

The official SealedCash web interface for privacy-first, non-custodial native ETH workflows on Robinhood Chain. The interface keeps wallet ownership with the user, generates privacy proofs locally when the configured circuit artifact is available, and fails closed when a required service or deployment is not configured.

SealedCash is maintained by [sealedcash-org](https://github.com/sealedcash-org). Questions and security reports should be sent to [support@sealedcash.com](mailto:support@sealedcash.com).

Official repository: [sealedcash-org/sealedcash-web](https://github.com/sealedcash-org/sealedcash-web).

## Scope and capability status

- Connects a user-owned wallet through Reown AppKit and Wagmi.
- Reads wallet and protocol status through a configurable SealedCash API.
- Keeps the native ETH privacy flow and local Noir/UltraHonk proof worker from the original SealedCash implementation.
- Presents unsupported swaps, private settlement, and other unverified routes as unavailable rather than simulating execution.

**Available when configured:** wallet connection, authenticated API reads, native ETH privacy-proof preparation, and status surfaces backed by verified service responses.

**Unavailable by design in this release:** executable swaps, verified liquidity routing, private balance settlement, bridge execution, solver or relayer operation, and any movement of funds without an explicitly configured and verified deployment.

This repository does not contain private keys, service credentials, deployed addresses, RPC endpoints, or production deployment claims. A configured API and deployment are required before any network-backed action can be used.

## Architecture

`src/App.tsx` owns the wallet-facing product surface and truthful capability states. `src/api` is the generated relative-path API client and receives its base URL from `VITE_API_BASE_URL`. `src/privacy` contains the browser worker that derives note data and generates the original SealedCash Noir/UltraHonk proof flow locally. `src/lib/reown.ts` defines the Robinhood Chain wallet network from public deployment-specific environment values. The API, contracts, circuit artifact, and relayer are maintained in separate official repositories.

## Environment variables

| Variable | Required | Purpose | Example |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | For API-backed screens | Base URL for a SealedCash API | `https://api.example.invalid` |
| `VITE_REOWN_PROJECT_ID` | For wallet connection | Public AppKit project identifier | `your_reown_project_id` |
| `VITE_CHAIN_RPC_URL` | For chain reads | RPC endpoint selected by the deployment owner | `https://rpc.example.invalid` |
| `VITE_CHAIN_EXPLORER_URL` | For links | Explorer base URL selected by the deployment owner | `https://explorer.example.invalid` |
| `VITE_SEALEDCASH_POOL_ADDRESS` | For proof/deposit flows | Verified pool address for the selected deployment | `0x0000000000000000000000000000000000000000` |

The values above are placeholders only. Never commit a real credential, private key, production endpoint, deployed address, or deployment hash. Copy `.env.example` to `.env.local` and keep that file untracked.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_API_BASE_URL` to a development API you control.
3. Set `VITE_REOWN_PROJECT_ID` to your own public AppKit project identifier.
4. Set `VITE_CHAIN_RPC_URL`, `VITE_CHAIN_EXPLORER_URL`, and `VITE_SEALEDCASH_POOL_ADDRESS` only for a deployment you have verified.
5. Install dependencies with your package manager and run:

```sh
npm run dev
```

Build and typecheck before publishing:

```sh
npm run typecheck
npm run build
```

The API client under `src/api` is a standalone copy of the generated SealedCash contract client. Its relative endpoints are resolved against `VITE_API_BASE_URL`; browser credentials are never committed to this repository.

## Tests

The proof integration test exercises field encoding, Merkle paths, note encryption inputs, and proof shape. It does not call a live RPC or claim that a deployment is valid. Run `npm run test` after dependencies are installed.

## Security

Read [SECURITY.md](SECURITY.md) before reporting a vulnerability. Do not paste private keys, access tokens, or production credentials into issues.

## License

MIT © SealedCash.