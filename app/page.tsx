'use client';
import { useState, useEffect, useRef } from 'react';

type Step = 'dates' | 'location' | 'items' | 'contact' | 'confirm';
type CatalogItem = { id: string; title: string; description: string; pricePerDay: number; imageUrl: string; available: boolean; category: string };
type Settings = { centerLat: number; centerLng: number; centerAddress: string; maxDistanceMiles: number };

const STEPS: Step[] = ['dates', 'location', 'items', 'contact', 'confirm'];
const STEP_LABELS = ['Event Dates', 'Location', 'Select Items', 'Your Info', 'Confirm'];

export default function BookingPage() {
  const [step, setStep] = useState<Step>('dates');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventAddress, setEventAddress] = useState('');
  const [eventLat, setEventLat] = useState<number | null>(null);
  const [eventLng, setEventLng] = useState<number | null>(null);
  const [locationError, setLocationError] = useState('');
  const [locationValid, setLocationValid] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const autocompleteRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => {});
    fetch('/api/catalog').then(r => r.json()).then(setCatalog).catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 'location') {
      loadMapsAutocomplete();
    }
  }, [step]);

  async function loadMapsAutocomplete() {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return; // no key — manual address mode
    if ((window as any).google?.maps) {
      initAutocomplete();
      setMapsLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.onload = () => { initAutocomplete(); setMapsLoaded(true); };
    document.head.appendChild(script);
  }

  function initAutocomplete() {
    if (!inputRef.current || !(window as any).google) return;
    const ac = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
    });
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.geometry) return;
      setEventAddress(place.formatted_address);
      setEventLat(place.geometry.location.lat());
      setEventLng(place.geometry.location.lng());
      setLocationError('');
      setLocationValid(false);
    });
    autocompleteRef.current = ac;
  }

  async function validateLocation() {
    // If no Maps API key, skip geocoding — accept address as-is
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || (!eventLat && !eventLng)) {
      if (!eventAddress.trim()) {
        setLocationError('Please enter your event address.');
        return;
      }
      setLocationValid(true);
      return;
    }

    if (!eventLat || !eventLng) {
      setLocationError('Please select an address from the dropdown.');
      return;
    }
    setLoading(true);
    setLocationError('');
    try {
      const res = await fetch('/api/validate-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: eventLat, lng: eventLng }),
      });
      const data = await res.json();
      if (data.valid) {
        setLocationValid(true);
      } else {
        setLocationError(`Sorry, this location is outside our service area (${settings?.maxDistanceMiles} mile radius from ${settings?.centerAddress}). Distance: ${data.distanceMiles?.toFixed(1)} miles.`);
      }
    } catch {
      setLocationError('Could not validate location. Please try again.');
    }
    setLoading(false);
  }

  function handleAddressInput(e: React.ChangeEvent<HTMLInputElement>) {
    setEventAddress(e.target.value);
    setEventLat(null);
    setEventLng(null);
    setLocationValid(false);
  }

  function toggleItem(id: string) {
    setSelectedItems(prev => {
      if (prev[id]) { const next = { ...prev }; delete next[id]; return next; }
      return { ...prev, [id]: 1 };
    });
  }

  function updateQty(id: string, qty: number) {
    if (qty < 1) { const next = { ...selectedItems }; delete next[id]; setSelectedItems(next); }
    else setSelectedItems(prev => ({ ...prev, [id]: qty }));
  }

  function getTotal() {
    const days = startDate && endDate
      ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
      : 1;
    return Object.entries(selectedItems).reduce((sum, [id, qty]) => {
      const item = catalog.find(i => i.id === id);
      return sum + (item?.pricePerDay || 0) * qty * days;
    }, 0);
  }

  async function submitBooking() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate, endDate, eventAddress, eventLat, eventLng,
          items: Object.entries(selectedItems).map(([id, qty]) => {
            const item = catalog.find(i => i.id === id);
            return { id, title: item?.title, qty, pricePerDay: item?.pricePerDay };
          }),
          firstName, lastName, email, phone, notes,
          total: getTotal(),
          status: 'pending',
        }),
      });
      if (!res.ok) throw new Error('Submission failed');
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  const currentIdx = STEPS.indexOf(step);
  const noMapsKey = !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (submitted) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 42, fontStyle: 'italic', color: 'var(--green)', marginBottom: 16 }}>
              Request Received
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }}>
              Thank you, {firstName}. We'll review your request and reach out to {email} within 24 hours.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>Gardenia</div>
        <div style={s.logoSub}>Event Decor &middot; Dallas, TX</div>
      </div>

      {/* Progress */}
      <div style={s.progressBar}>
        {STEPS.map((st, i) => (
          <div key={st} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{
              ...s.progressStep,
              background: i <= currentIdx ? 'var(--ink)' : 'transparent',
              color: i <= currentIdx ? '#fff' : 'var(--dim)',
              border: `1px solid ${i <= currentIdx ? 'var(--ink)' : 'var(--br)'}`,
            }}>
              {i < currentIdx ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: i < currentIdx ? 'var(--ink)' : 'var(--br)', margin: '0 4px' }} />
            )}
          </div>
        ))}
      </div>

      <div style={s.card}>
        <div style={s.stepTitle}>{STEP_LABELS[currentIdx]}</div>

        {/* STEP 1: Dates */}
        {step === 'dates' && (
          <div style={s.form}>
            <label style={s.label}>Event Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]} style={s.input} />
            <label style={s.label}>Event End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              min={startDate || new Date().toISOString().split('T')[0]} style={s.input} />
            {startDate && endDate && (
              <div style={s.infoBox}>
                {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1} day rental
              </div>
            )}
            <button style={s.btn} disabled={!startDate || !endDate || endDate < startDate}
              onClick={() => setStep('location')}>
              Next: Event Location
            </button>
          </div>
        )}

        {/* STEP 2: Location */}
        {step === 'location' && (
          <div style={s.form}>
            <label style={s.label}>Event Venue Address</label>
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter your venue address"
              value={eventAddress}
              onChange={handleAddressInput}
              style={s.input}
            />
            {settings && (
              <div style={s.infoBox}>
                We service within {settings.maxDistanceMiles} miles of {settings.centerAddress}
              </div>
            )}
            {locationError && <div style={s.errorBox}>{locationError}</div>}
            {locationValid && <div style={s.successBox}>This location is in our service area.</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...s.btnOutline, flex: 1 }} onClick={() => setStep('dates')}>Back</button>
              {!locationValid ? (
                <button style={{ ...s.btn, flex: 2 }} onClick={validateLocation}
                  disabled={!eventAddress.trim() || loading}>
                  {loading ? 'Checking...' : 'Confirm Location'}
                </button>
              ) : (
                <button style={{ ...s.btn, flex: 2 }} onClick={() => setStep('items')}>
                  Next: Select Items
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Items */}
        {step === 'items' && (
          <div>
            {catalog.filter(i => i.available).length === 0 && (
              <div style={s.infoBox}>No items available yet.</div>
            )}
            <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
              {catalog.filter(i => i.available).map(item => {
                const qty = selectedItems[item.id] || 0;
                return (
                  <div key={item.id} style={{
                    ...s.itemCard,
                    borderColor: qty > 0 ? 'var(--ink)' : 'var(--br)',
                    background: qty > 0 ? 'var(--sf)' : 'var(--bg)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{item.description}</div>
                        <div style={{ color: 'var(--green)', fontSize: 13, marginTop: 4 }}>
                          ${item.pricePerDay}/day
                        </div>
                      </div>
                      {qty === 0 ? (
                        <button style={s.addBtn} onClick={() => toggleItem(item.id)}>+ Add</button>
                      ) : (
                        <div style={s.qtyControl}>
                          <button onClick={() => updateQty(item.id, qty - 1)} style={s.qtyBtn}>−</button>
                          <span style={{ minWidth: 20, textAlign: 'center', fontSize: 13 }}>{qty}</span>
                          <button onClick={() => updateQty(item.id, qty + 1)} style={s.qtyBtn}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {Object.keys(selectedItems).length > 0 && (
              <div style={s.totalBox}>
                Estimated Total: <strong>${getTotal().toFixed(2)}</strong>
                <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginTop: 2 }}>Final pricing confirmed upon booking</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={{ ...s.btnOutline, flex: 1 }} onClick={() => setStep('location')}>Back</button>
              <button style={{ ...s.btn, flex: 2 }} disabled={Object.keys(selectedItems).length === 0}
                onClick={() => setStep('contact')}>
                Next: Your Info
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Contact */}
        {step === 'contact' && (
          <div style={s.form}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={s.label}>First Name</label>
                <input style={s.input} value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Last Name</label>
                <input style={s.input} value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>
            <label style={s.label}>Email Address</label>
            <input type="email" style={s.input} value={email} onChange={e => setEmail(e.target.value)} />
            <label style={s.label}>Phone Number</label>
            <input type="tel" style={s.input} value={phone} onChange={e => setPhone(e.target.value)} />
            <label style={s.label}>Additional Notes (optional)</label>
            <textarea style={{ ...s.input, height: 80, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...s.btnOutline, flex: 1 }} onClick={() => setStep('items')}>Back</button>
              <button style={{ ...s.btn, flex: 2 }} disabled={!firstName || !lastName || !email || !phone}
                onClick={() => setStep('confirm')}>
                Review & Confirm
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Confirm */}
        {step === 'confirm' && (
          <div style={s.form}>
            <div style={s.summarySection}>
              <div style={s.summaryLabel}>Event Dates</div>
              <div style={{ fontSize: 14 }}>{startDate} — {endDate}</div>
            </div>
            <div style={s.summarySection}>
              <div style={s.summaryLabel}>Location</div>
              <div style={{ fontSize: 14 }}>{eventAddress}</div>
            </div>
            <div style={s.summarySection}>
              <div style={s.summaryLabel}>Items</div>
              {Object.entries(selectedItems).map(([id, qty]) => {
                const item = catalog.find(i => i.id === id);
                return <div key={id} style={{ fontSize: 14 }}>{qty}× {item?.title} — ${((item?.pricePerDay || 0) * qty).toFixed(2)}/day</div>;
              })}
              <div style={{ marginTop: 6, fontWeight: 600, color: 'var(--green)', fontSize: 14 }}>
                Est. Total: ${getTotal().toFixed(2)}
              </div>
            </div>
            <div style={s.summarySection}>
              <div style={s.summaryLabel}>Contact</div>
              <div style={{ fontSize: 14 }}>{firstName} {lastName} · {email} · {phone}</div>
            </div>
            {error && <div style={s.errorBox}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...s.btnOutline, flex: 1 }} onClick={() => setStep('contact')}>Back</button>
              <button style={{ ...s.btn, flex: 2 }} onClick={submitBooking} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--bg)', padding: '40px 16px 64px' },
  header: { textAlign: 'center', marginBottom: 32 },
  logo: { fontFamily: 'var(--fd)', fontSize: 36, fontStyle: 'italic', fontWeight: 300, letterSpacing: 2, color: 'var(--ink)' },
  logoSub: { fontFamily: 'var(--fb)', fontSize: 11, fontWeight: 500, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--muted)', marginTop: 4 },
  progressBar: { display: 'flex', alignItems: 'center', maxWidth: 480, margin: '0 auto 32px' },
  progressStep: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0, transition: 'all 0.2s' },
  card: { background: 'var(--bg)', border: '1px solid var(--br)', borderRadius: 'var(--r)', padding: '28px 28px', maxWidth: 520, margin: '0 auto' },
  stepTitle: { fontFamily: 'var(--fd)', fontSize: 22, fontStyle: 'italic', fontWeight: 400, color: 'var(--ink)', marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: { fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '10px 12px', borderRadius: 'var(--r)', border: '1px solid var(--br)', fontSize: 14, outline: 'none', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--fb)' },
  btn: { padding: '11px 20px', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--fb)', cursor: 'pointer' },
  btnOutline: { padding: '11px 20px', background: 'transparent', color: 'var(--mid)', border: '1px solid var(--br)', borderRadius: 'var(--r)', fontSize: 12, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--fb)', cursor: 'pointer' },
  infoBox: { background: 'var(--sf)', color: 'var(--mid)', padding: '10px 14px', borderRadius: 'var(--r)', fontSize: 13, border: '1px solid var(--br)' },
  errorBox: { background: '#fdf0f0', color: 'var(--red)', padding: '10px 14px', borderRadius: 'var(--r)', fontSize: 13, border: '1px solid #e8c8c8' },
  successBox: { background: '#f0f7f3', color: 'var(--green)', padding: '10px 14px', borderRadius: 'var(--r)', fontSize: 13, border: '1px solid #c0ddd0', fontWeight: 500 },
  itemCard: { border: '1px solid', borderRadius: 'var(--r)', padding: 14, transition: 'all 0.15s' },
  addBtn: { padding: '5px 12px', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: 'var(--fb)' },
  qtyControl: { display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--br)', borderRadius: 'var(--r)', padding: '4px 10px' },
  qtyBtn: { width: 20, height: 20, background: 'transparent', color: 'var(--ink)', border: 'none', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  totalBox: { background: 'var(--sf)', padding: 14, borderRadius: 'var(--r)', border: '1px solid var(--br)', fontSize: 14, fontWeight: 500, color: 'var(--ink)', textAlign: 'center' },
  summarySection: { background: 'var(--sf)', borderRadius: 'var(--r)', padding: '10px 14px', border: '1px solid var(--br)', display: 'flex', flexDirection: 'column', gap: 4 },
  summaryLabel: { fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 },
};
