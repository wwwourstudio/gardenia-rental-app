import type { FC } from 'react';
import { useState, useEffect } from 'react';
import {
  Page, WixDesignSystemProvider, Box, Card, Text, Button,
  Badge, Loader, Table, Search, Dropdown, SidePanel,
  Heading, Divider, TextButton,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { items } from '@wix/data';
import type { RentalBooking } from '../../../../components/shared';
import { formatDate, formatCurrency, STATUS_COLORS, STATUS_BG } from '../../../../components/shared';

const BookingsPage: FC = () => {
  const [allBookings, setAllBookings] = useState<RentalBooking[]>([]);
  const [filtered, setFiltered] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState<RentalBooking | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { loadBookings(); }, []);
  useEffect(() => { applyFilter(); }, [allBookings, statusFilter, searchText]);

  async function loadBookings() {
    try {
      const res = await items.queryDataItems({ dataCollectionId: 'RentalBookings' })
        .descending('_createdDate').limit(200).find();
      const bks = (res.items || []).map(i => i.data as RentalBooking);
      setAllBookings(bks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function applyFilter() {
    const q = searchText.toLowerCase();
    setFiltered(allBookings.filter(b => {
      const statusOk = statusFilter === 'all' || b.status === statusFilter;
      const qOk = !q || [b.firstName, b.lastName, b.email, b.itemTitle].some(f => f?.toLowerCase().includes(q));
      return statusOk && qOk;
    }));
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(true);
    try {
      const res = await items.getDataItem(id, { dataCollectionId: 'RentalBookings' });
      await items.updateDataItem({ dataCollectionId: 'RentalBookings', dataItem: { ...res, data: { ...res.data, status } } });
      setAllBookings(prev => prev.map(b => b._id === id ? { ...b, status: status as any } : b));
      if (selected?._id === id) setSelected(prev => prev ? { ...prev, status: status as any } : null);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  }

  const pending = allBookings.filter(b => b.status === 'pending').length;

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <Page>
        <Page.Header
          title="Booking Requests"
          subtitle={`${filtered.length} requests${pending ? ` · ${pending} pending` : ''}`}
        />
        <Page.Content>
          <Card>
            <TableToolbar>
              <TableToolbar.ItemGroup position="start">
                <TableToolbar.Item>
                  <Dropdown
                    placeholder="All Status"
                    options={[
                      { id: 'all', value: 'All Status' },
                      { id: 'pending', value: 'Pending' },
                      { id: 'confirmed', value: 'Confirmed' },
                      { id: 'cancelled', value: 'Cancelled' },
                    ]}
                    selectedId={statusFilter}
                    onSelect={o => setStatusFilter(o.id as string)}
                  />
                </TableToolbar.Item>
              </TableToolbar.ItemGroup>
              <TableToolbar.ItemGroup position="end">
                <TableToolbar.Item>
                  <Search
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder="Search name or item…"
                  />
                </TableToolbar.Item>
              </TableToolbar.ItemGroup>
            </TableToolbar>

            {loading ? (
              <Box align="center" paddingTop="SP10" paddingBottom="SP10"><Loader size="medium" /></Box>
            ) : filtered.length === 0 ? (
              <Box align="center" paddingTop="SP10" paddingBottom="SP10">
                <Text secondary>No booking requests found</Text>
              </Box>
            ) : (
              <Table
                data={filtered}
                columns={[
                  { title: 'Date', render: (b: RentalBooking) => formatDate(b._createdDate || b.submittedAt), width: '100px' },
                  {
                    title: 'Customer', render: (b: RentalBooking) => (
                      <Box direction="vertical">
                        <Text weight="normal">{b.firstName} {b.lastName}</Text>
                        <Text secondary size="small">{b.email}</Text>
                      </Box>
                    )
                  },
                  {
                    title: 'Item', render: (b: RentalBooking) => (
                      <Box direction="vertical">
                        <Text>{b.itemTitle || '—'}</Text>
                        <Text secondary size="small">Qty: {b.quantity || 1}</Text>
                      </Box>
                    )
                  },
                  {
                    title: 'Dates', render: (b: RentalBooking) => (
                      <Box direction="vertical">
                        <Text size="small">{formatDate(b.startDate)}</Text>
                        <Text secondary size="small">→ {formatDate(b.endDate)}</Text>
                      </Box>
                    )
                  },
                  { title: 'Total', render: (b: RentalBooking) => <Text weight="bold">{formatCurrency(b.total)}</Text> },
                  {
                    title: 'Status', render: (b: RentalBooking) => (
                      <Badge skin="neutralLight" style={{ background: STATUS_BG[b.status || 'pending'], color: STATUS_COLORS[b.status || 'pending'] }}>
                        {(b.status || 'pending').toUpperCase()}
                      </Badge>
                    )
                  },
                  {
                    title: '', render: (b: RentalBooking) => (
                      <TextButton onClick={() => setSelected(b)}>View</TextButton>
                    ), width: '60px'
                  },
                ]}
              />
            )}
          </Card>
        </Page.Content>
      </Page>

      {/* BOOKING DETAIL SIDE PANEL */}
      {selected && (
        <SidePanel onCloseButtonClick={() => setSelected(null)} title="Booking Detail">
          <SidePanel.Content>
            <Box direction="vertical" gap="SP4">
              <Box direction="vertical" gap="SP1">
                <Text secondary size="small">CUSTOMER</Text>
                <Text weight="bold">{selected.firstName} {selected.lastName}</Text>
                <Text secondary size="small">{selected.email}</Text>
                {selected.phone && <Text secondary size="small">{selected.phone}</Text>}
              </Box>
              <Divider />
              <Box direction="vertical" gap="SP1">
                <Text secondary size="small">ITEM</Text>
                <Text weight="bold">{selected.itemTitle || '—'}</Text>
                <Text secondary size="small">Quantity: {selected.quantity || 1}</Text>
              </Box>
              <Divider />
              <Box direction="horizontal" gap="SP6">
                <Box direction="vertical" gap="SP1">
                  <Text secondary size="small">DATES</Text>
                  <Text>{formatDate(selected.startDate)}</Text>
                  <Text secondary size="small">→ {formatDate(selected.endDate)}</Text>
                  <Text secondary size="small">{selected.days || '?'} days</Text>
                </Box>
                <Box direction="vertical" gap="SP1">
                  <Text secondary size="small">PRICING</Text>
                  <Heading size="medium">{formatCurrency(selected.total)}</Heading>
                  {selected.depositAmount ? <Text secondary size="small">{formatCurrency(selected.depositAmount)} deposit</Text> : null}
                </Box>
              </Box>
              <Divider />
              <Box direction="vertical" gap="SP1">
                <Text secondary size="small">STATUS</Text>
                <Badge skin="neutralLight" style={{ background: STATUS_BG[selected.status || 'pending'], color: STATUS_COLORS[selected.status || 'pending'] }}>
                  {(selected.status || 'pending').toUpperCase()}
                </Badge>
              </Box>
              {selected.notes && (
                <>
                  <Divider />
                  <Box direction="vertical" gap="SP1">
                    <Text secondary size="small">EVENT NOTES</Text>
                    <Text size="small">{selected.notes}</Text>
                  </Box>
                </>
              )}
              <Text secondary size="tiny">Ref: {(selected._id || '').slice(0, 8).toUpperCase()}</Text>
            </Box>
          </SidePanel.Content>
          <SidePanel.Footer>
            <Box gap="SP2" direction="horizontal">
              {selected.status === 'pending' && (
                <>
                  <Button
                    skin="destructive"
                    disabled={updating}
                    onClick={() => updateStatus(selected._id, 'cancelled')}
                  >
                    Decline
                  </Button>
                  <Button
                    disabled={updating}
                    onClick={() => updateStatus(selected._id, 'confirmed')}
                  >
                    ✓ Confirm
                  </Button>
                </>
              )}
              {selected.status === 'confirmed' && (
                <Button skin="destructive" disabled={updating} onClick={() => updateStatus(selected._id, 'cancelled')}>
                  Cancel Booking
                </Button>
              )}
              <Button priority="secondary" onClick={() => setSelected(null)}>Close</Button>
            </Box>
          </SidePanel.Footer>
        </SidePanel>
      )}
    </WixDesignSystemProvider>
  );
};

export default BookingsPage;
