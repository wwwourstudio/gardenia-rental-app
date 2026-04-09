import type { FC } from 'react';
import { useState, useEffect } from 'react';
import {
  Page, WixDesignSystemProvider, Box, Card, Text, Button,
  Heading, Badge, Loader, Table, TableToolbar,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { items } from '@wix/data';
import { dashboard } from '@wix/dashboard';
import type { RentalItem, RentalBooking } from '../../../../components/shared';
import { formatDate, formatCurrency, STATUS_COLORS, STATUS_BG } from '../../../../components/shared';

const OverviewPage: FC = () => {
  const [catalogItems, setCatalogItems] = useState<RentalItem[]>([]);
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [catalogRes, bookingsRes] = await Promise.all([
        items.queryDataItems({ dataCollectionId: 'RentalCatalog' }).find(),
        items.queryDataItems({ dataCollectionId: 'RentalBookings' })
          .descending('_createdDate').limit(5).find(),
      ]);
      setCatalogItems((catalogRes.items || []).map(i => i.data as RentalItem));
      setBookings((bookingsRes.items || []).map(i => i.data as RentalBooking));
    } catch (e) {
      console.error('Load error', e);
    } finally {
      setLoading(false);
    }
  }

  const pending   = bookings.filter(b => b.status === 'pending').length;
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const revenue   = bookings.filter(b => b.status === 'confirmed')
    .reduce((s, b) => s + (b.total || 0), 0);

  const navTo = (route: string) => {
    dashboard.navigate({ pageId: route });
  };

  if (loading) {
    return (
      <WixDesignSystemProvider features={{ newColorsBranding: true }}>
        <Page>
          <Page.Header title="Rental Manager" subtitle="Loading your rental data…" />
          <Page.Content><Box align="center" paddingTop="SP10"><Loader size="medium" /></Box></Page.Content>
        </Page>
      </WixDesignSystemProvider>
    );
  }

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <Page>
        <Page.Header
          title="Rental Manager"
          subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          actionsBar={
            <Button onClick={() => navTo('add-item')}>+ Add Rental Item</Button>
          }
        />
        <Page.Content>
          {/* STAT CARDS */}
          <Box gap="SP4" marginBottom="SP6" direction="horizontal">
            <Card>
              <Card.Content>
                <Box direction="vertical" gap="SP1">
                  <Text secondary size="small">Pending Requests</Text>
                  <Heading size="large" style={{ color: '#8a6200' }}>{pending}</Heading>
                  <Text secondary size="tiny">awaiting response</Text>
                </Box>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content>
                <Box direction="vertical" gap="SP1">
                  <Text secondary size="small">Confirmed</Text>
                  <Heading size="large" style={{ color: '#2e6e4a' }}>{confirmed}</Heading>
                  <Text secondary size="tiny">this month</Text>
                </Box>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content>
                <Box direction="vertical" gap="SP1">
                  <Text secondary size="small">Catalog Items</Text>
                  <Heading size="large">{catalogItems.length}</Heading>
                  <Text secondary size="tiny">in inventory</Text>
                </Box>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content>
                <Box direction="vertical" gap="SP1">
                  <Text secondary size="small">Est. Revenue</Text>
                  <Heading size="large" style={{ color: '#2e6e4a' }}>{formatCurrency(revenue)}</Heading>
                  <Text secondary size="tiny">confirmed bookings</Text>
                </Box>
              </Card.Content>
            </Card>
          </Box>

          {/* RECENT BOOKINGS */}
          <Card marginBottom="SP4">
            <Card.Header
              title="Recent Booking Requests"
              suffix={<Button size="small" priority="secondary" onClick={() => navTo('bookings')}>View All</Button>}
            />
            <Card.Content>
              {bookings.length === 0 ? (
                <Box paddingTop="SP4" paddingBottom="SP4" align="center">
                  <Text secondary>No booking requests yet. They will appear here when customers submit the rental form.</Text>
                </Box>
              ) : (
                <Table data={bookings} columns={[
                  { title: 'Customer', render: (b: RentalBooking) => `${b.firstName} ${b.lastName}` },
                  { title: 'Item', render: (b: RentalBooking) => b.itemTitle || '—' },
                  { title: 'Dates', render: (b: RentalBooking) => `${formatDate(b.startDate)} → ${formatDate(b.endDate)}` },
                  { title: 'Total', render: (b: RentalBooking) => formatCurrency(b.total) },
                  {
                    title: 'Status', render: (b: RentalBooking) => (
                      <Badge
                        skin="neutralLight"
                        style={{ background: STATUS_BG[b.status || 'pending'], color: STATUS_COLORS[b.status || 'pending'] }}
                      >
                        {(b.status || 'pending').toUpperCase()}
                      </Badge>
                    )
                  },
                ]} />
              )}
            </Card.Content>
          </Card>

          {/* INVENTORY SNAPSHOT */}
          <Card>
            <Card.Header
              title="Inventory"
              suffix={<Button size="small" priority="secondary" onClick={() => navTo('inventory')}>Manage</Button>}
            />
            <Card.Content>
              {catalogItems.length === 0 ? (
                <Box paddingTop="SP4" paddingBottom="SP4" align="center">
                  <Text secondary>No items in catalog. Click "Add Rental Item" to get started.</Text>
                </Box>
              ) : (
                <Table data={catalogItems.slice(0, 6)} columns={[
                  { title: 'Item', render: (i: RentalItem) => i.title || '—' },
                  { title: 'Category', render: (i: RentalItem) => i.category || '—' },
                  { title: 'Rate/Day', render: (i: RentalItem) => formatCurrency(i.pricePerDay) + '/day' },
                  { title: 'Qty', render: (i: RentalItem) => String(i.quantity || 1) },
                  {
                    title: 'Status', render: (i: RentalItem) => (
                      <Badge skin={i.available !== false ? 'success' : 'neutralLight'}>
                        {i.available !== false ? 'Available' : 'Off'}
                      </Badge>
                    )
                  },
                ]} />
              )}
            </Card.Content>
          </Card>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
};

export default OverviewPage;
