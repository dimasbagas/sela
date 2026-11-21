import { useEffect, useState } from "react";
import { load, save } from "../lib/store";

interface Zone {
  id: string;
  label: string;
  tz: string;
}

const KEY = "sela.worldclock";
const DEFAULT_ZONES: Zone[] = [
  { id: "jakarta", label: "Jakarta", tz: "Asia/Jakarta" },
  { id: "london", label: "London", tz: "Europe/London" },
  { id: "tokyo", label: "Tokyo", tz: "Asia/Tokyo" },
];

const PRESETS: { label: string; tz: string }[] = [
  { label: "Jakarta", tz: "Asia/Jakarta" },
  { label: "Singapura", tz: "Asia/Singapore" },
  { label: "Tokyo", tz: "Asia/Tokyo" },
  { label: "Sydney", tz: "Australia/Sydney" },
  { label: "London", tz: "Europe/London" },
  { label: "Paris", tz: "Europe/Paris" },
  { label: "New York", tz: "America/New_York" },
  { label: "Los Angeles", tz: "America/Los_Angeles" },
  { label: "Dubai", tz: "Asia/Dubai" },
  { label: "Seoul", tz: "Asia/Seoul" },
  { label: "Makkah", tz: "Asia/Riyadh" },
  { label: "UTC", tz: "UTC" },
];

function fmtTime(d: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: tz,
    }).format(d);
  } catch {
    return "--:--:--";
  }
}

function fmtDate(d: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: tz,
    }).format(d);
  } catch {
    return "";
  }
}

export default function WorldClock() {
  const [zones, setZones] = useState<Zone[]>(() =>
    load<Zone[]>(KEY, DEFAULT_ZONES),
  );
  const [pick, setPick] = useState(PRESETS[1].tz);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  function update(next: Zone[]) {
    setZones(next);
    save(KEY, next);
  }

  function add() {
    const p = PRESETS.find((x) => x.tz === pick);
    if (!p || zones.some((z) => z.tz === p.tz)) return;
    update([...zones, { id: `${Date.now()}`, label: p.label, tz: p.tz }]);
  }

  function remove(id: string) {
    update(zones.filter((z) => z.id !== id));
  }

  return (
    <div>
      <h2>Jam Dunia</h2>
      <p className="sub">Jam live di beberapa zona waktu.</p>

      {zones.map((z) => (
        <div className="card" key={z.id}>
          <div className="row">
            <div className="grow">
              <div className="card-title">{z.label}</div>
              <div className="list-sub">{fmtDate(now, z.tz)}</div>
            </div>
            <span className="mono" style={{ fontSize: 22, fontWeight: 600 }}>
              {fmtTime(now, z.tz)}
            </span>
            <button
              className="btn-ghost btn-mini"
              onClick={() => remove(z.id)}
              aria-label={`Hapus ${z.label}`}
            >
              Hapus
            </button>
          </div>
        </div>
      ))}

      <div className="row">
        <select
          className="grow"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
        >
          {PRESETS.map((p) => (
            <option key={p.tz} value={p.tz}>
              {p.label}
            </option>
          ))}
        </select>
        <button className="btn" onClick={add}>
          Tambah zona
        </button>
      </div>
    </div>
  );
}
