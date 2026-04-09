import type { FC } from 'react';
import { useState, useEffect } from 'react';
import {
  Page, WixDesignSystemProvider, Box, Card, Text, Button, Loader, Heading,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { items } from '@wix/data';
import type { RentalBooking } from '../../../../components/shared';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const CalendarPage: FC = () => {
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  useEffect(() => { loadBookings(); }, []);

  async function loadBookings() {
    try {
      const res = await items.queryDataItems({ dataCollectionId: 'RentalBookings' })
        .ne('status', 'cancelled').limit(200).find();
      setBookings((res.items || []).map(i => i.data as RentalBooking));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function navigate(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  }

  // Build booking map
  const bookingMap: Record<string, RentalBooking[]> = {};
  bookings.forEach(b => {
    if (!b.startDate || !b.endDate) return;
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      if (!bookingMap[key]) bookingMap[key] = [];
      bookingMap[key].push(b);
    }
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <Page>
        <Page.Header
          title="Rental Calendar"
          subtitle="See all active bookings by date"
          actionsBar={
            <Box gap="SP2" direction="horizontal" align="center">
              <Button priority="secondary" size="small" onClick={() => navigate(-1)}>‹ Prev</Button>
              <Heading size="small">{MONTHS[month]} {year}</Heading>
              <Button priority="secondary" size="small" onClick={() => navigate(1)}>Next ›</Button>
            </Box>
          }
        />
        <Page.Content>
          {loading ? (
            <Box align="center" paddingTop="SP10"><Loader size="medium" /></Box>
          ) : (
            <Card>
              <Card.Content>
                {/* Day headers */}
                <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                  {DAYS.map(d => (
                    <Box key={d} align="center" paddingTop="SP1" paddingBottom="SP1">
                      <Text secondary size="tiny" weight="bold">{d}</Text>
                    </Box>
                  ))}
                </Box>

                {/* Calendar grid */}
                <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {/* Empty cells */}
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <Box key={`empty-${i}`} style={{ minHeight: '72px' }} />
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const date = new Date(year, month, day);
                    const key = date.toISOString().split('T')[0];
                    const dayBookings = bookingMap[key] || [];
                    const isToday = date.toDateString() === today.toDateString();
                    const isPast = date < today;

                    return (
                      <Box
                        key={day}
                        direction="vertical"
                        padding="SP2"
                        style={{
                          minHeight: '72px',
                          border: `1px solid ${isToday ? '#111' : dayBookings.length ? '#2e6e4a' : '#e4e4e4'}`,
                          borderRadius: '4px',
                          background: dayBookings.length ? '#f0f7f4' : isPast ? '#fafafa' : '#fff',
                        }}
                      >
                        <Text
                          size="small"
                          weight={isToday ? 'bold' : 'normal'}
                          style={{ marginBottom: '4px' }}
                        >
                          {day}
                        </Text>
                        {dayBookings.map((b, bi) => (
                          <Box
                            key={bi}
                            padding="SP1"
                            style={{
                              background: '#2e6e4a',
                              borderRadius: '2px',
                              marginBottom: '2px',
                              overflow: 'hidden',
                            }}
                          >
                            <Text size="tiny" style={{ color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {b.itemTitle || 'Rental'}
                            </Text>
                          </Box>
                        ))}
                      </Box>
                    );
                  })}
                </Box>

                {/* Legend */}
                <Box gap="SP4" marginTop="SP4" direction="horizontal">
                  <Box gap="SP1" direction="horizontal" align="center">
                    <Box style={{ width: '12px', height: '12px', background: '#f0f7f4', border: '1px solid #2e6e4a', borderRadius: '2px' }} />
                    <Text secondary size="tiny">Has bookings</Text>
                  </Box>
                  <Box gap="SP1" direction="horizontal" align="center">
                    <Box style={{ width: '12px', height: '12px', background: '#fff', border: '1px solid #111', borderRadius: '2px' }} />
                    <Text secondary size="tiny">Today</Text>
                  </Box>
                </Box>
              </Card.Content>
            </Card>
          )}
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
};

export default CalendarPage;
