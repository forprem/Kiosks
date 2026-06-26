import { useEffect, useState } from "react";

const TOTAL_IMAGES = 12;
const IMAGES = Array.from(
  { length: TOTAL_IMAGES },
  (_, i) => `/mall_landing_Img/Mall_Img/M${i + 1}.jpg`
);

const FEATURES = [
  { icon: "📍", label: "Prime locations across top malls" },
  { icon: "📅", label: "Flexible date-range bookings" },
  { icon: "💳", label: "Secure online payments" },
  { icon: "⚡", label: "Instant availability checking" }
];

export default function LandingPage({ onStart }: { onStart: () => void }) {
  const [currentImage, setCurrentImage] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentImage((prev) => (prev + 1) % TOTAL_IMAGES);
        setVisible(true);
      }, 500);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="landingPage">
      {/* decorative blobs */}
      <div className="blob blob1" />
      <div className="blob blob2" />
      <div className="blob blob3" />

      <div className="landingInner">
        {/* ── TOP HERO ── */}
        <div className="landingHero">
          {/* LEFT */}
          <div className="landingLeft">
            <span className="landingBadge">🏬 Mall Leasing Platform</span>
            <h1 className="landingHeadline">
              Find the Perfect<br />
              <span className="landingAccent">Kiosk Space</span><br />
              for Your Business
            </h1>
            <p className="landingSubtitle">
              Browse available kiosks, pick your dates, and secure your spot in
              minutes — all from one intuitive platform.
            </p>

            <ul className="landingFeatures">
              {FEATURES.map((f) => (
                <li key={f.label} className="landingFeatureItem">
                  <span className="featureIcon">{f.icon}</span>
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT — rotating carousel */}
          <div className="landingRight">
            <div className="landingImageFrame">
              <img
                key={currentImage}
                src={IMAGES[currentImage]}
                alt={`Mall space ${currentImage + 1}`}
                className={`landingImage ${visible ? "fadeIn" : "fadeOut"}`}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80";
                }}
              />
              <div className="imageOverlay" />
              <div className="imageCounter">
                {currentImage + 1} / {TOTAL_IMAGES}
              </div>
            </div>

            {/* dots */}
            <div className="landingDots">
              {IMAGES.map((_, idx) => (
                <button
                  key={idx}
                  className={`landingDot ${idx === currentImage ? "active" : ""}`}
                  aria-label={`Image ${idx + 1}`}
                  onClick={() => {
                    setVisible(false);
                    setTimeout(() => { setCurrentImage(idx); setVisible(true); }, 300);
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="landingCtaSection">
          <div className="ctaDivider">
            <span className="ctaDividerLine" />
            <span className="ctaDividerText">Ready to grow?</span>
            <span className="ctaDividerLine" />
          </div>

          <button className="landingCtaButton" onClick={onStart}>
            <span className="ctaGlow" />
            <span className="ctaLabel">Your Journey Starts Now</span>
            <span className="ctaArrow">→</span>
          </button>

          <p className="ctaNote">No sign-up required &nbsp;·&nbsp; Free to browse</p>
        </div>
      </div>
    </div>
  );
}
