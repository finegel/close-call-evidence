'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EvidenceRow } from '@/lib/archive';
type Result = {
  n: number;
  rows: EvidenceRow[];
  total: number;
  truncated: boolean;
  provenance: string;
  source: string;
  archiveThrough: number;
  redacted: boolean;
  note: string;
};
export default function ArchiveLookup() {
  const [n, setN] = useState(''),
    [q, setQ] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [result, setResult] = useState<Result | null>(null);
  async function search() {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch(
        `/api/evidence?n=${encodeURIComponent(n)}&q=${encodeURIComponent(q.trim())}`,
      );
      const value = (await response.json()) as Result & { error?: string };
      if (!response.ok) throw new Error(value.error);
      setResult(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel archive-panel">
      <p className="eyebrow">PUBLIC ARCHIVE / SINGLE-SWEEP LOOKUP</p>
      <h2>Find the trade receipt</h2>
      <p className="fine-print">
        Enter one sweep and a public DID or exact trade ID. This checks only
        that sweep, not your complete trading history. Public identifiers
        only—never a seed, password, or API key.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
        className="archive-form"
      >
        <div>
          <label htmlFor="sweep">Sweep number</label>
          <Input
            id="sweep"
            type="number"
            min="1"
            max="2556"
            required
            placeholder="e.g. 541"
            value={n}
            onChange={(e) => setN(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="identifier">Public DID or exact trade ID</label>
          <Input
            id="identifier"
            required
            maxLength={100}
            placeholder="did:key:z6Mk… or trade ID"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button disabled={busy} type="submit">
          {busy ? 'Verifying…' : 'Find evidence ↗'}
        </Button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {result && (
        <div aria-live="polite">
          <p className={result.redacted ? 'notice' : 'verified'}>
            {result.provenance}
          </p>
          <p className="fine-print">
            Sweep #{result.n} · Archive through #{result.archiveThrough} ·{' '}
            {result.total} matching rows
            {result.truncated ? ' (first 100 shown)' : ''}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>TRADE ID</th>
                  <th>MAKER SIDE</th>
                  <th>TERMS QTY</th>
                  <th>TERMS PRICE</th>
                  <th>OUTCOME / REASON</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={`${row.id}-${i}`}>
                    <td className="did">{row.id}</td>
                    <td>{row.side}</td>
                    <td>{row.qty}</td>
                    <td>{row.px}</td>
                    <td>
                      {row.outcome} / {row.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!result.total && (
            <p className="empty">
              No public matching row in this sweep. Balance and activity remain
              unknown.
            </p>
          )}
          <p className="fine-print">{result.note}</p>
          <a href={result.source} target="_blank" rel="noreferrer">
            Open source archive ↗
          </a>
        </div>
      )}
    </section>
  );
}
