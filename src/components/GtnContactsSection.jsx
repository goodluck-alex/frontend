"use client";

import { useMemo, useState } from "react";
import { IoCallOutline, IoChatbubblesOutline, IoSearchOutline, IoSyncOutline } from "react-icons/io5";
import ReferralInviteShare from "@/components/ReferralInviteShare";
import { useContacts } from "@/contexts/contactsContext";

function avatarLetter(name, phone) {
  const s = (name || phone || "?").trim();
  return s.slice(0, 1).toUpperCase();
}

/**
 * Minimal contacts list (WhatsApp-style): search + sync icons only; rows use call / chat / invite icons.
 */
export default function GtnContactsSection({ user, onNavigateTab }) {
  const { contacts, syncing, error, setError, syncFromDevice } = useContacts();
  const [search, setSearch] = useState("");

  const refCode = user?.referralCode ?? user?.subscriberId;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/\s/g, "");
    const onGtn = contacts.filter((c) => c.onGtn);
    const offGtn = contacts.filter((c) => !c.onGtn);
    const ordered = [...onGtn, ...offGtn];
    if (!q) return ordered;
    return ordered.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const phone = (c.phone || "").replace(/\s/g, "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [contacts, search]);

  const errMsg =
    error === "picker_unavailable"
      ? "Contact picker unavailable"
      : error === "permission_denied" || error === "NotAllowedError"
        ? "Permission denied"
        : error === "no_contacts_selected"
          ? "No selection"
          : error === "sign_in_required"
            ? "Sign in required"
            : error
              ? String(error)
              : "";

  return (
    <div className="gtn-settings-panel phone-panel-scroll gtn-contacts-wa">
      <span className="sr-only" role="status">
        {syncing ? "Syncing" : ""}
      </span>
      {errMsg ? (
        <span className="sr-only" role="alert">
          {errMsg}
        </span>
      ) : null}

      <div className="gtn-contacts-wa-toolbar">
        <button
          type="button"
          className="gtn-contacts-wa-toolbtn"
          onClick={() => {
            setError("");
            void syncFromDevice();
          }}
          disabled={syncing || !user?.dbId}
          aria-label="Sync contacts from device"
        >
          {syncing ? <span className="gtn-contacts-wa-spin" aria-hidden /> : <IoSyncOutline size={22} aria-hidden />}
        </button>
        <label className="gtn-contacts-wa-search">
          <IoSearchOutline className="gtn-contacts-wa-search-ico" aria-hidden />
          <input
            type="search"
            inputMode="search"
            className="gtn-contacts-wa-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search"
          />
        </label>
      </div>

      {filtered.length === 0 ? null : (
        <ul className="gtn-contacts-wa-list" aria-label="Contacts">
          {filtered.map((c) => (
            <li key={c.phone} className="gtn-contacts-wa-row">
              <div className="gtn-contacts-wa-avatar" aria-hidden>
                {avatarLetter(c.name, c.phone)}
              </div>
              <div className="gtn-contacts-wa-text">
                <div className="gtn-contacts-wa-name">{c.name || c.phone}</div>
                {c.name ? <div className="gtn-contacts-wa-sub">{c.phone}</div> : null}
              </div>
              <div className="gtn-contacts-wa-actions">
                {c.onGtn ? (
                  <>
                    <button
                      type="button"
                      className="gtn-contacts-wa-iconbtn"
                      aria-label="Call"
                      onClick={() => {
                        onNavigateTab?.("dial");
                        window.setTimeout(() => {
                          window.dispatchEvent(new CustomEvent("gtn-dial-set-number", { detail: { phone: c.phone } }));
                        }, 80);
                      }}
                    >
                      <IoCallOutline size={20} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="gtn-contacts-wa-iconbtn"
                      aria-label="Chat"
                      onClick={() => {
                        onNavigateTab?.("messages");
                        window.setTimeout(() => {
                          window.dispatchEvent(
                            new CustomEvent("gtn-messages-open-peer", {
                              detail: { peerId: String(c.dbUserId), name: c.name },
                            })
                          );
                        }, 80);
                      }}
                    >
                      <IoChatbubblesOutline size={20} aria-hidden />
                    </button>
                  </>
                ) : refCode != null && String(refCode).trim() !== "" ? (
                  <ReferralInviteShare
                    refCode={refCode}
                    source="settings_contacts"
                    meta="wa_row"
                    layout="inviteIcon"
                    className="gtn-contacts-wa-iconbtn gtn-contacts-wa-invite"
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
