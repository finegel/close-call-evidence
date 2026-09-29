import { boundedGet, verifyMessage, ROOM } from '@/lib/evidence';
let cached:
  | { until: number; value: Awaited<ReturnType<typeof verifyMessage>> }
  | undefined;
export async function GET() {
  try {
    if (cached && cached.until > Date.now()) return Response.json(cached.value);
    const source = await boundedGet(
      `https://technocore.chat/r/${ROOM}?format=json&limit=1`,
    );
    const value = await verifyMessage(source.messages?.[0]);
    cached = { until: Date.now() + 60_000, value };
    return Response.json(value, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch (error) {
    console.error(
      'Snapshot verification:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return Response.json(
      {
        error:
          'Public source unavailable or signature/schema verification failed',
      },
      { status: 502 },
    );
  }
}
