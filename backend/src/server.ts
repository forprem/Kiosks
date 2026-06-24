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

async function cleanupExpiredPendingBookings(): Promise<number> {
  const now = new Date();
  const result = await prisma.booking.updateMany({
    where: {
      status: BookingStatus.PENDING_PAYMENT,
      expiresAt: { lt: now }
    },
    data: {
      status: BookingStatus.CANCELLED
    }
  });

  return result.count;
}

async function stripeWebhookHandler(req: express.Request, res: express.Response) {
  if (!stripe || !config.stripeWebhookSecret) {
    console.error("Stripe not configured");
    return res.status(400).json({ error: "Stripe not configured" });
  }

  const signature = req.headers["stripe-signature"] as string;
  if (!signature) {
    console.error("Missing stripe-signature header");
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  let event;
  try {
    // req.body is a Buffer when using express.raw()
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      config.stripeWebhookSecret
    );
    console.log("✓ Webhook verified:", event.type);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return res.status(400).json({ error: "Invalid signature" });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const bookingId = session.metadata?.bookingId;

    console.log("Processing checkout.session.completed, bookingId:", bookingId, "sessionId:", session.id);

    if (!bookingId) {
      console.warn("No bookingId in metadata");
      return res.status(400).json({ error: "No bookingId in metadata" });
    }

    try {
      const payment = await prisma.payment.findFirst({
        where: { providerSessionId: session.id }
      });

      if (!payment) {
        console.warn(`Payment not found for session ${session.id}`);
        return res.status(200).json({ received: true });
      }

      console.log("Updating payment", payment.id, "to SUCCEEDED");
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCEEDED }
      });

      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (booking) {
        console.log("Updating booking", bookingId, "to CONFIRMED");
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.CONFIRMED, expiresAt: null }
        });

        console.log("✓ Webhook processed successfully");
      }
    } catch (error) {
      console.error("Error processing webhook:", error);
      return res.status(500).json({ error: "Failed to process webhook" });
    }
  }

  return res.status(200).json({ received: true });
}

app.use(cors());

// Raw body for Stripe webhook signature verification (must be before express.json())
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhookHandler);

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

app.get("/api/admin/system/booking-integrity", requireAdmin, async (_req, res) => {
  const cleanedCount = await cleanupExpiredPendingBookings();
  const now = new Date();

  const [pendingActive, pendingExpired, confirmed, cancelled] = await Promise.all([
    prisma.booking.count({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      }
    }),
    prisma.booking.count({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        expiresAt: { lte: now }
      }
    }),
    prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
    prisma.booking.count({ where: { status: BookingStatus.CANCELLED } })
  ]);

  return res.json({
    ok: true,
    cleanedExpiredPending: cleanedCount,
    counts: {
      pendingActive,
      pendingExpired,
      confirmed,
      cancelled
    }
  });
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
  await cleanupExpiredPendingBookings();

  const schema = z.object({
    mallId: z.string().min(1),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "mallId query parameter is required" });
  }

  if ((parsed.data.startDate && !parsed.data.endDate) || (!parsed.data.startDate && parsed.data.endDate)) {
    return res.status(400).json({ error: "Provide both startDate and endDate for availability checks" });
  }

  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;
  if (parsed.data.startDate && parsed.data.endDate) {
    rangeStart = new Date(parsed.data.startDate);
    rangeEnd = new Date(parsed.data.endDate);
    if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime()) || rangeStart >= rangeEnd) {
      return res.status(400).json({ error: "Invalid date range" });
    }
  }

  const kiosks = await prisma.kiosk.findMany({
    where: { mallId: parsed.data.mallId },
    include: {
      images: {
        orderBy: { sortOrder: "asc" }
      }
    },
    orderBy: { code: "asc" }
  });

  if (!rangeStart || !rangeEnd) {
    return res.json(kiosks);
  }

  const now = new Date();
  const activeBookings = await prisma.booking.findMany({
    where: {
      kioskId: { in: kiosks.map((kiosk) => kiosk.id) },
      OR: [
        { status: BookingStatus.CONFIRMED },
        {
          status: BookingStatus.PENDING_PAYMENT,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
        }
      ]
    },
    select: { kioskId: true, startDate: true, endDate: true }
  });

  const kiosksWithAvailability = kiosks.map((kiosk) => {
    if (kiosk.status === KioskStatus.INACTIVE) {
      return kiosk;
    }

    const hasConflict = activeBookings.some(
      (booking) =>
        booking.kioskId === kiosk.id && hasDateOverlap(rangeStart as Date, rangeEnd as Date, booking.startDate, booking.endDate)
    );

    return {
      ...kiosk,
      status: hasConflict ? KioskStatus.BOOKED : KioskStatus.AVAILABLE
    };
  });

  return res.json(kiosksWithAvailability);
});

