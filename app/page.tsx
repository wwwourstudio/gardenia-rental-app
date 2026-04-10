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
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const autocompleteRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings);
    fetch('/api/catalog').then(r => r.json()).then(setCatalog);
  }, []);

  useEffect(() => {
    if (step === 'location' && settings) {
      loadMapsAutocomplete();
    }
  }, [step, settings]);

  async function loadMapsAutocomplete() {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key || !inputRef.current) return;
    if ((window as any).google?.maps) {
      initAutocomplete();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.onload = initAutocomplete;
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
    if (!eventLat || !eventLng) {
      setLocationError('Please select an address from the dropdown.');
      return;
    }
    setLoading(true);
    setLocationError('');
    const res = await fetch('/api/validate-location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: eventLat, lng: eventLng }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.valid) {
      setLocationValid(true);
    } else {
      setLocationError(`Sorry, this location is outside our service area (${settings?.maxDistanceMiles} mile radius from ${settings?.centerAddress}). Distance: ${data.distanceMiles?.toFixed(1)} miles.`);
    }
  }

  function toggleItem(id: string) {
    setSelectedItems(prev => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 1 };
    });
  }

  function updateQty(id: string, qty: number) {
    if (qty < 1) {
      const next = { ...selectedItems };
      delete next[id];
      setSelectedItems(next);
    } else {
      setSelectedItems(prev => ({ ...prev, [id]: qty }));
    }
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
          startDate, endDate,
          eventAddress, eventLat, eventLng,
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

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🌸</div>
            <h2 style={{ color: 'var(--green)', marginBottom: 8 }}>Request Received!</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Thank you, {firstName}! We'll review your request and reach out to {email} within 24 hours.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Request a Rental Quote</h1>
        <p style={styles.subtitle}>Gardenia Event Decor · Dallas, TX</p>
      </div>

      {/* Progress */}
      <div style={styles.progressBar}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{
              ...styles.progressStep,
              background: i <= currentIdx ? 'var(--green)' : 'var(--border)',
              color: i <= currentIdx ? '#fff' : 'var(--text-muted)',
            }}>
              {i < currentIdx ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 11, marginLeft: 4, color: i === currentIdx ? 'var(--green)' : 'var(--text-muted)', display: 'none' as any }}>
              {STEP_LABELS[i]}
            </span>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < currentIdx ? 'var(--green)' : 'var(--border)', margin: '0 4px' }} />
            )}
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <h2 style={styles.stepTitle}>{STEP_LABELS[currentIdx]}</h2>

        {/* STEP 1: Dates */}
        {step === 'dates' && (
          <div style={styles.form}>
            <label style={styles.label}>Event Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]} style={styles.input} />
            <label style={styles.label}>Event End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              min={startDate || new Date().toISOString().split('T')[0]} style={styles.input} />
            {startDate && endDate && (
              <div style={styles.infoBox}>
                📅 {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1} day rental
              </div>
            )}
            <button style={styles.btn}
              disabled={!startDate || !endDate || endDate < startDate}
              onClick={() => setStep('location')}>
              Next: Event Location →
            </button>
          </div>
        )}

        {/* STEP 2: Location */}
        {step === 'location' && (
          <div style={styles.form}>
            <label style={styles.label}>Event Venue Address</label>
            <input
              ref={inputRef}
              type="text"
              placeholder="Start typing your venue address..."
              defaultValue={eventAddress}
              style={styles.input}
            />
            {settings && (
              <div style={styles.infoBox}>
                📍 We service within {settings.maxDistanceMiles} miles of {settings.centerAddress}
              </div>
            )}
            {locationError && <div style={styles.errorBox}>{locationError}</div>}
            {locationValid && <div style={styles.successBox}>✓ Great news — this location is in our service area!</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={() => setStep('dates')}>← Back</button>
              {!locationValid ? (
                <button style={{ ...styles.btn, flex: 2 }} onClick={validateLocation} disabled={!eventLat || loading}>
                  {loading ? 'Checking...' : 'Check My Location'}
                </button>
              ) : (
                <button style={{ ...styles.btn, flex: 2 }} onClick={() => setStep('items')}>
                  Next: Select Items →
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Items */}
        {step === 'items' && (
          <div>
            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              {catalog.filter(i => i.available).map(item => {
                const qty = selectedItems[item.id] || 0;
                return (
                  <div key={item.id} style={{
                    ...styles.itemCard,
                    borderColor: qty > 0 ? 'var(--green)' : 'var(--border)',
                    background: qty > 0 ? 'var(--green-pale)' : '#fff',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{item.description}</div>
                        <div style={{ color: 'var(--green)', fontWeight: 600, marginTop: 4 }}>
                          ${item.pricePerDay}/day
                        </div>
                      </div>
                      {qty === 0 ? (
                        <button style={styles.addBtn} onClick={() => toggleItem(item.id)}>+ Add</button>
                      ) : (
                        <div style={styles.qtyControl}>
                          <button onClick={() => updateQty(item.id, qty - 1)} style={styles.qtyBtn}>−</button>
                          <span style={{ minWidth: 24, textAlign: 'center' }}>{qty}</span>
                          <button onClick={() => updateQty(item.id, qty + 1)} style={styles.qtyBtn}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {Object.keys(selectedItems).length > 0 && (
              <div style={styles.totalBox}>
                Estimated Total: <strong>${getTotal().toFixed(2)}</strong>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Final pricing confirmed upon booking</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={() => setStep('location')}>← Back</button>
              <button style={{ ...styles.btn, flex: 2 }}
                disabled={Object.keys(selectedItems).length === 0}
                onClick={() => setStep('contact')}>
                Next: Your Info →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Contact */}
        {step === 'contact' && (
          <div style={styles.form}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={styles.label}>First Name</label>
                <input style={styles.input} value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div>
                <label style={styles.label}>Last Name</label>
                <input style={styles.input} value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>
            <label style={styles.label}>Email Address</label>
            <input type="email" style={styles.input} value={email} onChange={e => setEmail(e.target.value)} />
            <label style={styles.label}>Phone Number</label>
            <input type="tel" style={styles.input} value={phone} onChange={e => setPhone(e.target.value)} />
            <label style={styles.label}>Additional Notes (optional)</label>
            <textarea style={{ ...styles.input, height: 80, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={() => setStep('items')}>← Back</button>
              <button style={{ ...styles.btn, flex: 2 }}
                disabled={!firstName || !lastName || !email || !phone}
                onClick={() => setStep('confirm')}>
                Review & Confirm →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Confirm */}
        {step === 'confirm' && (
          <div style={styles.form}>
            <div style={styles.summarySection}>
              <div style={styles.summaryLabel}>Event Dates</div>
              <div>{startDate} → {endDate}</div>
            </div>
            <div style={styles.summarySection}>
              <div style={styles.summaryLabel}>Location</div>
              <div>{eventAddress}</div>
            </div>
            <div style={styles.summarySection}>
              <div style={styles.summaryLabel}>Items</div>
              {Object.entries(selectedItems).map(([id, qty]) => {
                const item = catalog.find(i => i.id === id);
                return <div key={id}>{qty}× {item?.title} — ${((item?.pricePerDay || 0) * qty).toFixed(2)}/day</div>;
              })}
              <div style={{ marginTop: 4, fontWeight: 600, color: 'var(--green)' }}>
                Est. Total: ${getTotal().toFixed(2)}
              </div>
            </div>
            <div style={styles.summarySection}>
              <div style={styles.summaryLabel}>Contact</div>
              <div>{firstName} {lastName} · {email} · {phone}</div>
            </div>
            {error && <div style={styles.errorBox}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={() => setStep('contact')}>← Back</button>
              <button style={{ ...styles.btn, flex: 2 }} onClick={submitBooking} disabled={loading}>
                {loading ? 'Submitting...' : '🌸 Submit Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--gray)', padding: '24px 16px 48px' },
  header: { textAlign: 'center', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 700, color: 'var(--green)' },
  subtitle: { color: 'var(--text-muted)', fontSize: 14, marginTop: 4 },
  progressBar: { display: 'flex', alignItems: 'center', marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' },
  progressStep: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'all 0.2s' },
  card: { background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: 24, maxWidth: 560, margin: '0 auto' },
  stepTitle: { fontSize: 20, fontWeight: 700, marginBottom: 20, color: 'var(--green)' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2, display: 'block' },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 15, outline: 'none' },
  btn: { padding: '12px 20px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, transition: 'opacity 0.2s', opacity: 1 },
  btnSecondary: { padding: '12px 20px', background: '#fff', color: 'var(--text)', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 15, fontWeight: 600 },
  infoBox: { background: 'var(--green-pale)', color: 'var(--green)', padding: '10px 14px', borderRadius: 8, fontSize: 13 },
  errorBox: { background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13 },
  successBox: { background: 'var(--green-pale)', color: 'var(--green)', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  itemCard: { border: '1.5px solid', borderRadius: 10, padding: 14, transition: 'all 0.15s' },
  addBtn: { padding: '6px 14px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' },
  qtyControl: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--green-pale)', borderRadius: 6, padding: '4px 8px' },
  qtyBtn: { width: 24, height: 24, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  totalBox: { background: 'var(--green-pale)', padding: 14, borderRadius: 10, fontWeight: 600, color: 'var(--green)', textAlign: 'center' },
  summarySection: { background: 'var(--gray)', borderRadius: 8, padding: '10px 14px', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 2 },
  summaryLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
};
