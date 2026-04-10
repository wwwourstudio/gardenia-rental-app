// ═══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD — src/dashboard/pages/rental-admin.tsx
// Wix Dashboard extension page for managing RentalItems.
// Visible only to site admins — deploy via: npx @wix/cli@latest deploy
// ═══════════════════════════════════════════════════════════════

import type { FC } from 'react';
import { useState, useEffect } from 'react';
import {
  Page,
  WixDesignSystemProvider,
  Box,
  Card,
  Text,
  Button,
  Badge,
  Loader,
  Table,
  TableToolbar,
  TextButton,
  FormField,
  Input,
  NumberInput,
  Textarea,
  Toggle,
  Notification,
  Search,
  Dropdown,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { items } from '@wix/data';
import { dashboard } from '@wix/dashboard';
import type { RentalItem } from './schema';
import { CATEGORIES, formatCurrency } from './schema';

// ── Component ─────────────────────────────────────────────────
const RentalAdminPage: FC = () => {

  // ── List state
  const [allItems,    setAllItems]    = useState<RentalItem[]>([]);
  const [filtered,    setFiltered]    = useState<RentalItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [catFilter,   setCatFilter]   = useState('all');
  const [searchText,  setSearchText]  = useState('');
  const [toggling,    setToggling]    = useState<string | null>(null);
  const [deleting,    setDeleting]    = useState<string | null>(null);

  // ── Inline form state
  const [showForm,  setShowForm]   = useState(false);
  const [editId,    setEditId]     = useState<string | null>(null);
  const [saving,    setSaving]     = useState(false);
  const [saved,     setSaved]      = useState(false);
  const [saveError, setSaveError]  = useState('');

  // Form fields
  const [fName,      setFName]      = useState('');
  const [fCategory,  setFCategory]  = useState('');
  const [fPrice,     setFPrice]     = useState<number>(0);
  const [fDesc,      setFDesc]      = useState('');
  const [fImage,     setFImage]     = useState('');
  const [fAvailable, setFAvailable] = useState(true);
  const [fFeatured,  setFFeatured]  = useState(false);

  useEffect(() => { loadItems(); }, []);
  useEffect(() => { applyFilter(); }, [allItems, catFilter, searchText]);

  // ── Data loading ──────────────────────────────────────────────

  async function loadItems() {
    try {
      const res = await items
        .queryDataItems({ dataCollectionId: 'RentalItems' })
        .ascending('name')
        .limit(200)
        .find();
      setAllItems((res.items || []).map(i => i.data as RentalItem));
    } catch (e) {
      console.error('Failed to load RentalItems:', e);
    } finally {
      setLoading(false);
    }
  }

  function applyFilter() {
    const q = searchText.toLowerCase();
    setFiltered(allItems.filter(item =>
      (catFilter === 'all' || item.category === catFilter) &&
      (!q || [item.name, item.description, item.category].some(f => f?.toLowerCase().includes(q)))
    ));
  }

  // ── Form helpers ──────────────────────────────────────────────

  function openAddForm() {
    setEditId(null);
    setFName(''); setFCategory(''); setFPrice(0);
    setFDesc(''); setFImage('');
    setFAvailable(true); setFFeatured(false);
    setSaveError(''); setSaved(false);
    setShowForm(true);
    scrollToForm();
  }

  function openEditForm(item: RentalItem) {
    setEditId(item._id);
    setFName(item.name ?? '');
    setFCategory(item.category ?? '');
    setFPrice(item.pricePerDay ?? 0);
    setFDesc(item.description ?? '');
    setFImage(item.image ?? '');
    setFAvailable(item.available !== false);
    setFFeatured(item.featured === true);
    setSaveError(''); setSaved(false);
    setShowForm(true);
    scrollToForm();
  }

  function scrollToForm() {
    setTimeout(() => {
      document.getElementById('rental-admin-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
  }

  // ── CRUD operations ───────────────────────────────────────────

  async function handleSave() {
    if (!fName.trim()) { setSaveError('Item name is required.'); return; }
    if (!fPrice)        { setSaveError('Price per day is required.'); return; }
    setSaveError('');
    setSaving(true);

    const data = {
      name:        fName.trim(),
      category:    fCategory as RentalItem['category'],
      pricePerDay: fPrice,
      description: fDesc.trim(),
      image:       fImage.trim(),
      available:   fAvailable,
      featured:    fFeatured,
    };

    try {
      if (editId) {
        // Update existing item
        const res = await items.getDataItem(editId, { dataCollectionId: 'RentalItems' });
        await items.updateDataItem({
          dataCollectionId: 'RentalItems',
          dataItem: { ...res, data: { ...res.data, ...data } },
        });
        setAllItems(prev => prev.map(i => i._id === editId ? { ...i, ...data } : i));
      } else {
        // Insert new item
        const res = await items.insertDataItem({
          dataCollectionId: 'RentalItems',
          dataItem: { data },
        });
        const newItem: RentalItem = {
          _id: res.dataItem?.id ?? `temp-${Date.now()}`,
          ...data,
        };
        setAllItems(prev => [...prev, newItem]);
      }

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        closeForm();
      }, 1800);
    } catch (e: any) {
      setSaveError(e?.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(item: RentalItem) {
    setToggling(item._id);
    try {
      const res = await items.getDataItem(item._id, { dataCollectionId: 'RentalItems' });
      const updated = { ...res.data, available: !(item.available !== false) };
      await items.updateDataItem({
        dataCollectionId: 'RentalItems',
        dataItem: { ...res, data: updated },
      });
      setAllItems(prev =>
        prev.map(i => i._id === item._id ? { ...i, available: updated.available } : i)
      );
    } catch (e) {
      console.error('Toggle failed:', e);
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(item: RentalItem) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeleting(item._id);
    try {
      await items.removeDataItem(item._id, { dataCollectionId: 'RentalItems' });
      setAllItems(prev => prev.filter(i => i._id !== item._id));
      dashboard.showToast({
        message: `"${item.name}" has been deleted.`,
        type: 'success',
      });
    } catch (e: any) {
      dashboard.showToast({
        message: e?.message || 'Delete failed. Please try again.',
        type: 'error',
      });
    } finally {
      setDeleting(null);
    }
  }

  // ── Dropdown options ──────────────────────────────────────────

  const filterOptions = [
    { id: 'all', value: 'All Categories' },
    ...CATEGORIES.map(c => ({ id: c, value: c })),
  ];

  // ── Render ────────────────────────────────────────────────────

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <Page>
        <Page.Header
          title="Rental Items"
          subtitle={`${filtered.length} item${filtered.length !== 1 ? 's' : ''} · RentalItems collection`}
          actionsBar={
            <Button onClick={openAddForm}>+ Add Item</Button>
          }
        />

        <Page.Content>

          {/* ── Inline Add / Edit Form ── */}
          {showForm && (
            <div id="rental-admin-form">
              <Box marginBottom="SP6">
                {saved && (
                  <Box marginBottom="SP3">
                    <Notification theme="success" show>
                      <Notification.TextLabel>
                        {editId ? '✓ Item updated successfully!' : '✓ Item added to RentalItems collection!'}
                      </Notification.TextLabel>
                    </Notification>
                  </Box>
                )}
                {saveError && (
                  <Box marginBottom="SP3">
                    <Notification theme="error" show>
                      <Notification.TextLabel>{saveError}</Notification.TextLabel>
                    </Notification>
                  </Box>
                )}

                <Card>
                  <Card.Header
                    title={editId ? `Edit: ${fName || 'Item'}` : 'Add New Rental Item'}
                    suffix={
                      <Box gap="SP2" direction="horizontal">
                        <Button priority="secondary" size="small" onClick={closeForm}>
                          Cancel
                        </Button>
                        <Button size="small" onClick={handleSave} disabled={saving}>
                          {saving ? 'Saving…' : editId ? 'Update Item' : 'Save Item'}
                        </Button>
                      </Box>
                    }
                  />
                  <Card.Content>
                    <Box direction="horizontal" gap="SP6">

                      {/* Left column */}
                      <Box direction="vertical" gap="SP4" style={{ flex: 1 }}>
                        <FormField label="Item Name *">
                          <Input
                            value={fName}
                            onChange={e => setFName(e.target.value)}
                            placeholder="e.g. Gold Arch, Crystal Candelabra"
                          />
                        </FormField>

                        <FormField label="Category">
                          <Dropdown
                            placeholder="Select a category"
                            options={CATEGORIES.map(c => ({ id: c, value: c }))}
                            selectedId={fCategory || undefined}
                            onSelect={o => setFCategory(o.id as string)}
                          />
                        </FormField>

                        <FormField label="Description">
                          <Textarea
                            value={fDesc}
                            onChange={e => setFDesc(e.target.value)}
                            placeholder="Describe the item — dimensions, style, what's included…"
                            rows={4}
                          />
                        </FormField>
                      </Box>

                      {/* Right column */}
                      <Box direction="vertical" gap="SP4" style={{ flex: 1 }}>
                        <FormField label="Price Per Day ($) *">
                          <NumberInput
                            value={fPrice}
                            onChange={val => setFPrice(val || 0)}
                            placeholder="150"
                            min={0}
                          />
                        </FormField>

                        <FormField label="Image URL">
                          <Input
                            value={fImage}
                            onChange={e => setFImage(e.target.value)}
                            placeholder="https://… or wix:image://…"
                          />
                        </FormField>

                        {fImage && (
                          <Box
                            style={{
                              width: '100%',
                              height: 120,
                              borderRadius: 6,
                              overflow: 'hidden',
                              border: '1px solid #e4e4e4',
                            }}
                          >
                            <img
                              src={fImage}
                              alt="Preview"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </Box>
                        )}

                        <Box direction="horizontal" align="center" gap="SP3">
                          <Text>Available for Rental</Text>
                          <Toggle checked={fAvailable} onChange={() => setFAvailable(v => !v)} />
                        </Box>

                        <Box direction="horizontal" align="center" gap="SP3">
                          <Text>Featured Item</Text>
                          <Toggle checked={fFeatured} onChange={() => setFFeatured(v => !v)} />
                        </Box>
                      </Box>

                    </Box>
                  </Card.Content>
                </Card>
              </Box>
            </div>
          )}

          {/* ── Items Table ── */}
          <Card>
            <TableToolbar>
              <TableToolbar.ItemGroup position="start">
                <TableToolbar.Item>
                  <Dropdown
                    placeholder="All Categories"
                    options={filterOptions}
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
              <Box align="center" paddingTop="SP10" paddingBottom="SP10">
                <Loader size="medium" />
              </Box>
            ) : filtered.length === 0 ? (
              <Box
                align="center"
                direction="vertical"
                gap="SP3"
                paddingTop="SP10"
                paddingBottom="SP10"
              >
                <Text secondary>
                  {allItems.length === 0
                    ? 'No items yet. Add your first rental item to get started.'
                    : 'No items match your current filter.'}
                </Text>
                {allItems.length === 0 && (
                  <Button onClick={openAddForm}>+ Add First Item</Button>
                )}
              </Box>
            ) : (
              <Table
                data={filtered}
                columns={[
                  {
                    title: 'Item',
                    render: (item: RentalItem) => (
                      <Box direction="vertical" gap="SP1">
                        <Text weight="bold">{item.name || '—'}</Text>
                        {item.description && (
                          <Text secondary size="small">
                            {item.description.length > 65
                              ? item.description.slice(0, 65) + '…'
                              : item.description}
                          </Text>
                        )}
                      </Box>
                    ),
                  },
                  {
                    title: 'Category',
                    render: (item: RentalItem) =>
                      item.category ? (
                        <Badge skin="neutralLight">{item.category}</Badge>
                      ) : (
                        <Text secondary>—</Text>
                      ),
                  },
                  {
                    title: 'Price/Day',
                    render: (item: RentalItem) => (
                      <Text weight="bold">{formatCurrency(item.pricePerDay)}</Text>
                    ),
                  },
                  {
                    title: 'Featured',
                    render: (item: RentalItem) => (
                      <Badge skin={item.featured ? 'success' : 'neutralLight'}>
                        {item.featured ? 'Yes' : 'No'}
                      </Badge>
                    ),
                  },
                  {
                    title: 'Status',
                    render: (item: RentalItem) => (
                      <Badge skin={item.available !== false ? 'success' : 'neutralLight'}>
                        {item.available !== false ? 'Available' : 'Off'}
                      </Badge>
                    ),
                  },
                  {
                    title: '',
                    width: '180px',
                    render: (item: RentalItem) => (
                      <Box direction="horizontal" gap="SP2">
                        <TextButton onClick={() => openEditForm(item)}>
                          Edit
                        </TextButton>
                        <TextButton
                          disabled={toggling === item._id}
                          onClick={() => toggleAvailability(item)}
                        >
                          {item.available !== false ? 'Disable' : 'Enable'}
                        </TextButton>
                        <TextButton
                          skin="destructive"
                          disabled={deleting === item._id}
                          onClick={() => handleDelete(item)}
                        >
                          Delete
                        </TextButton>
                      </Box>
                    ),
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

export default RentalAdminPage;
