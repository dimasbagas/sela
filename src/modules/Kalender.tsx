import { useEffect, useMemo, useState } from "react";
import { load, save } from "../lib/store";
import { BULAN, HARI_SINGKAT_SENIN, dateKey } from "../lib/format";
import {
  CREDS_KEY,
  authUrl,
  disconnectGoogle,
  exchangeCode,
  googleGet,
  isGoogleConnected,
  type GoogleCreds,
} from "../lib/google";
import { openUrl } from "@tauri-apps/plugin-opener";

interface CalEvent {
  id: string;
  text: string;
}
type Events = Record<string, CalEvent[]>;

interface GoogleEvent {
  id: string;
  summary: string;
  time: string; // jam HH:MM atau "Seharian"
}

const KEY = "sela.events";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/tasks",
];

interface CalListResp {
  items?: {
    id?: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
  }[];
}

export default function Kalender() {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState(dateKey(today));
  const [events, setEvents] = useState<Events>(() => load<Events>(KEY, {}));
  const [draft, setDraft] = useState("");

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Senin = 0
  const cells: (Date | null)[] = useMemo(() => {
    const arr: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(view.y, view.m, d));
    return arr;
  }, [view.y, view.m, firstDow, daysInMonth]);

  function shift(delta: number) {
    setView((v) => {
      const m = v.m + delta;
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  }

  function addEvent(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const ev = { id: `${Date.now()}`, text };
    const next = { ...events, [selected]: [...(events[selected] ?? []), ev] };
    setEvents(next);
    save(KEY, next);
    setDraft("");
  }

  function delEvent(id: string) {
    const next = {
      ...events,
      [selected]: (events[selected] ?? []).filter((x) => x.id !== id),
    };
    setEvents(next);
    save(KEY, next);
  }

  const selDate = new Date(`${selected}T12:00:00`);
  const selEvents = events[selected] ?? [];
  const todayKey = dateKey(today);

  // ---- Google Calendar ----
  const [creds, setCreds] = useState<GoogleCreds>(() =>
    load<GoogleCreds>(CREDS_KEY, { clientId: "", clientSecret: "" }),
  );
  const [code, setCode] = useState("");
  const [showGoogle, setShowGoogle] = useState(false);
  const [connected, setConnected] = useState(() => isGoogleConnected());
  const [gEvents, setGEvents] = useState<Record<string, GoogleEvent[]>>({});
  const [gBusy, setGBusy] = useState(false);
  const [gErr, setGErr] = useState("");

  async function fetchGoogleEvents(y: number, m: number) {
    if (!isGoogleConnected()) return;
    setGBusy(true);
    setGErr("");
    try {
      const start = new Date(y, m, 1).toISOString();
      const end = new Date(y, m + 1, 1).toISOString();
      const url =
        `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
        `?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}` +
        `&singleEvents=true&orderBy=startTime&maxResults=100`;
      const data = await googleGet<CalListResp>(url);
      const map: Record<string, GoogleEvent[]> = {};
      for (const it of data.items ?? []) {
        const dt = it.start?.dateTime;
        const d = it.start?.date;
        if (dt) {
          const key = dt.slice(0, 10);
          const time = dt.slice(11, 16);
          (map[key] ??= []).push({
            id: it.id ?? `${key}-${time}`,
            summary: it.summary ?? "(tanpa judul)",
            time,
          });
        } else if (d) {
          (map[d] ??= []).push({
            id: it.id ?? d,
            summary: it.summary ?? "(tanpa judul)",
            time: "Seharian",
          });
        }
      }
      setGEvents(map);
    } catch (e) {
      setGErr(`Tidak bisa mengambil acara Google: ${String(e)}`);
    } finally {
      setGBusy(false);
    }
  }

  useEffect(() => {
    if (connected) void fetchGoogleEvents(view.y, view.m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, view.y, view.m]);

  function saveCreds(next: GoogleCreds) {
    setCreds(next);
    save(CREDS_KEY, next);
  }

  async function connect() {
    if (!creds.clientId.trim() || !creds.clientSecret.trim()) {
      setGErr("Isi dulu Client ID dan Client Secret Google.");
      return;
    }
    setGErr("");
    try {
      await openUrl(authUrl(creds, SCOPES));
    } catch {
      window.open(authUrl(creds, SCOPES), "_blank");
    }
    setShowGoogle(true);
  }

  async function submitCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!code.trim()) return;
    setGBusy(true);
    setGErr("");
    try {
      await exchangeCode(creds, code);
      setConnected(true);
      setCode("");
      setShowGoogle(false);
      await fetchGoogleEvents(view.y, view.m);
    } catch (err) {
      setGErr(`Gagal menukar kode: ${String(err)}`);
    } finally {
      setGBusy(false);
    }
  }

  async function disconnect() {
    await disconnectGoogle();
    setConnected(false);
    setGEvents({});
  }

  const selGoogle = gEvents[selected] ?? [];

  return (
    <div>
      <h2>Kalender</h2>
      <p className="sub">Klik tanggal untuk melihat / menambah acara.</p>

      <div className="card">
        <div className="row">
          <div className="grow">
            <div className="card-title">Google Calendar</div>
            <div className="list-sub">
              {connected
                ? "Terhubung — acara Google ditandai hijau."
                : "Sinkron acara dari kalender utamamu (butuh OAuth Google)."}
            </div>
          </div>
          {connected ? (
            <>
              <button
                className="btn-ghost btn-mini"
                onClick={() => void fetchGoogleEvents(view.y, view.m)}
                disabled={gBusy}
              >
                Muat ulang
              </button>
              <button
                className="btn-ghost btn-mini"
                onClick={() => void disconnect()}
              >
                Putuskan
              </button>
            </>
          ) : (
            <button
              className="btn-ghost btn-mini"
              onClick={() => setShowGoogle(!showGoogle)}
            >
              {showGoogle ? "Tutup" : "Atur"}
            </button>
          )}
        </div>
        {!connected && showGoogle && (
          <div style={{ marginTop: 10 }}>
            <p className="muted" style={{ fontSize: 12, margin: "0 0 8px" }}>
              Buat OAuth Client ID (Desktop app) di{" "}
              <span className="mono">console.cloud.google.com → APIs &amp; Services → Credentials</span>,
              aktifkan Google Calendar API + Google Tasks API, lalu tempel di
              sini. Kredensial hanya tersimpan lokal. Saat login Google, pakai
              redirect <span className="mono">http://localhost</span> — salin
              kode <span className="mono">code=…</span> dari address bar
              browser lalu tempel di bawah.
            </p>
            <input
              type="text"
              placeholder="Client ID"
              value={creds.clientId}
              onChange={(e) => saveCreds({ ...creds, clientId: e.target.value })}
              style={{ width: "100%", marginBottom: 6 }}
            />
            <input
              type="password"
              placeholder="Client Secret"
              value={creds.clientSecret}
              onChange={(e) => saveCreds({ ...creds, clientSecret: e.target.value })}
              style={{ width: "100%", marginBottom: 8 }}
            />
            <div className="row">
              <button className="btn" onClick={() => void connect()}>
                Hubungkan Google
              </button>
            </div>
            <form className="row" onSubmit={submitCode} style={{ marginTop: 8 }}>
              <input
                className="grow"
                type="text"
                placeholder="Tempel authorization code…"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button className="btn" type="submit" disabled={gBusy || !code.trim()}>
                Tukar kode
              </button>
            </form>
          </div>
        )}
        {gErr && (
          <div className="err" style={{ marginTop: 10, marginBottom: 0 }}>
            {gErr}
          </div>
        )}
      </div>

      <div className="cal-head">
        <button className="btn-ghost btn-mini" onClick={() => shift(-1)}>
          ‹ Sebelumnya
        </button>
        <span className="cal-title">
          {BULAN[view.m]} {view.y}
        </span>
        <button className="btn-ghost btn-mini" onClick={() => shift(1)}>
          Berikutnya ›
        </button>
      </div>

      <div className="cal-grid">
        {HARI_SINGKAT_SENIN.map((d) => (
          <div className="cal-dow" key={d}>
            {d}
          </div>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <div key={`b${i}`} />
          ) : (
            <button
              key={dateKey(d)}
              className={[
                "cal-day",
                dateKey(d) === todayKey ? "today" : "",
                dateKey(d) === selected ? "selected" : "",
              ]
                .join(" ")
                .trim()}
              onClick={() => setSelected(dateKey(d))}
            >
              {d.getDate()}
              {(events[dateKey(d)] ?? []).length > 0 && <span className="cal-dot" />}
              {(gEvents[dateKey(d)] ?? []).length > 0 && (
                <span className="cal-dot google" />
              )}
            </button>
          ),
        )}
      </div>

      <div className="divider" />
      <div className="card-title" style={{ marginBottom: 6 }}>
        {selDate.getDate()} {BULAN[selDate.getMonth()]} {selDate.getFullYear()}
      </div>
      {selGoogle.map((ev) => (
        <div className="list-row" key={`g-${ev.id}`}>
          <div className="list-main">
            <div className="list-title">
              {ev.time !== "Seharian" && <span className="mono">{ev.time} </span>}
              {ev.summary}
            </div>
            <div className="list-sub">
              {ev.time === "Seharian" ? "Seharian" : "Dari Google Calendar"}
            </div>
          </div>
          <span className="badge green">Google</span>
        </div>
      ))}
      {selEvents.length === 0 && selGoogle.length === 0 ? (
        <p className="muted" style={{ fontSize: 13, margin: "4px 0 10px" }}>
          Belum ada acara di tanggal ini.
        </p>
      ) : (
        selEvents.map((ev) => (
          <div className="list-row" key={ev.id}>
            <div className="list-main">
              <div className="list-title">{ev.text}</div>
            </div>
            <button
              className="btn-ghost btn-mini"
              onClick={() => delEvent(ev.id)}
              aria-label="Hapus acara"
            >
              Hapus
            </button>
          </div>
        ))
      )}
      <form className="row" onSubmit={addEvent} style={{ marginTop: 8 }}>
        <input
          className="grow"
          type="text"
          placeholder="Tambah acara…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn" type="submit">
          Tambah
        </button>
      </form>
    </div>
  );
}
