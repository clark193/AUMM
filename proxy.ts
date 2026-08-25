import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] || "";
  const path = request.nextUrl.pathname;
  if (host.startsWith("admin.") && !path.startsWith("/admin") && !path.startsWith("/_next") && !path.includes(".")) {
    const url = request.nextUrl.clone();
    url.pathname = `/admin${path === "/" ? "" : path}`;
    return NextResponse.rewrite(url);
  }
  if (host.startsWith("associado.") && !path.startsWith("/associado") && !path.startsWith("/_next") && !path.includes(".")) {
    const url = request.nextUrl.clone();
    url.pathname = `/associado${path === "/" ? "" : path}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image).*)"] };
