import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

/** Personal data export (DPDP Act right to access). Excludes password hashes and session tokens. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const data = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      email: true, name: true, phone: true, birthday: true, createdAt: true, referralCode: true,
      addresses: true, preferences: true, consents: true, scentProfiles: true, wishlist: { select: { productId: true, createdAt: true } },
      reviews: { select: { productId: true, rating: true, title: true, body: true, status: true, createdAt: true } },
      orders: { include: { items: true, refunds: true, shipments: true } }, discoveryCredits: true, loyaltyAccount: { include: { transactions: true } }, tickets: true,
    },
  });
  await db.dataRequest.create({ data: { userId: user.id, type: "EXPORT", status: "COMPLETED", completedAt: new Date() } });
  await audit(user.id, "data_request.export", "User", user.id);
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="my-data.json"`, "Cache-Control": "no-store" } });
}
