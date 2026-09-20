import { ReactNode } from 'react';
import './ServicePages.css';

export function ServiceLayout({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="svc-root">
      <header className="svc-header">
        <div className="svc-header-logo">
          <img src={`${import.meta.env.BASE_URL}sealedcash-logo.png`} alt="SealedCash" />
          <span className="svc-header-name">{name}</span>
        </div>
        <div className="svc-badge">Robinhood Chain Mainnet</div>
      </header>
      <main className="svc-main">
        {children}
      </main>
    </div>
  );
}
