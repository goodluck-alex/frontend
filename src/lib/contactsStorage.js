/** Local contact book matched against GTN (same list used by Dial, Chat, Rooms, Settings). */

const KEY = "gtn_dial_contacts_v1";

function phoneKey(p) {
  return String(p || "").replace(/\s/g, "").toLowerCase();
}

export function loadContactsMeta() {
  if (typeof window === "undefined") return { items: [], updatedAt: null };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { items: [], updatedAt: null };
    const data = JSON.parse(raw);
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      updatedAt: typeof data?.updatedAt === "number" ? data.updatedAt : null,
    };
  } catch {
    return { items: [], updatedAt: null };
  }
}

export function saveContacts(items) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ items, updatedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

/**
 * Merge POST /users/contacts/match result into storage.
 * @param {Array<{id:number,name?:string,phone:string}>} onGtnUsers
 * @param {Array<{phone:string,name?:string}>} notOnGtnEntries
 */
export function mergeMatchIntoStore(onGtnUsers, notOnGtnEntries) {
  const { items: existing } = loadContactsMeta();
  const byPhone = new Map(existing.map((x) => [phoneKey(x.phone), { ...x }]));

  for (const u of onGtnUsers || []) {
    if (!u?.phone) continue;
    const k = phoneKey(u.phone);
    const prev = byPhone.get(k) || {};
    byPhone.set(k, {
      phone: u.phone,
      name: u.name || prev.name || "",
      onGtn: true,
      dbUserId: u.id,
    });
  }

  for (const x of notOnGtnEntries || []) {
    if (!x?.phone) continue;
    const k = phoneKey(x.phone);
    const prev = byPhone.get(k);
    if (prev?.onGtn) continue;
    byPhone.set(k, {
      phone: x.phone,
      name: x.name || prev?.name || "",
      onGtn: false,
      dbUserId: null,
    });
  }

  const sorted = [...byPhone.values()].sort((a, b) => {
    if (a.onGtn !== b.onGtn) return a.onGtn ? -1 : 1;
    return (a.name || a.phone).localeCompare(b.name || b.phone, undefined, { sensitivity: "base" });
  });
  saveContacts(sorted);
}
