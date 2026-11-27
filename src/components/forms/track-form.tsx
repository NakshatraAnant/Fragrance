"use client";
import { useActionState } from "react";
import { trackOrder } from "@/app/actions/orders";
import { Field, FormMessage, Submit } from "./fields";

export function TrackForm({ initialNumber }: { initialNumber: string }) {
  const [state, action] = useActionState(trackOrder, null);
  return (
    <form action={action} className="grid gap-4">
      <Field name="number" label="Order number" required placeholder="FH-…" defaultValue={(state?.data?.number as string) ?? initialNumber} state={state} />
      <Field name="email" label="Email" type="email" required state={state} defaultValue={state?.data?.email as string | undefined} />
      <FormMessage state={state} />
      <Submit>Track order</Submit>
    </form>
  );
}
