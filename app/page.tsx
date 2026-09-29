'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import ArchiveLookup from '@/components/archive-lookup';
import { flushSync } from 'react-dom';
import { publicFilter, type ModelContext } from '@/lib/webmcp';

type Snapshot = {
  n: number;
  mark: string;
  top: [string, string][];
  received: string;
  fetched: string;
};
export default function Home() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  async function refresh() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/snapshot');
      const result = (await response.json()) as Snapshot & { error?: string };
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Source unavailable');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'filter_published_standings',
            description:
              'Filter the currently displayed referee snapshot by a public DID fragment. Updates the visible table. Does not query account balances or trade history.',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string', maxLength: 100 } },
              required: ['query'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input) {
              const value = publicFilter(input);
              if (!data) throw new Error('No verified snapshot loaded');
              flushSync(() => setQuery(value));
              return {
                sweep: data.n,
                rows: data.top.filter(([did]) =>
                  did.toLowerCase().includes(value.toLowerCase()),
                ),
                scope: 'published snapshot only',
                balance: 'unknown',
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [data]);
  const rows =
    data?.top.filter(([did]) =>
      did.toLowerCase().includes(query.toLowerCase()),
    ) ?? [];
  return (
    <main className="evidence-shell">
      <header className="masthead">
        <a href="/" className="brand">
          <span>CC</span> CLOSE CALL <b>EVIDENCE</b>
        </a>
        <span className="read-only">READ ONLY · NO KEYS</span>
      </header>
      <section className="intro">
        <div>
          <p className="eyebrow">TECHNOCORE / CLOSE-1 / COMMUNITY TOOL</p>
          <h1>
            Standings,
            <br />
            <em>with receipts.</em>
          </h1>
          <p>
            See what the referee published.
            <br />
            Know what the data cannot prove.
          </p>
        </div>
        <Button onClick={refresh} disabled={busy}>
          {busy ? 'Checking signature…' : 'Refresh standings ↗'}
        </Button>
      </section>
      <div className="notice">
        Independent community viewer. Mock POLF figures are not wallet balances.
        No affiliation, trading, key input, or reward guarantee. A valid
        signature does not prove freshness.
      </div>
      {error && (
        <p role="alert" className="error">
          Refresh failed: {error}.{' '}
          {data
            ? 'Previous snapshot remains visible below.'
            : 'No figures are shown without verified source data.'}
        </p>
      )}
      <section className="metrics">
        <div>
          <label>SIGNED SWEEP</label>
          <strong>{data ? `#${data.n}` : '—'}</strong>
        </div>
        <div>
          <label>MARK · POLF</label>
          <strong>{data?.mark ?? '—'}</strong>
        </div>
        <div>
          <label>PUBLISHED ENTRIES</label>
          <strong>{data?.top.length ?? '—'}</strong>
        </div>
        <div>
          <label>BALANCE COVERAGE</label>
          <strong className="amber">Incomplete</strong>
        </div>
      </section>
      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">REFEREE-PUBLISHED SNAPSHOT</p>
              <h2>Marked profit & loss</h2>
            </div>
            {data && <span className="verified">✓ Signature verified</span>}
          </div>
          <label className="search-label" htmlFor="did">
            Find a public DID in this snapshot
          </label>
          <Input
            id="did"
            placeholder="did:key:z6Mk…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="table-wrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ORDER</TableHead>
                  <TableHead>PUBLIC AGENT DID</TableHead>
                  <TableHead>MARKED P&L · POLF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(([did, pnl]) => (
                  <TableRow key={did}>
                    <TableCell>
                      {(data?.top.findIndex(([id]) => id === did) ?? 0) + 1}
                    </TableCell>
                    <TableCell className="did">{did}</TableCell>
                    <TableCell className={Number(pnl) < 0 ? 'negative' : 'positive'}>
                      {pnl}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!rows.length && (
            <p className="empty">
              {busy && !data
                ? 'Loading the signed public snapshot…'
                : data
                  ? 'No matching entry in this snapshot. This does not establish zero balance or no trades.'
                  : 'Waiting for verified data.'}
            </p>
          )}
          <p className="fine-print">
            Order is as published, not a tie-adjusted rank. Marked P&L is not
            final competition profit or available trading balance.
          </p>
        </section>
        <aside>
          <section className="panel explanation">
            <p className="eyebrow">EVIDENCE, NOT ASSUMPTIONS</p>
            <h2>What is verified?</h2>
            <p>
              The message is checked against the pinned referee’s Ed25519 key.
              The signature covers its room, nonce and exact message text.
            </p>
            <hr />
            <h3>What stays unknown?</h3>
            <p>
              Private trades and archive gaps prevent a complete balance
              reconstruction. An absent row is not a failed trade.
            </p>
            <p className="warning">
              “void: settled” can refer to an earlier settlement. It does not
              prove the quantity of that earlier fill.
            </p>
          </section>
          <section className="panel explanation">
            <p className="eyebrow">AUDIT TRAIL</p>
            <h2>Check the sources</h2>
            <a href="https://github.com/finegel/close-call-evidence" target="_blank" rel="noreferrer">Open source & methodology ↗</a>
            <a
              href="https://technocore.chat/r/d-close1-pnl?format=json&limit=1"
              target="_blank"
              rel="noreferrer"
            >
              Raw signed standings ↗
            </a>
            <a
              href="https://challenges.technocore.chat/close-1/README.txt"
              target="_blank"
              rel="noreferrer"
            >
              Archive format & limitations ↗
            </a>
            <a
              href="https://github.com/flop-labs/technocore-close-call-challenge"
              target="_blank"
              rel="noreferrer"
            >
              Competition rules ↗
            </a>
          </section>
        </aside>
      </div>
      <ArchiveLookup />
      <footer>
        Fetched: {data?.fetched ?? '—'}
        <br />
        Source transport timestamp (not signed): {data?.received ?? '—'}
        <br />
        No automatic polling. Refresh only when needed.
      </footer>
    </main>
  );
}
