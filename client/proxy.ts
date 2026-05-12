import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (process.env.COMING_SOON !== "true") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/dossiers",
    "/dossiers/:path*",
    "/classificateur",
    "/classificateur/:path*",
    "/importateurs",
    "/importateurs/:path*",
    "/parametres",
    "/parametres/:path*",
  ],
};
