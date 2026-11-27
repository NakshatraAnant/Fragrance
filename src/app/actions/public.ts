"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendTemplate } from "@/lib/messaging";
import { randomToken } from "@/lib/password";
import { formObject, zodErrors, type FormState } from "@/lib/form-state";

const Appointment = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid Indian mobile number."),
  city: z.string().trim().min(2, "Enter a city.").max(80),
  preferredDate: z.string().trim().min(4, "Choose a preferred date."),
  interest: z.string().trim().max(200).optional(),
  message: z.string().trim().max(1000).optional(),
});

export async function requestAppointment(_: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit(`appt:${await clientIp()}`, 5, 3600_000).ok) return { ok: false, message: "Too many requests. Please try later." };
  const p = Appointment.safeParse(formObject(fd));
  if (!p.success) return { ok: false, errors: zodErrors(p.error), data: formObject(fd) };
  await db.appointmentRequest.create({ data: p.data });
  await sendTemplate("APPOINTMENT_REQUESTED", "EMAIL", { email: p.data.email }, { name: p.data.name, city: p.data.city, date: p.data.preferredDate });
  return { ok: true, message: "Thank you. A client advisor will confirm your appointment by email." };
}

const Ticket = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z.string().trim().max(20).optional(),
  topic: z.enum(["ORDER", "PRODUCT", "RETURN", "GIFTING", "ACCOUNT", "OTHER"], { error: "Choose a topic." }),
  orderNumber: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10, "Tell us a little more (10+ characters).").max(3000),
});

export async function submitTicket(_: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit(`ticket:${await clientIp()}`, 6, 3600_000).ok) return { ok: false, message: "Too many requests. Please try later." };
  const p = Ticket.safeParse(formObject(fd));
  if (!p.success) return { ok: false, errors: zodErrors(p.error), data: formObject(fd) };
  const user = await getCurrentUser();
  const number = `SR-${randomToken(4).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6)}`;
  await db.supportTicket.create({ data: { ...p.data, phone: p.data.phone || null, orderNumber: p.data.orderNumber || null, number, userId: user?.id ?? null } });
  await sendTemplate("SUPPORT_RECEIVED", "EMAIL", { email: p.data.email }, { name: p.data.name, ticket: number });
  return { ok: true, message: `Thank you. Your reference is ${number}. We'll reply by email.` };
}
