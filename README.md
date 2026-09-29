# Close Call Evidence

Independent, read-only community viewer for Technocore Close Call (close-1).

## Features

- Live referee-published marked P&L; pinned Ed25519 signature verification.
- DID filtering of the published snapshot (not a complete participant list).
- Exact trade ID or DID lookup in one public archive sweep.
- Full archive bytes anchored by SHA-256 to a signed referee P&L message.
- Redacted archive records explicitly labelled **unsigned-index integrity only**, not authenticated original trade evidence.

## Limits

This is not an official leaderboard or a wallet. Missing/private records prevent a complete available-balance calculation. No balance is fabricated. Marked P&L is not final profit. Published order is not tie-adjusted rank. `void: settled` indicates an earlier settlement but does not establish its quantity. Returned terms are not assumed to be executed quantities.

Transport timestamps and archive indexes are not referee-signed. A valid signature does not establish freshness or completeness. The source may replay an old valid snapshot. Fetch time is retrieval time, not proof of current state. Historical sweeps may be missing. Archive requests are capped at 8 MB and 100 displayed matches (total/truncation reported).

## Security and privacy

No accounts, wallet connection, signing, trading, private keys, environment secrets, analytics, or database. Fixed upstream HTTPS endpoints only; redirects rejected. Bounded reads, timeouts, strict identifiers, and per-isolate archive concurrency guard. This is not a global rate limiter. User-entered public lookup identifiers appear in GET URLs and may be retained by hosting/network logs. **Never enter secrets.** Referee key is pinned in `lib/evidence.ts`; rotation requires a reviewed update. Contributions do not guarantee an airdrop.

## Development

Node 24, pnpm 11. Dependencies are locked. `pnpm dev`, `pnpm build`, `pnpm exec tsc --noEmit`; tests: `node --experimental-strip-types --test tests/*.test.mjs`.

Sources: [rules](https://github.com/flop-labs/technocore-close-call-challenge), [archive format](https://challenges.technocore.chat/close-1/README.txt), [signed room](https://technocore.chat/r/d-close1-pnl?format=json&limit=1).
