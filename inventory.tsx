import type { FC } from 'react';
import { useState, useEffect } from 'react';
import {
  Page, WixDesignSystemProvider, Box, Card, Text, Button,
  Badge, Loader, Table, Search, Dropdown, TableToolbar, TextButton, Image,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { items } from '@wix/data';
import { dashboard } from '@wix/dashboard';
import type { RentalItem } from '../../../../components/shared';
import { formatCurrency } from '../../../../components/shared';

const InventoryPage: FC = () => {
  const [allItems, setAllItems] = useState<RentalItem[]>([]);
  const [filtered, setFiltered] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { loadItems(); }, []);
  useEffect(() => { applyFilter(); }, [allItems, catFilter, searchText]);

  async function loadItems() {
    try {
      const res = await items.queryDataItems({ dataCollectionId: 'RentalCatalog' })
        .ascending('title').limit(200).find();
      setAllItems((res.items || []).map(i => i.data as RentalItem));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function applyFilter() {
    const q = searchText.toLowerCase();
    setFiltered(allItems.filter(i =>
      (catFilter === 'all' || i.category === catFilter) &&
      (!q || [i.title, i.description, i.category].some(f => f?.toLowerCase().includes(q)))
    ));
  }

  const categories = [...new Set(allItems.map(i => i.category).filter(Boolean))];
  const catOptions = [
    { id: 'all', value: 'All Categories' },
    ...categories.map(c => ({ id: c, value: c })),
  ];

  async function toggleAvailability(item: RentalItem) {
    setToggling(item._id);
    try {
      const res = await items.getDataItem(item._id, { dataCollectionId: 'RentalCatalog' });
      const updated = { ...res.data, available: !(item.available !== false) };
      await items.updateDataItem({ dataCollectionId: 'RentalCatalog', dataItem: { ...res, data: updated } });
      setAllItems(prev => prev.map(i => i._id === item._id ? { ...i, available: updated.available } : i));
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  }

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <Page>
        <Page.Header
          title="Inventory"
          subtitle={`${filtered.length} rental items`}
          actionsBar={
            <Button onClick={() => dashboard.navigate({ pageId: 'add-item' })}>+ Add Item</Button>
          }
        />
        <Page.Content>
          <Card>
            <TableToolbar>
              <TableToolbar.ItemGroup position="start">
                <TableToolbar.Item>
                  <Dropdown
                    placeholder="All Categories"
                    options={catOptions}
                    selectedId={catFilter}
                    onSelect={o => setCatFilter(o.id as string)}
                  />
                </TableToolbar.Item>
              </TableToolbar.ItemGroup>
              <TableToolbar.ItemGroup position="end">
                <TableToolbar.Item>
                  <Search
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder="Search items…"
                  />
                </TableToolbar.Item>
              </TableToolbar.ItemGroup>
            </TableToolbar>

            {loading ? (
              <Box align="center" paddingTop="SP10" paddingBottom="SP10"><Loader size="medium" /></Box>
            ) : filtered.length === 0 ? (
              <Box align="center" paddingTop="SP10" paddingBottom="SP10" direction="vertical" gap="SP2">
                <Text secondary>No items found.</Text>
                <Button onClick={() => dashboard.navigate({ pageId: 'add-item' })}>Add your first item</Button>
              </Box>
            ) : (
              <Table
                data={filtered}
                columns={[
                  {
                    title: 'Item', render: (i: RentalItem) => (
                      <Box direction="horizontal" gap="SP3" align="center">
                        {i.image && (
                          <Box width="40px" height="40px" style={{ borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                            <Image src={i.image} width={40} height={40} fit="cover" />
                          </Box>
                        )}
                        <Box direction="vertical">
                          <Text weight="bold">{i.title || '—'}</Text>
                          {i.notes && <Text secondary size="small">{i.notes}</Text>}
                        </Box>
                      </Box>
                    )
                  },
                  { title: 'Category', render: (i: RentalItem) => i.category || '—' },
                  { title: 'Rate/Day', render: (i: RentalItem) => formatCurrency(i.pricePerDay) },
                  { title: 'Deposit', render: (i: RentalItem) => i.depositAmount ? formatCurrency(i.depositAmount) : '—' },
                  { title: 'Min Days', render: (i: RentalItem) => String(i.minDays || 1) },
                  { title: 'Qty', render: (i: RentalItem) => String(i.quantity || 1) },
                  {
                    title: 'Status', render: (i: RentalItem) => (
                      <Badge skin={i.available !== false ? 'success' : 'neutralLight'}>
                        {i.available !== false ? 'Available' : 'Off'}
                      </Badge>
                    )
                  },
                  {
                    title: '', render: (i: RentalItem) => (
                      <Box gap="SP2" direction="horizontal">
                        <TextButton onClick={() => dashboard.navigate({ pageId: 'add-item', relativeUrl: `?editId=${i._id}` })}>
                          Edit
                        </TextButton>
                        <TextButton
                          disabled={toggling === i._id}
                          onClick={() => toggleAvailability(i)}
                        >
                          {i.available !== false ? 'Disable' : 'Enable'}
                        </TextButton>
                      </Box>
                    ), width: '120px'
                  },
                ]}
              />
            )}
          </Card>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
};

export default InventoryPage;