app.post("/api/admin/kiosks", requireAdmin, async (req, res) => {
  const schema = z.object({
    mallId: z.string().min(1),
    code: z.string().min(2),
    mapX: z.number().min(0).max(100),
    mapY: z.number().min(0).max(100),
    sizeSqm: z.number().positive().optional(),
    pricePerDay: z.number().int().positive(),
    pricePerYear: z.number().int().positive().optional(),
    status: z.nativeEnum(KioskStatus).optional(),
    imageUrls: z.array(z.string().url()).optional()
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
      pricePerDay: parsed.data.pricePerDay,
      pricePerYear: parsed.data.pricePerYear ?? parsed.data.pricePerDay * 365,
      status: parsed.data.status ?? KioskStatus.AVAILABLE,
      ...(parsed.data.imageUrls && parsed.data.imageUrls.length > 0
        ? {
            images: {
              create: parsed.data.imageUrls.map((url, index) => ({
                url,
                sortOrder: index
              }))
            }
          }
        : {})
    },
    include: {
      images: {
        orderBy: { sortOrder: "asc" }
      }
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
    pricePerDay: z.number().int().positive().optional(),
    status: z.nativeEnum(KioskStatus).optional(),
    imageUrls: z.array(z.string().url()).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const { imageUrls, ...kioskFields } = parsed.data;

  const kiosk = await prisma.$transaction(async (tx) => {
    if (imageUrls !== undefined) {
      await tx.kioskImage.deleteMany({
        where: { kioskId: req.params.kioskId }
      });
    }

    return tx.kiosk.update({
      where: { id: req.params.kioskId },
      data: kioskFields,
      include: {
        images: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });
  });

  if (imageUrls !== undefined && imageUrls.length > 0) {
    await prisma.kioskImage.createMany({
      data: imageUrls.map((url, index) => ({
        kioskId: req.params.kioskId,
        url,
        sortOrder: index
      }))
    });
  }

  const kioskWithImages = await prisma.kiosk.findUnique({
    where: { id: req.params.kioskId },
    include: {
      images: {
        orderBy: { sortOrder: "asc" }
      }
    }
  });

  if (!kioskWithImages) {
    return res.status(404).json({ error: "Kiosk not found" });
  }
  return res.json(kioskWithImages);
});

app.post("/api/admin/kiosks/:kioskId/images", requireAdmin, async (req, res) => {
  const schema = z.object({
    url: z.string().url(),
    sortOrder: z.number().int().min(0).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const kiosk = await prisma.kiosk.findUnique({ where: { id: req.params.kioskId } });
  if (!kiosk) {
    return res.status(404).json({ error: "Kiosk not found" });
  }

  const currentCount = await prisma.kioskImage.count({
    where: { kioskId: req.params.kioskId }
  });

  const image = await prisma.kioskImage.create({
    data: {
      kioskId: req.params.kioskId,
      url: parsed.data.url,
      sortOrder: parsed.data.sortOrder ?? currentCount
    }
  });

  return res.status(201).json(image);
});

app.delete("/api/admin/kiosks/:kioskId/images/:imageId", requireAdmin, async (req, res) => {
  const result = await prisma.kioskImage.deleteMany({
    where: {
      id: req.params.imageId,
      kioskId: req.params.kioskId
    }
  });

  if (result.count === 0) {
    return res.status(404).json({ error: "Image not found" });
  }

  return res.json({ ok: true });
});

app.delete("/api/admin/malls/:mallId", requireAdmin, async (req, res) => {
  try {
    // Delete all kiosks in this mall first
    await prisma.kiosk.deleteMany({
      where: { mallId: req.params.mallId }
    });

    // Then delete the mall
    const mall = await prisma.mall.delete({
      where: { id: req.params.mallId }
    });

    return res.json({ ok: true, message: "Mall and all its kiosks deleted", mall });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Mall not found" });
    }
    throw error;
  }
});

app.delete("/api/admin/kiosks/:kioskId", requireAdmin, async (req, res) => {
  try {
    const kiosk = await prisma.kiosk.delete({
      where: { id: req.params.kioskId }
    });

    return res.json({ ok: true, message: "Kiosk deleted", kiosk });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Kiosk not found" });
    }
    throw error;
  }
});

app.post("/api/bookings", async (req, res) => {
  await cleanupExpiredPendingBookings();

  const schema = z.object({
    kioskId: z.string().min(1),
    customerName: z.string().min(2),
    customerEmail: z.string().email(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional()
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
  const end = parsed.data.endDate ? new Date(parsed.data.endDate) : addOneYear(start);
  if (Number.isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({ error: "Invalid endDate" });
  }

  const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (dayCount <= 0) {
    return res.status(400).json({ error: "Booking must be at least 1 day" });
  }

  const effectivePricePerDay = kiosk.pricePerDay > 0 ? kiosk.pricePerDay : Math.max(1, Math.floor(kiosk.pricePerYear / 365));
  const totalPrice = dayCount * effectivePricePerDay;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const now = new Date();
  const activeBookings = await prisma.booking.findMany({
    where: {
      kioskId: parsed.data.kioskId,
      OR: [
        { status: BookingStatus.CONFIRMED },
        {
          status: BookingStatus.PENDING_PAYMENT,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
        }
      ]
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
      yearlyPrice: totalPrice,
      totalPrice,
      expiresAt,
      status: BookingStatus.PENDING_PAYMENT
    }
  });

  return res.status(201).json(booking);
});

app.post("/api/payments/checkout", async (req, res) => {
  await cleanupExpiredPendingBookings();

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

  if (booking.expiresAt && booking.expiresAt <= new Date()) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED }
    });
    return res.status(409).json({ error: "Booking payment window expired" });
  }

  if (booking.status !== BookingStatus.PENDING_PAYMENT) {
    return res.status(409).json({ error: "Booking not eligible for payment" });
  }

  const amountToCharge = booking.totalPrice > 0 ? booking.totalPrice : booking.yearlyPrice;

  if (!stripe) {
    const mockPayment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: amountToCharge,
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
            description: `${booking.startDate.toISOString().slice(0, 10)} to ${booking.endDate.toISOString().slice(0, 10)}`
          },
          unit_amount: amountToCharge * 100
        }
      }
    ],
    metadata: { bookingId: booking.id }
  });

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: amountToCharge,
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
    data: { status: BookingStatus.CONFIRMED, expiresAt: null }
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
