import { connection } from "next/server";
import { findCode } from "@/lib/verification/check";
export async function GET() {
  await connection();
  return Response.json({
    lastfm: await findCode("lastfm", "bg949", "TAP-ZZZZ-ZZZZ"),
    lastfm_nouser: await findCode("lastfm", "zzzqqq9999nouser", "X"),
    lb: await findCode("letterboxd", "bg49", "TAP-ZZZZ-ZZZZ"),
    lb_nouser: await findCode("letterboxd", "zzzqqq9999nouser", "X"),
  });
}
