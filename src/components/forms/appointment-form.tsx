"use client";
import { useActionState } from "react";
import { requestAppointment, submitTicket } from "@/app/actions/public";
import { Field, FormMessage, SelectField, Submit, TextArea } from "./fields";

export function AppointmentForm() {
  const [state, action] = useActionState(requestAppointment, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="grid gap-5 md:grid-cols-2" noValidate>
      <Field name="name" label="Name" state={state} required autoComplete="name" />
      <Field name="email" label="Email" type="email" state={state} required autoComplete="email" />
      <Field name="phone" label="Mobile" type="tel" state={state} required autoComplete="tel" />
      <Field name="city" label="City" state={state} required />
      <Field name="preferredDate" label="Preferred date" type="date" state={state} required />
      <Field name="interest" label="Interested in" state={state} placeholder="e.g. Rajmahal Rose, a wedding gift" />
      <TextArea name="message" label="Anything we should know?" state={state} className="md:col-span-2" />
      <FormMessage state={state} />
      <div className="md:col-span-2"><Submit>Request appointment</Submit></div>
    </form>
  );
}

export function SupportForm() {
  const [state, action] = useActionState(submitTicket, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="grid gap-5 md:grid-cols-2" noValidate>
      <Field name="name" label="Name" state={state} required autoComplete="name" />
      <Field name="email" label="Email" type="email" state={state} required autoComplete="email" />
      <Field name="phone" label="Mobile (optional)" type="tel" state={state} autoComplete="tel" />
      <SelectField name="topic" label="Topic" state={state} required options={[["ORDER", "An order"], ["PRODUCT", "A product or scent"], ["RETURN", "Return or exchange"], ["GIFTING", "Gifting"], ["ACCOUNT", "My account"], ["OTHER", "Something else"]]} />
      <Field name="orderNumber" label="Order number (if any)" state={state} placeholder="FH-…" className="md:col-span-2" />
      <TextArea name="message" label="How can we help?" state={state} required className="md:col-span-2" />
      <FormMessage state={state} />
      <div className="md:col-span-2"><Submit>Send</Submit></div>
    </form>
  );
}
