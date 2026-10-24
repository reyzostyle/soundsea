// Free Supabase projects pause after a week without database activity, and a
// paused project makes the library look empty. A daily Vercel cron hits this
// route, which runs one real query so the project never counts as idle.
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ ok: false, error: "supabase not configured" }, { status: 500 });

  const res = await fetch(`${url}/rest/v1/tracks?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  return Response.json({ ok: res.ok, status: res.status }, { status: res.ok ? 200 : 502 });
}
