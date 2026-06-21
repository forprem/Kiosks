import { useEffect, useMemo, useState } from "react";
import {
  adminCreateKiosk,
  adminCreateMall,
  adminUpdateKiosk,
  confirmMockPayment,
  createBooking,
  createCheckout,
  getKiosks,
  getMalls,
  type Kiosk,
  type Mall
} from "./api";

type ViewMode = "customer" | "admin";

export default function App() {
  const [mode, setMode] = useState<ViewMode>("customer");
  const [malls, setMalls] = useState<Mall[]>([]);
  const [selectedMallId, setSelectedMallId] = useState<string>("");
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string>("");

  const [adminToken, setAdminToken] = useState<string>("");
  const [newMallName, setNewMallName] = useState<string>("");
  const [newMallCity, setNewMallCity] = useState<string>("");
  const [newKioskCode, setNewKioskCode] = useState<string>("");
  const [newKioskPrice, setNewKioskPrice] = useState<number>(12000);
  const [newKioskX, setNewKioskX] = useState<number>(50);
  const [newKioskY, setNewKioskY] = useState<number>(50);
  const [newKioskStatus, setNewKioskStatus] = useState<Kiosk["status"]>("AVAILABLE");

  async function loadMalls() {
    const data = await getMalls();
    setMalls(data);
    if (!selectedMallId && data.length > 0) {
      setSelectedMallId(data[0].id);
    }
  }

  async function loadKiosks(mallId: string) {
    const data = await getKiosks(mallId);
    setKiosks(data);
    if (data.length > 0) {
      setSelectedId((prev) => (data.some((item) => item.id === prev) ? prev : data[0].id));
    } else {
      setSelectedId("");
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        await loadMalls();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Failed to load malls");
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedMallId) {
      return;
    }
    void (async () => {
      try {
        await loadKiosks(selectedMallId);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Failed to load kiosks");
      }
    })();
  }, [selectedMallId]);

  const selected = useMemo(
    () => kiosks.find((k) => k.id === selectedId) ?? kiosks[0],
    [selectedId, kiosks]
  );

  async function handleBook() {
    if (!selected) {
      return;
    }
    setIsSubmitting(true);
    setNotice("");
    try {
      const booking = await createBooking({
        kioskId: selected.id,
        customerName,
        customerEmail,
        startDate: new Date(startDate).toISOString()
      });

      const checkout = await createCheckout(booking.id);
      if (checkout.mode === "mock" && checkout.paymentId) {
        await confirmMockPayment(checkout.paymentId);
        setNotice("Booking confirmed with mock payment. Stripe can be enabled later.");
        await loadKiosks(selected.mallId);
      } else if (checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Booking failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateMall() {
    setNotice("");
    try {
      const mall = await adminCreateMall(adminToken, { name: newMallName, city: newMallCity });
      setNewMallName("");
      setNewMallCity("");
      await loadMalls();
      setSelectedMallId(mall.id);
      setNotice("Mall created successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to create mall");
    }
  }

  async function handleCreateKiosk() {
    if (!selectedMallId) {
      return;
    }
    setNotice("");
    try {
      await adminCreateKiosk(adminToken, {
        mallId: selectedMallId,
        code: newKioskCode,
        mapX: newKioskX,
        mapY: newKioskY,
        pricePerYear: newKioskPrice,
        status: newKioskStatus
      });
      setNewKioskCode("");
      await loadKiosks(selectedMallId);
      setNotice("Kiosk created successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to create kiosk");
    }
  }

  async function handleUpdateSelectedKiosk() {
    if (!selected) {
      return;
    }
    setNotice("");
    try {
      await adminUpdateKiosk(adminToken, selected.id, {
        mapX: selected.mapX,
        mapY: selected.mapY,
        pricePerYear: selected.pricePerYear,
        status: selected.status
      });
      await loadKiosks(selected.mallId);
      setNotice("Kiosk updated successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to update kiosk");
    }
  }

  function updateSelectedLocal(partial: Partial<Kiosk>) {
    if (!selected) {
      return;
    }
    setKiosks((prev) => prev.map((item) => (item.id === selected.id ? { ...item, ...partial } : item)));
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Mall Leasing Platform</p>
        <h1>Book A Mall Kiosk For 1 Year</h1>
        <p>Select a kiosk on the map, view yearly price, and proceed to online payment.</p>
        <div className="modeSwitch" role="tablist" aria-label="View mode">
          <button className={mode === "customer" ? "tab active" : "tab"} onClick={() => setMode("customer")}>
            Customer
          </button>
          <button className={mode === "admin" ? "tab active" : "tab"} onClick={() => setMode("admin")}>
            Admin
          </button>
        </div>
        <div className="mallSelect">
          <label htmlFor="mall-select">Mall</label>
          <select
            id="mall-select"
            value={selectedMallId}
            onChange={(event) => setSelectedMallId(event.target.value)}
          >
            {malls.map((mall) => (
              <option key={mall.id} value={mall.id}>
                {mall.name} ({mall.city})
              </option>
            ))}
          </select>
        </div>
      </header>

      {mode === "customer" ? (
        <main className="layout">
          <section className="mapCard">
            <h2>Mall Map</h2>
            <div className="mapArea">
              {kiosks.map((kiosk) => (
                <button
                  key={kiosk.id}
                  className={`pin ${kiosk.status.toLowerCase()} ${selectedId === kiosk.id ? "active" : ""}`}
                  style={{ left: `${kiosk.mapX}%`, top: `${kiosk.mapY}%` }}
                  onClick={() => setSelectedId(kiosk.id)}
                  title={`${kiosk.code} - ${kiosk.status}`}
                >
                  {kiosk.code}
                </button>
              ))}
            </div>
          </section>

          <aside className="detailCard">
            <h2>Kiosk Details</h2>
            {!selected ? (
              <p>No kiosks available in this mall.</p>
            ) : (
              <>
                <dl>
                  <dt>Code</dt>
                  <dd>{selected.code}</dd>
                  <dt>Status</dt>
                  <dd className={selected.status.toLowerCase()}>{selected.status}</dd>
                  <dt>Price (1 year)</dt>
                  <dd>${selected.pricePerYear.toLocaleString()}</dd>
                </dl>

                <div className="formGrid">
                  <label>
                    Name
                    <input
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="John Doe"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                      placeholder="john@example.com"
                    />
                  </label>
                  <label>
                    Start Date
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </label>
                </div>

                <button
                  className="cta"
                  disabled={
                    isSubmitting ||
                    selected.status !== "AVAILABLE" ||
                    customerName.trim().length < 2 ||
                    customerEmail.trim().length < 5
                  }
                  onClick={() => void handleBook()}
                >
                  {isSubmitting
                    ? "Processing..."
                    : selected.status === "AVAILABLE"
                      ? "Proceed To Payment"
                      : "Not Available"}
                </button>
                <p className="note">For free testing, payment runs in mock mode if Stripe key is not configured.</p>
              </>
            )}
            {notice ? <p className="message">{notice}</p> : null}
          </aside>
        </main>
      ) : (
        <main className="layout adminLayout">
          <section className="detailCard">
            <h2>Admin Access</h2>
            <div className="formGrid">
              <label>
                Admin Token
                <input
                  value={adminToken}
                  onChange={(event) => setAdminToken(event.target.value)}
                  placeholder="x-admin-token value"
                />
              </label>
            </div>
            <p className="note">Token is validated by backend through x-admin-token header.</p>
          </section>

          <section className="detailCard">
            <h2>Create Mall</h2>
            <div className="formGrid">
              <label>
                Mall Name
                <input value={newMallName} onChange={(event) => setNewMallName(event.target.value)} />
              </label>
              <label>
                City
                <input value={newMallCity} onChange={(event) => setNewMallCity(event.target.value)} />
              </label>
            </div>
            <button
              className="cta"
              onClick={() => void handleCreateMall()}
              disabled={adminToken.trim().length < 3 || newMallName.trim().length < 2 || newMallCity.trim().length < 2}
            >
              Create Mall
            </button>
          </section>

          <section className="detailCard">
            <h2>Create Kiosk</h2>
            <div className="formGrid">
              <label>
                Code
                <input value={newKioskCode} onChange={(event) => setNewKioskCode(event.target.value)} />
              </label>
              <label>
                Yearly Price
                <input
                  type="number"
                  min={1}
                  value={newKioskPrice}
                  onChange={(event) => setNewKioskPrice(Number(event.target.value))}
                />
              </label>
              <label>
                Map X (%): {newKioskX}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={newKioskX}
                  onChange={(event) => setNewKioskX(Number(event.target.value))}
                />
              </label>
              <label>
                Map Y (%): {newKioskY}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={newKioskY}
                  onChange={(event) => setNewKioskY(Number(event.target.value))}
                />
              </label>
              <label>
                Status
                <select value={newKioskStatus} onChange={(event) => setNewKioskStatus(event.target.value as Kiosk["status"])}>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="BOOKED">BOOKED</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
            </div>
            <button
              className="cta"
              onClick={() => void handleCreateKiosk()}
              disabled={adminToken.trim().length < 3 || !selectedMallId || newKioskCode.trim().length < 2}
            >
              Create Kiosk
            </button>
          </section>

          <section className="detailCard">
            <h2>Update Selected Kiosk</h2>
            {!selected ? (
              <p>Select a kiosk from Customer tab map first.</p>
            ) : (
              <>
                <div className="formGrid">
                  <label>
                    Price
                    <input
                      type="number"
                      min={1}
                      value={selected.pricePerYear}
                      onChange={(event) => updateSelectedLocal({ pricePerYear: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    X (%): {selected.mapX}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={selected.mapX}
                      onChange={(event) => updateSelectedLocal({ mapX: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    Y (%): {selected.mapY}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={selected.mapY}
                      onChange={(event) => updateSelectedLocal({ mapY: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={selected.status}
                      onChange={(event) => updateSelectedLocal({ status: event.target.value as Kiosk["status"] })}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="BOOKED">BOOKED</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </label>
                </div>
                <button
                  className="cta"
                  onClick={() => void handleUpdateSelectedKiosk()}
                  disabled={adminToken.trim().length < 3}
                >
                  Save Kiosk Changes
                </button>
              </>
            )}
          </section>
          {notice ? <p className="message">{notice}</p> : null}
        </main>
      )}
    </div>
  );
}
