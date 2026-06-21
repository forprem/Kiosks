# API Reference

## Base URL

- Local: `http://localhost:4000`
- Production: `https://your-project.firebaseapp.com/api`

## Authentication

Admin endpoints require header:

```
x-admin-token: <ADMIN_TOKEN>
```

## Endpoints

### Health Check

**GET** `/health`

Response:

```json
{
  "ok": true,
  "service": "kiosk-booking-backend"
}
```

---

## Malls

### List Malls

**GET** `/api/malls`

Response:

```json
[
  {
    "id": "demo-mall-central",
    "name": "Central Mall",
    "city": "Demo City",
    "mapImageUrl": null,
    "isActive": true,
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }
]
```

### Create Mall (Admin)

**POST** `/api/admin/malls`

Headers: `x-admin-token`

Request:

```json
{
  "name": "West Mall",
  "city": "Los Angeles",
  "mapImageUrl": null
}
```

Response: (same as list + id generated)

### Update Mall (Admin)

**PATCH** `/api/admin/malls/:mallId`

Headers: `x-admin-token`

Request:

```json
{
  "name": "West Mall Updated",
  "isActive": false
}
```

Response: (updated mall)

---

## Kiosks

### List Kiosks

**GET** `/api/kiosks?mallId=demo-mall-central`

Response:

```json
[
  {
    "id": "demo-kiosk-a101",
    "mallId": "demo-mall-central",
    "code": "A-101",
    "mapX": 24,
    "mapY": 40,
    "pricePerYear": 12000,
    "status": "AVAILABLE",
    "sizeSqm": null,
    "activeFrom": null,
    "activeUntil": null,
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }
]
```

### Create Kiosk (Admin)

**POST** `/api/admin/kiosks`

Headers: `x-admin-token`

Request:

```json
{
  "mallId": "demo-mall-central",
  "code": "C-301",
  "mapX": 75,
  "mapY": 60,
  "sizeSqm": 120,
  "pricePerYear": 20000,
  "status": "AVAILABLE"
}
```

Response: (created kiosk)

### Update Kiosk (Admin)

**PATCH** `/api/admin/kiosks/:kioskId`

Headers: `x-admin-token`

Request:

```json
{
  "mapX": 80,
  "pricePerYear": 22000,
  "status": "BOOKED"
}
```

Response: (updated kiosk)

---

## Bookings

### Create Booking

**POST** `/api/bookings`

Request:

```json
{
  "kioskId": "demo-kiosk-a101",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "startDate": "2025-06-20T00:00:00Z"
}
```

Response:

```json
{
  "id": "booking_xyz",
  "kioskId": "demo-kiosk-a101",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "startDate": "2025-06-20T00:00:00Z",
  "endDate": "2026-06-20T00:00:00Z",
  "yearlyPrice": 12000,
  "status": "PENDING_PAYMENT",
  "createdAt": "2025-01-15T10:05:00Z",
  "updatedAt": "2025-01-15T10:05:00Z"
}
```

Errors:

- 400: Invalid input (missing fields, invalid email, etc.)
- 404: Kiosk not found
- 409: Kiosk not available or booking conflict

### Get Booking

**GET** `/api/bookings/:bookingId`

Response: (booking + related kiosk + all payments)

```json
{
  "id": "booking_xyz",
  "kioskId": "demo-kiosk-a101",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "startDate": "2025-06-20T00:00:00Z",
  "endDate": "2026-06-20T00:00:00Z",
  "yearlyPrice": 12000,
  "status": "CONFIRMED",
  "createdAt": "2025-01-15T10:05:00Z",
  "updatedAt": "2025-01-15T10:10:00Z",
  "kiosk": {
    "id": "demo-kiosk-a101",
    ...
  },
  "payments": [
    {
      "id": "payment_xyz",
      "bookingId": "booking_xyz",
      "amount": 12000,
      "currency": "usd",
      "status": "SUCCEEDED",
      ...
    }
  ]
}
```

---

## Payments

### Create Checkout Session

**POST** `/api/payments/checkout`

Request:

```json
{
  "bookingId": "booking_xyz"
}
```

Response (Stripe mode):

```json
{
  "mode": "stripe",
  "paymentId": "payment_xyz",
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_live_..."
}
```

Response (Mock mode, when no Stripe key):

```json
{
  "mode": "mock",
  "paymentId": "payment_xyz",
  "checkoutUrl": "http://localhost:5173/payment/mock?bookingId=booking_xyz&paymentId=payment_xyz"
}
```

User should redirect to `checkoutUrl` to complete payment.

### Confirm Mock Payment

**POST** `/api/payments/mock-confirm`

Request:

```json
{
  "paymentId": "payment_xyz"
}
```

Response:

```json
{
  "ok": true
}
```

Effect: Marks payment as SUCCEEDED and booking as CONFIRMED.

---

## Status Enums

### Kiosk Status

- `AVAILABLE` - Can be booked
- `BOOKED` - Currently rented
- `INACTIVE` - Temporarily unavailable (maintenance, etc.)

### Booking Status

- `PENDING_PAYMENT` - Created, awaiting payment
- `CONFIRMED` - Payment received, lease active
- `CANCELLED` - Lease cancelled

### Payment Status

- `PENDING` - Session created, awaiting payment
- `SUCCEEDED` - Payment confirmed
- `FAILED` - Payment rejected

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

Optional details field for validation errors:

```json
{
  "error": "Invalid request",
  "details": {
    "fieldName_errors": ["error message"]
  }
}
```

Common status codes:

- 200: Success
- 201: Resource created
- 400: Invalid input
- 401: Unauthorized (missing/invalid admin token)
- 404: Not found
- 409: Conflict (e.g., booking overlap, kiosk unavailable)
- 500: Server error

---

## Rate Limiting

No rate limiting on free tier. Add rate limiting middleware when scaling.

---

## Example workflow

1. **List malls** → GET `/api/malls`
2. **List kiosks** → GET `/api/kiosks?mallId=mall_id`
3. **Create booking** → POST `/api/bookings`
4. **Create checkout** → POST `/api/payments/checkout`
5. **Redirect to payment URL** → `checkout.checkoutUrl`
6. **After payment success:**
   - Mock mode: auto-confirmed
   - Stripe mode: webhook confirms (or frontend polls `/api/bookings/:id`)
