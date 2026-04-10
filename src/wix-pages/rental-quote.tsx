// ═══════════════════════════════════════════════════════════════
// RENTAL QUOTE PAGE — src/wix-pages/rental-quote.tsx
// 5-step customer-facing rental quote form.
// Wix CLI page — deployed via: npx @wix/cli@latest deploy
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { getRentalItems, createRentalBooking } from '../backend/rentals.web';
import type { RentalItem } from '../dashboard/pages/schema';
import type { BookingFormData, BookingResult } from '../backend/rentals.web';

// ── Design tokens ──────────────────────────────────────────────
const P = {
  green:      '#4a7c59',
  greenLight: '#e8f0eb',
  greenDark:  '#3a6347',
  cream:      '#f9f5ef',
  gold:       '#8b7355',
  text:       '#2c2c2c',
  muted:      '#7a7a6e',
  border:     '#ddd5c8',
  white:      '#ffffff',
  error:      '#c0392b',
  errorBg:    '#fdf0ef',
  errorBorder:'#e8c0bc',
} as const;

const SERIF = "'Georgia', 'Times New Roman', serif";
const SANS  = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const STEP_LABELS = ['Event Dates', 'Location', 'Select Items', 'Your Info', 'Confirm'];

// ── Shared style objects ───────────────────────────────────────
const style = {
  page: {
    minHeight: '100vh',
    background: P.cream,
    fontFamily: SANS,
    color: P.text,
    paddingBottom: 80,
  } as React.CSSProperties,

  header: {
    background: P.white,
    borderBottom: `1px solid ${P.border}`,
    padding: '20px 32px',
    textAlign: 'center' as const,
  },

  logo: {
    fontFamily: SERIF,
    fontSize: 24,
    fontStyle: 'italic' as const,
    color: P.green,
    margin: 0,
    letterSpacing: '0.02em',
  },

  tagline: {
    fontSize: 11,
    color: P.muted,
    margin: '4px 0 0',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
  },

  progressWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 0,
    padding: '20px 24px 16px',
    background: P.white,
    borderBottom: `1px solid ${P.border}`,
    overflowX: 'auto' as const,
  },

  container: {
    maxWidth: 780,
    margin: '0 auto',
    padding: '32px 20px',
  },

  card: {
    background: P.white,
    border: `1px solid ${P.border}`,
    borderRadius: 12,
    padding: '32px',
  } as React.CSSProperties,

  stepTitle: {
    fontFamily: SERIF,
    fontSize: 26,
    fontStyle: 'italic' as const,
    color: P.green,
    margin: '0 0 6px',
  },

  stepSub: {
    fontSize: 14,
    color: P.muted,
    margin: '0 0 28px',
    lineHeight: 1.5,
  },

  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: P.text,
    marginBottom: 7,
    letterSpacing: '0.025em',
  },

  input: {
    display: 'block',
    width: '100%',
    padding: '10px 14px',
    border: `1px solid ${P.border}`,
    borderRadius: 8,
    fontSize: 15,
    color: P.text,
    background: P.white,
    boxSizing: 'border-box' as const,
    fontFamily: SANS,
    outline: 'none',
  } as React.CSSProperties,

  row: { display: 'flex', gap: 16 } as React.CSSProperties,
  col: { flex: 1, minWidth: 0 } as React.CSSProperties,

  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    gap: 12,
  } as React.CSSProperties,

  btnPrimary: {
    background: P.green,
    color: P.white,
    border: 'none',
    borderRadius: 8,
    padding: '12px 28px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: SANS,
    transition: 'background 0.15s',
  } as React.CSSProperties,

  btnSecondary: {
    background: 'transparent',
    color: P.muted,
    border: `1px solid ${P.border}`,
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 15,
    cursor: 'pointer',
    fontFamily: SANS,
  } as React.CSSProperties,

  btnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed' as const,
  },

  errorBox: {
    background: '#fdf0ef',
    color: P.error,
    border: `1px solid ${P.errorBorder}`,
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 14,
    marginTop: 16,
    lineHeight: 1.5,
  } as React.CSSProperties,

  pill: (active: boolean): React.CSSProperties => ({
    padding: '5px 14px',
    borderRadius: 20,
    border: `1px solid ${active ? P.green : P.border}`,
    background: active ? P.green : P.white,
    color: active ? P.white : P.muted,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap' as const,
  }),
};

