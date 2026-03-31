/** Contact Picker API (Chrome/Android) — user selects contacts; no silent full-device read on web. */

export function canUseContactPicker() {
  return (
    typeof navigator !== "undefined" &&
    navigator.contacts &&
    typeof navigator.contacts.select === "function"
  );
}

/** Picker returns entries with name[] and tel[] */
export function flattenPickerContacts(contacts) {
  const out = [];
  for (const c of contacts || []) {
    const nameArr = c.name || [];
    const name = (nameArr[0] || "").trim() || "Contact";
    const tels = c.tel || [];
    for (const tel of tels) {
      out.push({ name, phone: String(tel).trim() });
    }
  }
  return out;
}
