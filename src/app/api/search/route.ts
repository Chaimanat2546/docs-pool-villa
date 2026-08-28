import { getPublicSearchResults, normalizePublicSearchParams } from "@/lib/docs/public-search";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const input = normalizePublicSearchParams({ q: url.searchParams.get("q") ?? undefined });

  try {
    const results = await getPublicSearchResults({ query: input.query, page: 1 });
    return Response.json(
      { items: results.items.slice(0, 10) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "ไม่สามารถค้นหาคู่มือได้" }, { status: 500 });
  }
}
