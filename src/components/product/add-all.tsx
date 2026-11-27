"use client";
import { useCart } from "@/components/cart/cart-provider";

export function AddAllButton({ variantIds, label = "Add all to bag", className = "btn btn-primary" }: { variantIds: string[]; label?: string; className?: string }) {
  const { mutate, loading } = useCart();
  return <button className={className} disabled={loading} onClick={() => mutate({ action: "addMany", variantIds }, { openDrawer: true, success: "Added to your bag" })}>{label}</button>;
}