// ── Main component ─────────────────────────────────────────────
export default function RentalQuotePage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1 — Dates
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');

  // Step 2 — Location
  const [location, setLocation] = useState('');

  // Step 3 — Items
  const [catalogItems,   setCatalogItems]   = useState<RentalItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError,   setCatalogError]   = useState('');
  const [selections,     setSelections]     = useState<Record<string, number>>({});
  const [catFilter,      setCatFilter]      = useState('all');

  // Step 4 — Contact info
  const [customerName, setCustomerName] = useState('');
  const [email,        setEmail]        = useState('');
  const [phone,        setPhone]        = useState('');

  // Submission
  const [submitting,     setSubmitting]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);
  const [submitError,    setSubmitError]    = useState('');
  const [bookingResult,  setBookingResult]  = useState<BookingResult | null>(null);

  // Load catalog when first arriving at step 3
  useEffect(() => {
    if (step === 3 && catalogItems.length === 0 && !catalogLoading) {
      setCatalogLoading(true);
      setCatalogError('');
      getRentalItems()
        .then(items => setCatalogItems(items))
        .catch(() => setCatalogError('Unable to load rental items. Please refresh the page.'))
        .finally(() => setCatalogLoading(false));
    }
  }, [step]);

  // ── Computed values ──────────────────────────────────────────

  function rentalDays(): number {
    if (!startDate || !endDate) return 1;
    return Math.max(1, Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
    ) + 1);
  }

  function runningTotal(): number {
    return Object.entries(selections).reduce((sum, [id, qty]) => {
      const item = catalogItems.find(i => i._id === id);
      return sum + (item?.pricePerDay ?? 0) * qty * rentalDays();
    }, 0);
  }

  function selectedSummary() {
    return Object.entries(selections)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = catalogItems.find(i => i._id === id)!;
        return {
          item,
          qty,
          subtotal: (item?.pricePerDay ?? 0) * qty * rentalDays(),
        };
      });
  }

  function categories(): string[] {
    return [...new Set(catalogItems.map(i => i.category))].sort();
  }

  function filteredItems(): RentalItem[] {
    return catFilter === 'all'
      ? catalogItems
      : catalogItems.filter(i => i.category === catFilter);
  }

  function totalQty(): number {
    return Object.values(selections).reduce((a, b) => a + b, 0);
  }

  // ── Navigation ───────────────────────────────────────────────

  function goNext() { setStep(s => Math.min(5, s + 1) as 1 | 2 | 3 | 4 | 5); }
  function goBack() { setStep(s => Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5); }

  function canContinue(): boolean {
    if (step === 1) return !!startDate && !!endDate && endDate >= startDate;
    if (step === 2) return location.trim().length > 3;
    if (step === 3) return totalQty() > 0;
    if (step === 4) return !!customerName.trim() && !!email.trim() && email.includes('@');
    return true;
  }

  // ── Submit ───────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const formData: BookingFormData = {
        customerName: customerName.trim(),
        email:        email.trim(),
        phone:        phone.trim(),
        eventStart:   startDate,
        eventEnd:     endDate,
        location:     location.trim(),
        selectedItems: selectedSummary().map(s => ({
          itemId:      s.item._id,
          name:        s.item.name,
          qty:         s.qty,
          pricePerDay: s.item.pricePerDay,
        })),
        totalPrice: runningTotal(),
      };
      const result = await createRentalBooking(formData);
      setBookingResult(result);
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setStep(1);
    setStartDate(''); setEndDate('');
    setLocation('');
    setCatalogItems([]); setSelections({}); setCatFilter('all');
    setCustomerName(''); setEmail(''); setPhone('');
    setSubmitted(false); setBookingResult(null); setSubmitError('');
  }

  const today = new Date().toISOString().split('T')[0];

  // ── Progress bar ─────────────────────────────────────────────

  function ProgressBar() {
    return (
      <div style={style.progressWrap}>
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4 | 5;
          const active = n === step;
          const done   = n < step;
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 72 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: done || active ? P.green : P.border,
                  color: done || active ? P.white : P.muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  boxShadow: active ? `0 0 0 3px ${P.greenLight}` : 'none',
                  transition: 'all 0.2s',
                }}>
                  {done ? '✓' : n}
                </div>
                <span style={{
                  fontSize: 10,
                  color: active ? P.green : P.muted,
                  fontWeight: active ? 700 : 400,
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div style={{
                  width: 28, height: 2, marginBottom: 20,
                  background: done ? P.green : P.border,
                  transition: 'background 0.2s',
                }} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Success screen ───────────────────────────────────────────

  if (submitted && bookingResult) {
    return (
      <div style={style.page}>
        <div style={style.header}>
          <p style={style.logo}>Gardenia Event Decor</p>
          <p style={style.tagline}>Dallas, TX · Event Rentals</p>
        </div>
        <div style={style.container}>
          <div style={{ ...style.card, textAlign: 'center', padding: '52px 32px' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🌿</div>
            <h2 style={{ fontFamily: SERIF, fontSize: 32, fontStyle: 'italic', color: P.green, margin: '0 0 10px' }}>
              Quote Request Received!
            </h2>
            <p style={{ color: P.muted, fontSize: 15, margin: '0 0 28px', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
              Thank you, {customerName.split(' ')[0]}. Our team will review your selections
              and follow up within 24 hours.
            </p>

            {/* Confirmation number */}
            <div style={{
              display: 'inline-block',
              background: P.greenLight,
              border: `1px solid ${P.green}`,
              borderRadius: 12,
              padding: '16px 36px',
              marginBottom: 28,
            }}>
              <div style={{ fontSize: 11, color: P.muted, letterSpacing: '0.1em', marginBottom: 6 }}>
                CONFIRMATION NUMBER
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 30, color: P.green, fontWeight: 700, letterSpacing: '0.05em' }}>
                {bookingResult.confirmationRef}
              </div>
            </div>

            {/* Summary */}
            <div style={{ maxWidth: 380, margin: '0 auto 28px', textAlign: 'left' }}>
              <div style={{
                background: P.cream,
                border: `1px solid ${P.border}`,
                borderRadius: 8,
                padding: '14px 18px',
              }}>
                {[
                  ['Event Dates', `${startDate} → ${endDate} (${rentalDays()} day${rentalDays() !== 1 ? 's' : ''})`],
                  ['Location', location],
                  ['Estimated Total', `$${runningTotal().toFixed(2)}`],
                  ['Email', email],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, fontSize: 14 }}>
                    <span style={{ color: P.muted }}>{k}</span>
                    <span style={{ fontWeight: 600, textAlign: 'right', color: k === 'Estimated Total' ? P.green : P.text }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {bookingResult.emailSent && (
              <p style={{ fontSize: 13, color: P.muted, marginBottom: 28 }}>
                A confirmation email has been sent to <strong>{email}</strong>.
              </p>
            )}

            <button style={{ ...style.btnSecondary, borderRadius: 8 }} onClick={resetForm}>
              Submit Another Quote
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────

  return (
    <div style={style.page}>

      {/* Header */}
      <div style={style.header}>
        <p style={style.logo}>Gardenia Event Decor</p>
        <p style={style.tagline}>Dallas, TX · Event Rentals</p>
      </div>

      {/* Progress */}
      <ProgressBar />

      <div style={style.container}>

        {/* ════ STEP 1: Event Dates ════════════════════════════ */}
        {step === 1 && (
          <div style={style.card}>
            <h2 style={style.stepTitle}>When is your event?</h2>
            <p style={style.stepSub}>Select the dates you need your rentals.</p>

            <div style={style.row}>
              <div style={style.col}>
                <label style={style.label}>Start Date</label>
                <input
                  type="date"
                  style={style.input}
                  value={startDate}
                  min={today}
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (endDate && e.target.value > endDate) setEndDate('');
                  }}
                />
              </div>
              <div style={style.col}>
                <label style={style.label}>End Date</label>
                <input
                  type="date"
                  style={style.input}
                  value={endDate}
                  min={startDate || today}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {startDate && endDate && (
              <p style={{ marginTop: 14, fontSize: 14, color: P.green, fontWeight: 600 }}>
                {rentalDays()} rental day{rentalDays() !== 1 ? 's' : ''}
              </p>
            )}

            <div style={style.navRow}>
              <span />
              <button
                style={{ ...style.btnPrimary, ...(canContinue() ? {} : style.btnDisabled) }}
                onClick={goNext}
                disabled={!canContinue()}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ════ STEP 2: Location ══════════════════════════════ */}
        {step === 2 && (
          <div style={style.card}>
            <h2 style={style.stepTitle}>Where is your event?</h2>
            <p style={style.stepSub}>Enter the venue name or address in the Dallas area.</p>

            <label style={style.label}>Venue / Address</label>
            <input
              type="text"
              style={style.input}
              value={location}
              placeholder="e.g. The Grand Ballroom, 1234 Main St, Dallas TX 75201"
              onChange={e => setLocation(e.target.value)}
            />

            <div style={style.navRow}>
              <button style={style.btnSecondary} onClick={goBack}>← Back</button>
              <button
                style={{ ...style.btnPrimary, ...(canContinue() ? {} : style.btnDisabled) }}
                onClick={goNext}
                disabled={!canContinue()}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ════ STEP 3: Select Items ══════════════════════════ */}
        {step === 3 && (
          <div>
            <div style={style.card}>
              <h2 style={style.stepTitle}>Select your rentals</h2>
              <p style={style.stepSub}>
                Tap any item to add it to your quote. Adjust quantities with +/−.
                Price shown is per day × {rentalDays()} day{rentalDays() !== 1 ? 's' : ''}.
              </p>

              {/* Category pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 24 }}>
                {['all', ...categories()].map(cat => (
                  <button key={cat} style={style.pill(catFilter === cat)} onClick={() => setCatFilter(cat)}>
                    {cat === 'all' ? 'All Items' : cat}
                  </button>
                ))}
              </div>

              {/* Grid */}
              {catalogLoading ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: P.muted, fontSize: 15 }}>
                  Loading rental items…
                </div>
              ) : catalogError ? (
                <div style={style.errorBox}>{catalogError}</div>
              ) : filteredItems().length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: P.muted }}>
                  No items in this category.
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                  gap: 16,
                }}>
                  {filteredItems().map(item => {
                    const qty      = selections[item._id] ?? 0;
                    const isSelected = qty > 0;
                    return (
                      <div
                        key={item._id}
                        onClick={() => {
                          if (!isSelected) setSelections(prev => ({ ...prev, [item._id]: 1 }));
                        }}
                        style={{
                          border: `2px solid ${isSelected ? P.green : P.border}`,
                          borderRadius: 10,
                          padding: 16,
                          background: isSelected ? P.greenLight : P.white,
                          cursor: isSelected ? 'default' : 'pointer',
                          transition: 'border-color 0.15s, background 0.15s',
                          position: 'relative' as const,
                        }}
                      >
                        {/* Image / placeholder */}
                        <div style={{
                          height: 72,
                          borderRadius: 6,
                          marginBottom: 12,
                          background: isSelected ? '#c8dece' : '#f0e8dc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          fontSize: 24,
                        }}>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            isSelected ? '✓' : '🌿'
                          )}
                        </div>

                        {/* Category tag */}
                        <span style={{
                          fontSize: 9,
                          color: P.gold,
                          fontWeight: 700,
                          letterSpacing: '0.07em',
                          textTransform: 'uppercase' as const,
                          display: 'block',
                          marginBottom: 4,
                        }}>
                          {item.category}
                        </span>

                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, lineHeight: 1.3 }}>{item.name}</div>
                        {item.description && (
                          <div style={{ fontSize: 11, color: P.muted, marginBottom: 8, lineHeight: 1.4 }}>
                            {item.description.length > 70
                              ? item.description.slice(0, 70) + '…'
                              : item.description}
                          </div>
                        )}
                        <div style={{ fontWeight: 700, color: P.green, fontSize: 13 }}>
                          ${item.pricePerDay}/day
                        </div>

                        {/* Qty controls */}
                        {isSelected && (
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              style={{
                                width: 26, height: 26, borderRadius: '50%',
                                border: `1px solid ${P.border}`, background: P.white,
                                cursor: 'pointer', fontSize: 15, lineHeight: '1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: SANS,
                              }}
                              onClick={() => {
                                const next = qty - 1;
                                if (next <= 0) {
                                  setSelections(prev => { const n = { ...prev }; delete n[item._id]; return n; });
                                } else {
                                  setSelections(prev => ({ ...prev, [item._id]: next }));
                                }
                              }}
                            >−</button>
                            <span style={{ fontWeight: 700, minWidth: 18, textAlign: 'center', fontSize: 14 }}>{qty}</span>
                            <button
                              style={{
                                width: 26, height: 26, borderRadius: '50%',
                                border: `1px solid ${P.border}`, background: P.white,
                                cursor: 'pointer', fontSize: 15, lineHeight: '1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: SANS,
                              }}
                              onClick={() => setSelections(prev => ({ ...prev, [item._id]: qty + 1 }))}
                            >+</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sticky total bar */}
            {totalQty() > 0 && (
              <div style={{
                position: 'sticky' as const,
                bottom: 16,
                background: P.green,
                color: P.white,
                borderRadius: 10,
                padding: '14px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 20px rgba(74,124,89,0.35)',
                marginTop: 12,
              }}>
                <span style={{ fontSize: 14 }}>
                  {totalQty()} item{totalQty() !== 1 ? 's' : ''} selected
                </span>
                <span style={{ fontWeight: 700, fontSize: 17 }}>
                  ${runningTotal().toFixed(2)} est.
                </span>
              </div>
            )}

            <div style={{ ...style.navRow, marginTop: 16 }}>
              <button style={style.btnSecondary} onClick={goBack}>← Back</button>
              <button
                style={{ ...style.btnPrimary, ...(canContinue() ? {} : style.btnDisabled) }}
                onClick={goNext}
                disabled={!canContinue()}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ════ STEP 4: Your Info ════════════════════════════ */}
        {step === 4 && (
          <div style={style.card}>
            <h2 style={style.stepTitle}>Your information</h2>
            <p style={style.stepSub}>We'll use this to send you the final quote.</p>

            <div style={{ marginBottom: 18 }}>
              <label style={style.label}>Full Name *</label>
              <input
                type="text"
                style={style.input}
                value={customerName}
                placeholder="Jane Smith"
                onChange={e => setCustomerName(e.target.value)}
              />
            </div>

            <div style={{ ...style.row, marginBottom: 18 }}>
              <div style={style.col}>
                <label style={style.label}>Email Address *</label>
                <input
                  type="email"
                  style={style.input}
                  value={email}
                  placeholder="jane@example.com"
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div style={style.col}>
                <label style={style.label}>Phone Number</label>
                <input
                  type="tel"
                  style={style.input}
                  value={phone}
                  placeholder="(214) 555-0100"
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div style={style.navRow}>
              <button style={style.btnSecondary} onClick={goBack}>← Back</button>
              <button
                style={{ ...style.btnPrimary, ...(canContinue() ? {} : style.btnDisabled) }}
                onClick={goNext}
                disabled={!canContinue()}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ════ STEP 5: Confirm & Submit ══════════════════════ */}
        {step === 5 && (
          <div style={style.card}>
            <h2 style={style.stepTitle}>Review your quote</h2>
            <p style={style.stepSub}>Please confirm everything looks right before submitting.</p>

            {/* Event summary */}
            <div style={{
              background: P.cream,
              border: `1px solid ${P.border}`,
              borderRadius: 8,
              padding: '16px 20px',
              marginBottom: 22,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px 20px',
              fontSize: 14,
            }}>
              <div>
                <span style={{ color: P.muted }}>Start Date: </span>
                <strong>{startDate}</strong>
              </div>
              <div>
                <span style={{ color: P.muted }}>End Date: </span>
                <strong>{endDate}</strong>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <span style={{ color: P.muted }}>Location: </span>
                <strong>{location}</strong>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <span style={{ color: P.muted }}>Contact: </span>
                <strong>{customerName}</strong>
                {' · '}{email}
                {phone ? ` · ${phone}` : ''}
              </div>
            </div>

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 14, marginBottom: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${P.border}` }}>
                  {['Item', 'Qty', 'Rate/Day', 'Subtotal'].map(h => (
                    <th key={h} style={{
                      padding: '8px 6px',
                      textAlign: h === 'Item' ? 'left' : 'right' as const,
                      color: P.muted,
                      fontWeight: 600,
                      fontSize: 12,
                      letterSpacing: '0.04em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedSummary().map(({ item, qty, subtotal }) => (
                  <tr key={item._id} style={{ borderBottom: `1px solid ${P.border}` }}>
                    <td style={{ padding: '10px 6px' }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: P.gold }}>{item.category}</div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 6px' }}>{qty}</td>
                    <td style={{ textAlign: 'right', padding: '10px 6px' }}>${item.pricePerDay}</td>
                    <td style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 600 }}>
                      ${subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', padding: '14px 6px', fontWeight: 700, fontSize: 15 }}>
                    Estimated Total ({rentalDays()} day{rentalDays() !== 1 ? 's' : ''}):
                  </td>
                  <td style={{ textAlign: 'right', padding: '14px 6px', fontWeight: 700, fontSize: 18, color: P.green }}>
                    ${runningTotal().toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <p style={{ fontSize: 12, color: P.muted, fontStyle: 'italic', marginBottom: 20 }}>
              * This is an estimate. Final pricing will be confirmed by our team after reviewing your request.
            </p>

            {submitError && <div style={style.errorBox}>{submitError}</div>}

            <div style={style.navRow}>
              <button style={style.btnSecondary} onClick={goBack} disabled={submitting}>
                ← Back
              </button>
              <button
                style={{ ...style.btnPrimary, ...(submitting ? style.btnDisabled : {}) }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Quote Request'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
