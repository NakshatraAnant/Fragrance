"use server";
import { db } from "@/lib/db";
import { adminAction, optStr, rupeesToPaise, str } from "@/lib/admin";
import { AppError } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { markOrderPaid, refundOrder, releaseOrderHolds } from "@/lib/payments/process";
import { emitCrmEvent } from "@/lib/crm";
import { sendTemplate } from "@/lib/messaging";
import { getSetting } from "@/lib/settings";
import { randomToken } from "@/lib/password";

export async function fulfilmentAction(fd: FormData) {
  const id = str(fd, "orderId");
  await adminAction("orders:write", `/admin/orders/${id}`, async (actor) => {
    const order = await db.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
    const op = str(fd, "op");
    const paidLike = order.paymentStatus === "PAID" || order.paymentStatus === "COD_PENDING";
    switch (op) {
      case "pack":
        if (!paidLike) throw new AppError("Only confirmed orders can be packed.");
        await db.order.update({ where: { id }, data: { fulfilmentStatus: "PACKED" } });
        break;
      case "ship": {
        if (!paidLike) throw new AppError("Only confirmed orders can be shipped.");
        const carrier = str(fd, "carrier");
        if (!carrier) throw new AppError("Enter the carrier.");
        const awb = optStr(fd, "awb");
        const trackingUrl = optStr(fd, "trackingUrl");
        if (trackingUrl && !/^https:\/\//.test(trackingUrl)) throw new AppError("Tracking URL must start with https://");
        await db.$transaction([
          db.shipment.create({ data: { orderId: id, carrier, awb, trackingUrl, status: "IN_TRANSIT", shippedAt: new Date(), events: JSON.stringify([{ at: new Date().toISOString(), status: "IN_TRANSIT" }]) } }),
          db.order.update({ where: { id }, data: { fulfilmentStatus: "SHIPPED" } }),
        ]);
        await sendTemplate("SHIPPED", "EMAIL", { email: order.email, userId: order.userId }, { orderNumber: order.number, carrier, awb: awb ?? "", trackingUrl: trackingUrl ?? "" });
        break;
      }
      case "deliver": {
        if (order.fulfilmentStatus !== "SHIPPED") throw new AppError("Mark the order as shipped first.");
        await db.$transaction([db.order.update({ where: { id }, data: { fulfilmentStatus: "DELIVERED", deliveredAt: new Date() } }), db.shipment.updateMany({ where: { orderId: id }, data: { status: "DELIVERED", deliveredAt: new Date() } })]);
        const cfg = await getSetting("reviews");
        const due = new Date(Date.now() + cfg.requestAfterDeliveryDays * 86400_000);
        for (const it of order.items.filter((x) => x.format !== "DISCOVERY")) {
          const v = await db.variant.findUnique({ where: { id: it.variantId }, include: { product: true } });
          if (v) await emitCrmEvent(db, "REVIEW_REQUEST", { userId: order.userId, email: order.email, payload: { product: v.product.name, slug: v.product.slug }, dueAt: due });
        }
        break;
      }
      case "cod-collected":
        if (order.paymentStatus !== "COD_PENDING") throw new AppError("This isn't a pending cash-on-delivery order.");
        await db.order.update({ where: { id }, data: { paymentStatus: "UNPAID", status: "PENDING_PAYMENT" } });
        await markOrderPaid(id, { provider: "COD", providerPaymentId: `cod_${randomToken(8)}`, amountPaise: order.totalPaise, method: "cod" });
        break;
      case "cancel":
        if (order.paymentStatus === "PAID") throw new AppError("This order is paid. Issue a refund instead of cancelling.");
        if (!(await releaseOrderHolds(id, "CANCELLED"))) throw new AppError("This order can't be cancelled in its current state.");
        break;
      default: throw new AppError("Unknown action.");
    }
    await audit(actor, `order.${op}`, "Order", id);
    return `Order updated (${op}).`;
  });
}

export async function refundAction(fd: FormData) {
  const id = str(fd, "orderId");
  await adminAction("orders:write", `/admin/orders/${id}`, async (actor) => {
    const amount = rupeesToPaise(fd, "amount");
    const reason = str(fd, "reason");
    if (reason.length < 3) throw new AppError("Give a reason for the refund.");
    const r = await refundOrder(id, amount, reason, actor);
    await audit(actor, "order.refund", "Order", id, { amount, reason, status: r.status });
    return r.status === "MANUAL_REQUIRED" ? "Refund recorded as MANUAL_REQUIRED. No connected provider could process it automatically." : `Refund ${r.status.toLowerCase()}.`;
  });
}
