const API_BASE_URL = "";

export type Mall = {
  id: string;
  name: string;
  city: string;
  mapImageUrl: string | null;
  isActive: boolean;
};

export type KioskImage = {
  id: string;
  kioskId: string;
  url: string;
  sortOrder: number;
  createdAt: string;
};

export type Kiosk = {
  id: string;
  mallId: string;
  code: string;
  mapX: number;
  mapY: number;
  pricePerYear: number;
  status: "AVAILABLE" | "BOOKED" | "INACTIVE";
  images: KioskImage[];
};

export type Booking = {
  id: string;
  kioskId: string;
  customerName: string;
  customerEmail: string;
  startDate: string;
  endDate: string;
  yearlyPrice: number;
  status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED";
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

function adminHeaders(adminToken: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-admin-token": adminToken
  };
}

export async function getMalls(): Promise<Mall[]> {
  const response = await fetch(`${API_BASE_URL}/api/malls`);
  return parseJson<Mall[]>(response);
}

export async function getKiosks(mallId: string): Promise<Kiosk[]> {
  const response = await fetch(`${API_BASE_URL}/api/kiosks?mallId=${encodeURIComponent(mallId)}`);
  return parseJson<Kiosk[]>(response);
}

export async function createBooking(payload: {
  kioskId: string;
  customerName: string;
  customerEmail: string;
  startDate: string;
}): Promise<Booking> {
  const response = await fetch(`${API_BASE_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJson<Booking>(response);
}

export async function createCheckout(bookingId: string): Promise<{ checkoutUrl: string; mode: string; paymentId?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/payments/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId })
  });
  return parseJson(response);
}

export async function confirmMockPayment(paymentId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/payments/mock-confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentId })
  });
  await parseJson<{ ok: true }>(response);
}

export async function adminCreateMall(
  adminToken: string,
  payload: { name: string; city: string; mapImageUrl?: string | null }
): Promise<Mall> {
  const response = await fetch(`${API_BASE_URL}/api/admin/malls`, {
    method: "POST",
    headers: adminHeaders(adminToken),
    body: JSON.stringify(payload)
  });
  return parseJson<Mall>(response);
}

export async function adminCreateKiosk(
  adminToken: string,
  payload: {
    mallId: string;
    code: string;
    mapX: number;
    mapY: number;
    pricePerYear: number;
    status: "AVAILABLE" | "BOOKED" | "INACTIVE";
    imageUrls?: string[];
  }
): Promise<Kiosk> {
  const response = await fetch(`${API_BASE_URL}/api/admin/kiosks`, {
    method: "POST",
    headers: adminHeaders(adminToken),
    body: JSON.stringify(payload)
  });
  return parseJson<Kiosk>(response);
}

export async function adminUpdateKiosk(
  adminToken: string,
  kioskId: string,
  payload: {
    mapX?: number;
    mapY?: number;
    pricePerYear?: number;
    status?: "AVAILABLE" | "BOOKED" | "INACTIVE";
    imageUrls?: string[];
  }
): Promise<Kiosk> {
  const response = await fetch(`${API_BASE_URL}/api/admin/kiosks/${encodeURIComponent(kioskId)}`, {
    method: "PATCH",
    headers: adminHeaders(adminToken),
    body: JSON.stringify(payload)
  });
  return parseJson<Kiosk>(response);
}

export async function adminDeleteMall(adminToken: string, mallId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/malls/${encodeURIComponent(mallId)}`, {
    method: "DELETE",
    headers: adminHeaders(adminToken)
  });
  await parseJson<{ ok: true }>(response);
}

export async function adminDeleteKiosk(adminToken: string, kioskId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/kiosks/${encodeURIComponent(kioskId)}`, {
    method: "DELETE",
    headers: adminHeaders(adminToken)
  });
  await parseJson<{ ok: true }>(response);
}
