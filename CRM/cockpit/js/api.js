// api.js — thin wrapper around fetch
const API = {
  base: '/api',

  async get(path) {
    const res = await fetch(this.base + path);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async put(path, body) {
    const res = await fetch(this.base + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
