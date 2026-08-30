/** Thin fetch wrapper around the portal API. Session lives in an httpOnly cookie. */

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const error = new Error(data?.error || `Request failed (${res.status}).`);
    error.status = res.status;
    throw error;
  }
  return data;
}

const crud = (resource) => ({
  list: () => request(`/${resource}`),
  create: (body) => request(`/${resource}`, { method: 'POST', body }),
  update: (id, body) => request(`/${resource}/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/${resource}/${id}`, { method: 'DELETE' }),
});

export const api = {
  session: () => request('/auth/session'),
  loginAdmin: (username, password) =>
    request('/auth/login', { method: 'POST', body: { username, password } }),
  loginViewer: () => request('/auth/viewer', { method: 'POST' }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  bootstrap: () => request('/bootstrap'),

  merchants: {
    ...crud('merchants'),
    list: (archived = false) => request(`/merchants?archived=${archived}`),
  },
  newsletters: crud('newsletters'),
  launches: crud('launches'),
  updates: crud('updates'),
  redeemers: crud('redeemers'),

  saveKpis: (body) => request('/kpis', { method: 'PUT', body }),
  saveSpotlight: (body) => request('/spotlight', { method: 'PUT', body }),
  saveAccommodation: (body) => request('/accommodation', { method: 'PUT', body }),
  saveSetting: (key, value) => request(`/settings/${key}`, { method: 'PUT', body: { value } }),

  upload: (dataUri) => request('/uploads', { method: 'POST', body: { data: dataUri } }),
};
