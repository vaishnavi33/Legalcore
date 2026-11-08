// Forwards /api/* to the FastAPI backend. The browser only ever talks to the website's own address,
// so the session cookie stays first-party. API_URL is read at run time.
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const HOP_BY_HOP = ["connection", "keep-alive", "transfer-encoding", "upgrade", "host", "content-length", "accept-encoding"];

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const api = (process.env.API_URL || "http://localhost:8000").replace(/\/$/, "");
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const target = `${api}/api/${path.map(encodeURIComponent).join("/")}${url.search}`;

  const headers = new Headers(req.headers);
  HOP_BY_HOP.forEach((h) => headers.delete(h));
  const init: RequestInit & { duplex?: "half" } = { method: req.method, headers, redirect: "manual", cache: "no-store" };
  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = req.body;
    init.duplex = "half";
  }

  let res: Response;
  try {
    res = await fetch(target, init);
  } catch {
    return Response.json({ detail: "Legal Core is starting up. Please try again in a few seconds." }, { status: 503 });
  }
  const out = new Headers();
  res.headers.forEach((v, k) => {
    if (!["content-encoding", "content-length", "transfer-encoding", "connection", "set-cookie"].includes(k)) out.set(k, v);
  });
  for (const c of res.headers.getSetCookie()) out.append("set-cookie", c);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE };
