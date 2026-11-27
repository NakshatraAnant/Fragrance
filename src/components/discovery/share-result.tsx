"use client";
import { useToast } from "@/components/ui/toast";

export function ShareResult({ title }: { title: string }) {
  const { toast } = useToast();
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `I'm ${title}`, text: `My Vasana House scent personality: ${title}`, url });
      else { await navigator.clipboard.writeText(url); toast("Link copied", "success"); }
    } catch { /* user cancelled */ }
  }
  return <button className="btn btn-outline !border-bg !text-bg" onClick={share}>Share my result</button>;
}
