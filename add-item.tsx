import type { FC } from 'react';
import { useState, useEffect } from 'react';
import {
  Page, WixDesignSystemProvider, Box, Card, Text, Button,
  FormField, Input, NumberInput, Textarea, Toggle, Loader,
  Notification,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { items } from '@wix/data';
import { dashboard } from '@wix/dashboard';
import type { RentalItem } from '../../../../components/shared';

const AddItemPage: FC = () => {
  // Check if editing existing item via URL param
  const editId = new URLSearchParams(window.location.search).get('editId') || '';
  const isEditing = !!editId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [imgPreview, setImgPreview] = useState('');

  // Form state
  const [title, setTitle]         = useState('');
  const [category, setCategory]   = useState('');
  const [price, setPrice]         = useState<number>(0);
  const [deposit, setDeposit]     = useState<number>(0);
  const [quantity, setQuantity]   = useState<number>(1);
  const [minDays, setMinDays]     = useState<number>(1);
  const [maxDays, setMaxDays]     = useState<number>(0);
  const [description, setDesc]    = useState('');
  const [image, setImage]         = useState('');
  const [images, setImages]       = useState('');
  const [notes, setNotes]         = useState('');
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (isEditing) loadItem();
  }, []);

  async function loadItem() {
    try {
      const res = await items.getDataItem(editId, { dataCollectionId: 'RentalCatalog' });
      const d = res.data as RentalItem;
      setTitle(d.title || '');
      setCategory(d.category || '');
      setPrice(d.pricePerDay || 0);
      setDeposit(d.depositAmount || 0);
      setQuantity(d.quantity || 1);
      setMinDays(d.minDays || 1);
      setMaxDays(d.maxDays || 0);
      setDesc(d.description || '');
      setImage(d.image || '');
      setImages(d.images || '');
      setNotes(d.notes || '');
      setAvailable(d.available !== false);
      if (d.image) setImgPreview(d.image);
    } catch (e) {
      setError('Could not load item');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) { setError('Item name is required'); return; }
    if (!price) { setError('Price per day is required'); return; }
    setError('');
    setSaving(true);

    const data: Partial<RentalItem> = {
      title: title.trim(),
      category: category.trim(),
      pricePerDay: price,
      depositAmount: deposit,
      quantity: quantity || 1,
      minDays: minDays || 1,
      maxDays: maxDays || undefined,
      description: description.trim(),
      image: image.trim(),
      images: images.trim(),
      notes: notes.trim(),
      available,
    };

    try {
      if (isEditing) {
        const res = await items.getDataItem(editId, { dataCollectionId: 'RentalCatalog' });
        await items.updateDataItem({
          dataCollectionId: 'RentalCatalog',
          dataItem: { ...res, data: { ...res.data, ...data } },
        });
      } else {
        await items.insertDataItem({
          dataCollectionId: 'RentalCatalog',
          dataItem: { data },
        });
        // Reset form for new item
        setTitle(''); setCategory(''); setPrice(0); setDeposit(0);
        setQuantity(1); setMinDays(1); setMaxDays(0);
        setDesc(''); setImage(''); setImages(''); setNotes('');
        setAvailable(true); setImgPreview('');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <WixDesignSystemProvider features={{ newColorsBranding: true }}>
        <Page><Page.Header title="Loading…" /><Page.Content><Box align="center" paddingTop="SP10"><Loader /></Box></Page.Content></Page>
      </WixDesignSystemProvider>
    );
  }

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <Page>
        <Page.Header
          title={isEditing ? `Edit: ${title}` : 'Add Rental Item'}
          subtitle={isEditing ? 'Update item details' : 'Fill in details — a Wix Booking service is created automatically on save'}
          actionsBar={
            <Box gap="SP2">
              <Button priority="secondary" onClick={() => dashboard.navigate({ pageId: 'rental-inventory' })}>
                ← Back to Inventory
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : isEditing ? 'Update Item' : 'Save Item'}
              </Button>
            </Box>
          }
        />
        <Page.Content>
          {saved && (
            <Notification theme="success" show>
              <Notification.TextLabel>
                {isEditing ? '✓ Item updated!' : '✓ Item added! Wix Booking service being created automatically…'}
              </Notification.TextLabel>
            </Notification>
          )}
          {error && (
            <Notification theme="error" show>
              <Notification.TextLabel>{error}</Notification.TextLabel>
            </Notification>
          )}

          <Card>
            <Card.Header title="Item Details" />
            <Card.Content>
              <Box direction="horizontal" gap="SP4">
                <Box direction="vertical" gap="SP4" style={{ flex: 1 }}>
                  <FormField label="Item Name *">
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Gold Arch, Crystal Candelabra" />
                  </FormField>
                  <FormField label="Category *">
                    <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Arches, Lighting, Furniture, Tables…" />
                  </FormField>
                  <FormField label="Description">
                    <Textarea
                      value={description}
                      onChange={e => setDesc(e.target.value)}
                      placeholder="Describe the item — dimensions, style, what's included…"
                      rows={4}
                    />
                  </FormField>
                  <FormField label="Internal Notes">
                    <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Storage location, fragile, setup requirements…" />
                  </FormField>
                </Box>

                <Box direction="vertical" gap="SP4" style={{ flex: 1 }}>
                  <Box direction="horizontal" gap="SP3">
                    <FormField label="Price Per Day ($) *" style={{ flex: 1 }}>
                      <NumberInput value={price} onChange={val => setPrice(val || 0)} placeholder="150" min={0} />
                    </FormField>
                    <FormField label="Deposit Amount ($)" style={{ flex: 1 }}>
                      <NumberInput value={deposit} onChange={val => setDeposit(val || 0)} placeholder="50" min={0} />
                    </FormField>
                  </Box>
                  <Box direction="horizontal" gap="SP3">
                    <FormField label="Quantity Available" style={{ flex: 1 }}>
                      <NumberInput value={quantity} onChange={val => setQuantity(val || 1)} min={1} />
                    </FormField>
                    <FormField label="Min Rental Days" style={{ flex: 1 }}>
                      <NumberInput value={minDays} onChange={val => setMinDays(val || 1)} min={1} />
                    </FormField>
                    <FormField label="Max Rental Days" style={{ flex: 1 }}>
                      <NumberInput value={maxDays} onChange={val => setMaxDays(val || 0)} min={0} placeholder="No limit" />
                    </FormField>
                  </Box>
                  <FormField label="Main Image URL">
                    <Input
                      value={image}
                      onChange={e => { setImage(e.target.value); setImgPreview(e.target.value); }}
                      placeholder="https://…"
                    />
                  </FormField>
                  {imgPreview && (
                    <Box style={{ width: '100%', height: '140px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e4e4e4' }}>
                      <img src={imgPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgPreview('')} />
                    </Box>
                  )}
                  <FormField label="Additional Images (comma-separated URLs)">
                    <Textarea value={images} onChange={e => setImages(e.target.value)} placeholder="https://…, https://…" rows={2} />
                  </FormField>
                  <Box direction="horizontal" align="center" gap="SP3">
                    <Text>Available for Rental</Text>
                    <Toggle checked={available} onChange={() => setAvailable(v => !v)} />
                  </Box>
                </Box>
              </Box>
            </Card.Content>
          </Card>

          <Box marginTop="SP4">
            <Button onClick={handleSave} disabled={saving} size="large">
              {saving ? 'Saving…' : isEditing ? 'Update Item' : 'Save Item'}
            </Button>
          </Box>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
};

export default AddItemPage;
