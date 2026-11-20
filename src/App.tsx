import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { nowPlaying, setNotchOpen, type NowPlaying } from "./lib/api";
import { jamMenitDetik, tanggalSingkat } from "./lib/format";
import Musik from "./modules/Musik";
import Kalender from "./modules/Kalender";
import Todo from "./modules/Todo";
import Pomodoro from "./modules/Pomodoro";
import Cuaca from "./modules/Cuaca";
import Kurs from "./modules/Kurs";
import Sholat from "./modules/Sholat";
import Lirik from "./modules/Lirik";

export type TabId =
  | "musik"
  | "kalender"
  | "todo"
  | "pomodoro"
  | "cuaca"
  | "kurs"
  | "sholat"
  | "lirik";

export interface LyricQuery {
  track: string;
  artist: string;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "musik", label: "Musik" },
  { id: "kalender", label: "Kalender" },
  { id: "todo", label: "Todo" },
  { id: "pomodoro", label: "Pomodoro" },
  { id: "cuaca", label: "Cuaca" },
  { id: "kurs", label: "Kurs" },
  { id: "sholat", label: "Sholat" },
  { id: "lirik", label: "Lirik" },
];

export default function App() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("musik");
  const [now, setNow] = useState(() => new Date());
  const [np, setNp] = useState<NowPlaying | null>(null);
  const [lyricQuery, setLyricQuery] = useState<LyricQuery | null>(null);

  // Jam live, tiap detik.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Info lagu, tiap 5 detik.
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      const r = await nowPlaying();
      if (!stop) setNp(r);
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  // Esc -> kecilkan.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sinkron ukuran jendela dengan status buka/tutup.
  useEffect(() => {
    setNotchOpen(open);
  }, [open ]);

  const bukaLirik = useCallback((q: LyricQuery) => {
    setLyricQuery(q);
    setTab("lirik");
  }, []);

  if (!open) {
    return (
      <div
        className="pill"
        data-tauri-drag-region
        onClick={() => setOpen(true)}
        role="button"
        aria-label="Buka Sela"
      >
        <span className="pill-clock">{jamMenitDetik(now)}</span>
        <span className="pill-date">{tanggalSingkat(now)}</span>
        <span className="pill-sep" />
        <span className="pill-music">
          {np ? `${np.title} — ${np.artist || "?"}` : "Tidak ada musik"}
        </span>
        <span
          className="pill-dot"
          style={{
            background:
              np && np.status === "Playing" ? "var(--accent)" : "var(--muted)",
          }}
        />
      </div>
    );
  }

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          <div className="wordmark">Sela</div>
          <div className="wordmark-sub">notch kamu</div>
        </div>
        <button
          className="icon-btn"
          onClick={() => setOpen(false)}
          aria-label="Kecilkan"
          title="Kecilkan (Esc)"
        >
          ×
        </button>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "tab active" : "tab"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === "musik" && <Musik np={np} onLyrics={bukaLirik} />}
        {tab === "kalender" && <Kalender />}
        {tab === "todo" && <Todo />}
        {tab === "pomodoro" && <Pomodoro />}
        {tab === "cuaca" && <Cuaca />}
        {tab === "kurs" && <Kurs />}
        {tab === "sholat" && <Sholat />}
        {tab === "lirik" && <Lirik np={np} query={lyricQuery} />}
      </main>

      <footer className="foot">Esc mengecilkan · Sela v0.1.0 prototipe</footer>
    </div>
  );
}
