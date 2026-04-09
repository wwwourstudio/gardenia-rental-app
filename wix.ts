const WIX_API_KEY = process.env.WIX_API_KEY!;
const WIX_SITE_ID = process.env.WIX_SITE_ID!;
const BASE = 'https://www.wixapis.com/wix-data/v2/items';

export async function wixQuery(collectionId: string, filter?: object, sort?: object) {
  const body: any = { dataCollectionId: collectionId, query: {} };
  if (filter) body.query.filter = filter;
  if (sort) body.query.sort = sort;

  const res = await fetch(`${BASE}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: WIX_API_KEY,
      'wix-site-id': WIX_SITE_ID,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return (data.dataItems || []).map((i: any) => ({ id: i.id, ...i.data }));
}

export async function wixInsert(collectionId: string, data: object) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: WIX_API_KEY,
      'wix-site-id': WIX_SITE_ID,
    },
    body: JSON.stringify({ dataCollectionId: collectionId, dataItem: { data } }),
  });
  return res.json();
}

export async function wixUpdate(collectionId: string, id: string, data: object) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: WIX_API_KEY,
      'wix-site-id': WIX_SITE_ID,
    },
    body: JSON.stringify({ dataCollectionId: collectionId, dataItem: { id, data } }),
  });
  return res.json();
}

export async function wixGet(collectionId: string, id: string) {
  const res = await fetch(`${BASE}/${id}?dataCollectionId=${collectionId}`, {
    headers: {
      Authorization: WIX_API_KEY,
      'wix-site-id': WIX_SITE_ID,
    },
  });
  const data = await res.json();
  return data.dataItem ? { id: data.dataItem.id, ...data.dataItem.data } : null;
}
