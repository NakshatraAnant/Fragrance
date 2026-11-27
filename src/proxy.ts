import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-of-app gate (Next 16 "proxy", formerly middleware). It only checks that a session cookie
 * exists for protected areas, so unauthenticated users are redirected without rendering. Real
 * authorisation (session validity, roles, permissions) is always enforced server-side in each
 * page and server action.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const needsSession = pathname.startsWith("/admin") || (pathname.startsWith("/account") && !/^\/account\/(login|register|forgot|reset)/.test(pathname));
  if (needsSession && !req.cookies.get("fh_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/account/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/account/:path*"] };
