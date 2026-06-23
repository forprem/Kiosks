import cors from "cors";
import express from "express";
import { BookingStatus, KioskStatus, PaymentStatus } from "@prisma/client";
import Stripe from "stripe";
import { z } from "zod";
import { config } from "./config.js";
import { addOneYear, hasDateOverlap } from "./date-utils.js";
import { prisma } from "./db.js";

const app = express();
const port = config.port;
const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.header("x-admin-token");
  if (!token || token !== config.adminToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "kiosk-booking-backend" });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "kiosk-booking-backend" });
});

app.get("/api", (_req, res) => {
  res.json({ ok: true, service: "kiosk-booking-backend", message: "API root" });
});

app.get("/api/malls", async (_req, res) => {
  const malls = await prisma.mall.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });
  res.json(malls);
});

app.post("/api/admin/malls", requireAdmin, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    city: z.string().min(2),
    mapImageUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const mall = await prisma.mall.create({
    data: {
      name: parsed.data.name,
      city: parsed.data.city,
      mapImageUrl: parsed.data.mapImageUrl ?? null,
      isActive: parsed.data.isActive ?? true
    }
  });

  return res.status(201).json(mall);
});

app.patch("/api/admin/malls/:mallId", requireAdmin, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    city: z.string().min(2).optional(),
    mapImageUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const mall = await prisma.mall.update({
    where: { id: req.params.mallId },
    data: parsed.data
  });

  return res.json(mall);
});

app.get("/api/kiosks", async (req, res) => {
  const schema = z.object({ mallId: z.string().min(1) });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "mallId query parameter is required" });
  }

  const kiosks = await prisma.kiosk.findMany({
    where: { mallId: parsed.data.mallId },
    orderBy: { code: "asc" }
  });
  return res.json(kiosks);
});

app.post("/api/admin/kiosks", requireAdmin, async (req, res) => {
  const schema = z.object({
    mallId: z.string().min(1),
    code: z.string().min(2),
    mapX: z.number().min(0).max(100),
    mapY: z.number().min(0).max(100),
    sizeSqm: z.number().positive().optional(),
    pricePerYear: z.number().int().positive(),
    status: z.nativeEnum(KioskStatus).optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const kiosk = await prisma.kiosk.create({
    data: {
      mallId: parsed.data.mallId,
      code: parsed.data.code,
      mapX: parsed.data.mapX,
      mapY: parsed.data.mapY,
      sizeSqm: parsed.data.sizeSqm,
      pricePerYear: parsed.data.pricePerYear,
      status: parsed.data.status ?? KioskStatus.AVAILABLE
    }
  });

  return res.status(201).json(kiosk);
});

app.patch("/api/admin/kiosks/:kioskId", requireAdmin, async (req, res) => {
  const schema = z.object({
    mapX: z.number().min(0).max(100).optional(),
    mapY: z.number().min(0).max(100).optional(),
    sizeSqm: z.number().positive().nullable().optional(),
    pricePerYear: z.number().int().positive().optional(),
    status: z.nativeEnum(KioskStatus).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const kiosk = await prisma.kiosk.update({
    where: { id: req.params.kioskId },
    data: parsed.data
  });
  return res.json(kiosk);
});

app.post("/api/bookings", async (req, res) => {
  const schema = z.object({
    kioskId: z.string().min(1),
    customerName: z.string().min(2),
    customerEmail: z.string().email(),
    startDate: z.string().datetime()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const kiosk = await prisma.kiosk.findUnique({ where: { id: parsed.data.kioskId } });
  if (!kiosk) {
    return res.status(404).json({ error: "Kiosk not found" });
  }
  if (kiosk.status !== KioskStatus.AVAILABLE) {
    return res.status(409).json({ error: "Kiosk is not available" });
  }

  const start = new Date(parsed.data.startDate);
  if (Number.isNaN(start.getTime())) {
    return res.status(400).json({ error: "Invalid startDate" });
  }
  const end = addOneYear(start);

  const activeBookings = await prisma.booking.findMany({
    where: {
      kioskId: parsed.data.kioskId,
      status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] }
    }
  });

  for (const existing of activeBookings) {
    if (hasDateOverlap(start, end, existing.startDate, existing.endDate)) {
      return res.status(409).json({ error: "Kiosk already booked for that period" });
    }
  }

  const booking = await prisma.booking.create({
    data: {
      kioskId: parsed.data.kioskId,
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      startDate: start,
      endDate: end,
      yearlyPrice: kiosk.pricePerYear,
      status: BookingStatus.PENDING_PAYMENT
    }
  });

  return res.status(201).json(booking);
});

app.post("/api/payments/checkout", async (req, res) => {
  const schema = z.object({ bookingId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { kiosk: true }
  });
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }
  if (booking.status !== BookingStatus.PENDING_PAYMENT) {
    return res.status(409).json({ error: "Booking not eligible for payment" });
  }

  if (!stripe) {
    const mockPayment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: booking.yearlyPrice,
        currency: "usd",
        provider: "mock",
        status: PaymentStatus.PENDING,
        providerSessionId: `mock_${booking.id}`
      }
    });

    return res.json({
      mode: "mock",
      paymentId: mockPayment.id,
      checkoutUrl: `${config.frontendUrl}/payment/mock?bookingId=${booking.id}&paymentId=${mockPayment.id}`
    });
  }

  const successUrl = `${config.frontendUrl}/payment/success?bookingId=${booking.id}`;
  const cancelUrl = `${config.frontendUrl}/payment/cancel?bookingId=${booking.id}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: booking.customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          product_data: {
            name: `Kiosk ${booking.kiosk.code} booking`,
            description: "1-year kiosk rental"
          },
          unit_amount: booking.yearlyPrice * 100
        }
      }
    ],
    metadata: { bookingId: booking.id }
  });

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: booking.yearlyPrice,
      currency: "usd",
      provider: "stripe",
      status: PaymentStatus.PENDING,
      providerSessionId: session.id
    }
  });

  return res.json({ mode: "stripe", paymentId: payment.id, checkoutUrl: session.url });
});

app.post("/api/payments/mock-confirm", async (req, res) => {
  const schema = z.object({ paymentId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const payment = await prisma.payment.update({
    where: { id: parsed.data.paymentId },
    data: { status: PaymentStatus.SUCCEEDED }
  });

  await prisma.booking.update({
    where: { id: payment.bookingId },
    data: { status: BookingStatus.CONFIRMED }
  });

  await prisma.kiosk.update({
    where: { id: (await prisma.booking.findUniqueOrThrow({ where: { id: payment.bookingId } })).kioskId },
    data: { status: KioskStatus.BOOKED }
  });

  return res.json({ ok: true });
});

app.get("/api/bookings/:bookingId", async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.bookingId },
    include: { kiosk: true, payments: true }
  });
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  return res.json(booking);
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
