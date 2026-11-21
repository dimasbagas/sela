import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import "./App.css";
import {
  listRemovable,
  mediaControl,
  nowPlaying,
  setNotchOpen,
  type NowPlaying,
  type Removable,
} from "./lib/api";
import { load, save } from "./lib/store";
import { cuacaText, dateKey, jamMenit } from "./lib/format";
import { isGoogleConnected } from "./lib/google";
import {
  CatPeek,
  IAiChat,
  ICuaca,
  IDaya,
  IFile,
  IGear,
  IHome,
  IHud,
  IJamDunia,
  IKalender,
  IKurs,
  ILirik,
  IMusicNote,
  IPomodoro,
  ISehat,
  ISholat,
  IShrink,
  ITeleprompter,
  ITerjemah,
  ITodo,
  IWifi,
  IX,
} from "./lib/icons";
import Musik from "./modules/Musik";
import Kalender from "./modules/Kalender";
import Todo from "./modules/Todo";
import Pomodoro from "./modules/Pomodoro";
import Cuaca from "./modules/Cuaca";
import Kurs from "./modules/Kurs";
import Sholat from "./modules/Sholat";
import Lirik from "./modules/Lirik";
import WorldClock from "./modules/WorldClock";
import Terjemah from "./modules/Terjemah";
import Sehat, {
  DEFAULT_HEALTH,
  HEALTH_KEY,
  REMINDER_TEXT,
  healthDue,
  markReminderDone,
  type HealthSettings,
  type ReminderKind,
} from "./modules/Sehat";
import Teleprompter from "./modules/Teleprompter";
import FileShelf from "./modules/FileShelf";
import HUD from "./modules/HUD";
import Shrink from "./modules/Shrink";
import Daya from "./modules/Daya";
import AiChat from "./modules/AiChat";
import Wifi from "./modules/Wifi";
import KaraokeWindow from "./windows/KaraokeWindow";
import { DockClock, DockWeather } from "./windows/DockWidgets";
import { openDockWindow } from "./lib/windows";

export type TabId =
  | "musik"
  | "kalender"
  | "todo"
  | "pomodoro"
  | "cuaca"
  | "kurs"
  | "sholat"
  | "lirik"
  | "jamdunia"
  | "terjemah"
  | "sehat"
  | "teleprompter"
  | "file"
  | "hud"
  | "shrink"
  | "daya"
  | "aichat"
  | "wifi";

export interface LyricQuery {
  track: string;
  artist: string;
}

type View = "home" | TabId | "pengaturan";

const TABS: { id: TabId; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: "musik", label: "Musik", icon: ILirik },
  { id: "kalender", label: "Kalender", icon: IKalender },
  { id: "todo", label: "Todo", icon: ITodo },
  { id: "pomodoro", label: "Pomodoro", icon: IPomodoro },
  { id: "cuaca", label: "Cuaca", icon: ICuaca },
  { id: "kurs", label: "Kurs", icon: IKurs },
  { id: "sholat", label: "Sholat", icon: ISholat },
  { id: "lirik", label: "Lirik", icon: ILirik },
  { id: "jamdunia", label: "Jam Dunia", icon: IJamDunia },
  { id: "terjemah", label: "Terjemah", icon: ITerjemah },
  { id: "sehat", label: "Sehat", icon: ISehat },
  { id: "teleprompter", label: "Teleprompter", icon: ITeleprompter },
  { id: "file", label: "File", icon: IFile },
  { id: "hud", label: "HUD", icon: IHud },
  { id: "shrink", label: "Perkecil", icon: IShrink },
  { id: "daya", label: "Daya", icon: IDaya },
  { id: "aichat", label: "AI Chat", icon: IAiChat },
  { id: "wifi", label: "Wi-Fi", icon: IWifi },
];

/** Modul yang butuh strip tinggi (268px), sisanya 196px. */
const TALL_TABS = new Set<TabId>([
  "kalender",
  "lirik",
  "teleprompter",
  "aichat",
  "shrink",
  "cuaca",
  "kurs",
  "sholat",
  "jamdunia",
  "todo",
  "hud",
  "sehat",
  "file",
  "daya",
  "wifi",
]);

interface Settings {
  clock24: boolean;
  hoverOpen: boolean;
  showCat: boolean;
}
const SETTINGS_KEY = "sela.settings";
const DEFAULT_SETTINGS: Settings = {
  clock24: true,
  hoverOpen: true,
  showCat: true,
};

interface Toast {
  id: number;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

const DOW_EN = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface WeatherCache {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}
interface CityCache {
  name: string;
  country?: string;
}
interface LocalEvents {
  [key: string]: { id: string; text: string }[];
}

function IconPrev() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="2" y="3" width="2" height="10" />
      <path d="M13 3 5 8l8 5Z" />
    </svg>
  );
}
function IconPlay() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M4 2l9 6-9 6Z" />
    </svg>
  );
}
function IconPause() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="3" y="2" width="3.5" height="12" />
      <rect x="9.5" y="2" width="3.5" height="12" />
    </svg>
  );
}
function IconNext() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="12" y="3" width="2" height="10" />
      <path d="M3 3l8 5-8 5Z" />
    </svg>
  );
}

function HomeView({
  np,
  now,
  goTab,
}: {
  np: NowPlaying | null;
  now: Date;
  goTab: (t: TabId) => void;
}) {
  // Musik
  const playing = np?.status === "Playing";
  const progress =
    np?.length_secs && np.length_secs > 0
      ? Math.min(100, ((np.position_secs ?? 0) / np.length_secs) * 100)
      : null;

  // Kalender: 7 hari mulai hari ini (seperti strip Poni).
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(d);
  }
  const todayKey = dateKey(now);
  const localEvents = load<LocalEvents>("sela.events", {});
  const todayEvents = localEvents[todayKey] ?? [];
  const googleConnected = isGoogleConnected();

  // Cuaca: dari cache modul Cuaca (tanpa fetch ulang).
  const city = load<CityCache>("sela.weather.city", { name: "Jakarta" });
  const forecast = load<WeatherCache | null>("sela.weather.data", null);

  return (
    <div className="home-grid">
      {/* Kolom 1: Musik */}
      <div>
        <div className="home-tile">
          <div className="row" style={{ gap: 10 }}>
            <div className="home-music-icon">
              <IMusicNote size={20} />
            </div>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="home-title">
                {np ? np.title : "Nothing playing"}
              </div>
              <div className="home-sub">
                {np
                  ? np.artist || "Unknown artist"
                  : "Play something in Spoti…"}
              </div>
            </div>
          </div>
        </div>
        <div className="home-progress">
          <div
            style={{
              width: progress === null ? (playing ? "100%" : "0%") : `${progress}%`,
            }}
          />
        </div>
        <div className="home-controls">
          <button
            className="home-ctl"
            disabled={!np}
            onClick={() => void mediaControl("previous")}
            aria-label="Sebelumnya"
          >
            <IconPrev />
          </button>
          <button
            className="home-ctl"
            disabled={!np}
            onClick={() => void mediaControl("play-pause")}
            aria-label={playing ? "Jeda" : "Putar"}
          >
            {playing ? <IconPause /> : <IconPlay />}
          </button>
          <button
            className="home-ctl"
            disabled={!np}
            onClick={() => void mediaControl("next")}
            aria-label="Berikutnya"
          >
            <IconNext />
          </button>
        </div>
      </div>

      {/* Kolom 2: Kalender */}
      <div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="home-cal-title">
            {MONTHS_EN[now.getMonth()]} {now.getFullYear()}
          </span>
          <button
            className="home-plus"
            onClick={() => goTab("kalender")}
            aria-label="Tambah acara"
          >
            +
          </button>
        </div>
        <div className="week-strip">
          {days.map((d, i) => {
            const isToday = i === 0;
            return (
              <button
                key={dateKey(d)}
                className={isToday ? "week-day today" : "week-day"}
                onClick={() => goTab("kalender")}
              >
                <span className="week-dow">{DOW_EN[d.getDay()]}</span>
                <span className="week-date">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 7 }}>
          {todayEvents.slice(0, 2).map((ev) => (
            <div key={ev.id} className="home-event">
              • {ev.text}
            </div>
          ))}
          {todayEvents.length === 0 && (
            <>
              <div className="home-sub">
                {googleConnected
                  ? "Google connected — no events today."
                  : "No calendars yet."}
              </div>
              {!googleConnected && (
                <button
                  className="home-link"
                  onClick={() => goTab("kalender")}
                >
                  Connect Google / Outlook
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Kolom 3: Cuaca */}
      <div>
        <div className="home-tile">
          {forecast ? (
            <>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div className="home-title">{city.name}</div>
                  <div className="home-sub">
                    {cuacaText(forecast.current.weather_code)}
                  </div>
                </div>
                <div className="home-temp">
                  {Math.round(forecast.current.temperature_2m)}°
                </div>
              </div>
              <div className="home-sub" style={{ marginTop: 6 }}>
                Kelembapan {forecast.current.relative_humidity_2m}% · Angin{" "}
                {Math.round(forecast.current.wind_speed_10m)} km/jam
              </div>
            </>
          ) : (
            <>
              <div className="home-title">{city.name}</div>
              <div className="home-sub">Belum ada data cuaca.</div>
              <button
                className="btn-ghost btn-mini"
                style={{ marginTop: 8 }}
                onClick={() => goTab("cuaca")}
              >
                Buka Cuaca
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsView({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (next: Settings) => void;
}) {
  return (
    <div>
      <h2>Pengaturan</h2>
      <p className="sub">Opsi tampilan notch Sela.</p>
      <div className="list-row">
        <div className="list-main">
          <div className="list-title">Jam 24 jam</div>
          <div className="list-sub">Matikan untuk format 12 jam (AM/PM).</div>
        </div>
        <input
          type="checkbox"
          checked={settings.clock24}
          onChange={(e) => onChange({ ...settings, clock24: e.target.checked })}
          aria-label="Jam 24 jam"
        />
      </div>
      <div className="list-row">
        <div className="list-main">
          <div className="list-title">Buka saat hover</div>
          <div className="list-sub">Arahkan kursor 120 mdtk untuk membuka.</div>
        </div>
        <input
          type="checkbox"
          checked={settings.hoverOpen}
          onChange={(e) => onChange({ ...settings, hoverOpen: e.target.checked })}
          aria-label="Buka saat hover"
        />
      </div>
      <div className="list-row">
        <div className="list-main">
          <div className="list-title">Tampilkan kucing</div>
          <div className="list-sub">Kucing oranye mengintip di sisi kanan.</div>
        </div>
        <input
          type="checkbox"
          checked={settings.showCat}
          onChange={(e) => onChange({ ...settings, showCat: e.target.checked })}
          aria-label="Tampilkan kucing"
        />
      </div>
      <div className="divider" />
      <div className="row">
        <button
          className="btn-ghost btn-mini"
          onClick={() => void openDockWindow("dock-clock")}
        >
          Widget jam
        </button>
        <button
          className="btn-ghost btn-mini"
          onClick={() => void openDockWindow("dock-weather")}
        >
          Widget cuaca
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Sela v0.3.0 · dibuat meniru Poni v1.8.0
      </p>
    </div>
  );
}

function NotchApp() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("home");
  const [now, setNow] = useState(() => new Date());
  const [np, setNp] = useState<NowPlaying | null>(null);
  const [lyricQuery, setLyricQuery] = useState<LyricQuery | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [settings, setSettings] = useState<Settings>(() =>
    load<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS),
  );
  const toastId = useRef(0);
  const prevUsb = useRef<Set<string> | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const openedByHover = useRef(false);
  // Waktu tutup terakhir: hover yang terjadi <300 mdtk setelah tutup eksplisit
  // (X/Esc) diabaikan, supaya panel tidak langsung membuka lagi sendiri.
  const lastCloseAt = useRef(0);

  const pushToast = useCallback((t: Omit<Toast, "id">, ttlMs = 9000) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { ...t, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, ttlMs);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    save(SETTINGS_KEY, next);
  }, []);

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
      if (e.key === "Escape") closeNow();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkron ukuran jendela dengan status buka/tutup + varian tinggi.
  const isTall = TALL_TABS.has(view as TabId);  useEffect(() => {
    setNotchOpen(open, isTall);
  }, [open, isTall]);

  // Pengingat sehat: cek tiap 30 detik, tampilkan toast saat waktunya tiba.
  useEffect(() => {
    const check = () => {
      const s = load<HealthSettings>(HEALTH_KEY, DEFAULT_HEALTH);
      const due = healthDue(s);
      for (const kind of due) {
        const k: ReminderKind = kind;
        pushToast({
          text: REMINDER_TEXT[k],
          actionLabel: "Sudah",
          onAction: () => markReminderDone(k),
        });
        markReminderDone(k);
      }
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [pushToast]);

  // Notifikasi USB/SD: polling perangkat removable tiap 10 detik.
  useEffect(() => {
    const check = async () => {
      const devs: Removable[] = await listRemovable();
      const names = new Set(devs.map((d) => d.name));
      const prev = prevUsb.current;
      if (prev) {
        for (const d of devs) {
          if (!prev.has(d.name)) {
            pushToast({
              text: `Perangkat USB/SD baru terdeteksi: ${d.name}${d.model ? ` (${d.model.trim()})` : ""}${d.size_gb > 0 ? ` · ${d.size_gb.toFixed(1)} GB` : ""}.`,
            });
          }
        }
      }
      prevUsb.current = names;
    };
    void check();
    const t = setInterval(() => void check(), 10000);
    return () => clearInterval(t);
  }, [pushToast]);

  const bukaLirik = useCallback((q: LyricQuery) => {
    setLyricQuery(q);
    setView("lirik");
  }, []);

  const goTab = useCallback((t: TabId) => setView(t), []);

  // Buka/tutup: hover 120 mdtk (ala Poni), klik langsung, Esc/X menutup.
  const openNow = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
    openedByHover.current = false;
    setOpen(true);
  }, []);

  const closeNow = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
    window.clearTimeout(closeTimer.current);
    openedByHover.current = false;
    lastCloseAt.current = Date.now();
    setOpen(false);
  }, []);

  const onPillEnter = useCallback(() => {
    if (!settings.hoverOpen) return;
    // Abaikan hover yang terjadi tepat setelah tutup eksplisit: saat panel
    // ditutup, pill muncul di bawah kursor yang diam (jendela mengecil
    // secara async) dan mouseenter palsu itu akan membuka lagi panel.
    if (Date.now() - lastCloseAt.current < 300) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      openedByHover.current = true;
      setOpen(true);
    }, 120);
  }, [settings.hoverOpen]);

  const onPillLeave = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
  }, []);

  const onStripEnter = useCallback(() => {
    window.clearTimeout(closeTimer.current);
  }, []);

  const onStripLeave = useCallback(() => {
    if (!openedByHover.current) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 350);
  }, []);

  // Swipe 2 jari antar tab: wheel horizontal dominan di bilah ikon.
  const onTabsWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    if (Math.abs(e.deltaX) < 20) return;
    const cur = view === "home" || view === "pengaturan" ? -1 : TABS.findIndex((t) => t.id === view);
    const nextIdx =
      e.deltaX > 0 ? Math.min(TABS.length - 1, cur + 1) : Math.max(0, cur - 1);
    const next = TABS[nextIdx];
    if (next && next.id !== view) setView(next.id);
  };

  const playing = np?.status === "Playing";
  const progress =
    np?.length_secs && np.length_secs > 0
      ? Math.min(100, ((np.position_secs ?? 0) / np.length_secs) * 100)
      : null;

  const clockText = settings.clock24
    ? jamMenit(now)
    : (() => {
        const h = now.getHours();
        const h12 = h % 12 || 12;
        const ap = h < 12 ? "AM" : "PM";
        return `${h12}:${String(now.getMinutes()).padStart(2, "0")} ${ap}`;
      })();

  if (!open) {
    return (
      // Hover-buka dipasang pada .pill + .pill-cat (BUKAN .pill-wrap):
      // pill-wrap selebar jendela — saat panel ditutup, jendela mengecil
      // secara async dan kursor yang diam tiba-tiba berada di dalam
      // pill-wrap, memicu mouseenter palsu yang membuka lagi panel.
      <div className="pill-wrap">
        <div
          className="pill"
          data-tauri-drag-region
          onMouseEnter={onPillEnter}
          onMouseLeave={onPillLeave}
          onClick={openNow}
          role="button"
          aria-label="Buka Sela"
        >
          <span className="pill-clock">{clockText}</span>
        </div>
        {settings.showCat && (
          <div
            className="pill-cat"
            onMouseEnter={onPillEnter}
            onMouseLeave={onPillLeave}
            onClick={openNow}
            aria-hidden
          >
            <CatPeek size={54} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={playing ? "strip playing" : "strip"}
      onMouseEnter={onStripEnter}
      onMouseLeave={onStripLeave}
    >
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <span className="grow">{t.text}</span>
            {t.onAction && (
              <button
                className="btn-ghost btn-mini"
                onClick={() => {
                  t.onAction?.();
                  dismissToast(t.id);
                }}
              >
                {t.actionLabel ?? "OK"}
              </button>
            )}
            <button
              className="btn-ghost btn-mini"
              onClick={() => dismissToast(t.id)}
              aria-label="Tutup pemberitahuan"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <button
          className={view === "home" ? "home-pill active" : "home-pill"}
          onClick={() => setView("home")}
          title="Home"
        >
          <IHome size={14} />
          <span>Home</span>
        </button>
        <div className="tool-icons" onWheel={onTabsWheel}>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={view === t.id ? "tool-icon active" : "tool-icon"}
                onClick={() => setView(t.id)}
                title={t.label}
                aria-label={t.label}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
        <div className="tool-right">
          <button
            className="tool-icon"
            onClick={closeNow}
            title="Tutup (Esc)"
            aria-label="Tutup"
          >
            <IX size={15} />
          </button>
          <button
            className={
              view === "pengaturan" ? "tool-icon active" : "tool-icon"
            }
            onClick={() => setView("pengaturan")}
            title="Pengaturan"
            aria-label="Pengaturan"
          >
            <IGear size={16} />
          </button>
        </div>
      </div>

      <div className="timer-line">
        {playing && (
          <div
            className={progress === null ? "timer-fill indet" : "timer-fill"}
            style={progress === null ? undefined : { width: `${progress}%` }}
          />
        )}
      </div>

      <main className={settings.showCat ? "strip-content with-cat" : "strip-content"}>
        <div key={view} className="view-anim">
          {view === "home" && (
            <HomeView np={np} now={now} goTab={goTab} />
          )}
          {view === "pengaturan" && (
            <SettingsView settings={settings} onChange={updateSettings} />
          )}
          {view === "musik" && <Musik np={np} onLyrics={bukaLirik} />}
          {view === "kalender" && <Kalender />}
          {view === "todo" && <Todo />}
          {view === "pomodoro" && <Pomodoro />}
          {view === "cuaca" && <Cuaca />}
          {view === "kurs" && <Kurs />}
          {view === "sholat" && <Sholat />}
          {view === "lirik" && <Lirik np={np} query={lyricQuery} />}
          {view === "jamdunia" && <WorldClock />}
          {view === "terjemah" && <Terjemah />}
          {view === "sehat" && <Sehat />}
          {view === "teleprompter" && <Teleprompter />}
          {view === "file" && <FileShelf />}
          {view === "hud" && <HUD />}
          {view === "shrink" && <Shrink />}
          {view === "daya" && <Daya />}
          {view === "aichat" && <AiChat />}
          {view === "wifi" && <Wifi />}
        </div>
      </main>

      {settings.showCat && (
        <div className="strip-cat" aria-hidden>
          <CatPeek size={46} />
        </div>
      )}
    </div>
  );
}

export default function App() {
  const mode = new URLSearchParams(window.location.search).get("window");
  if (mode === "karaoke") return <KaraokeWindow />;
  if (mode === "dock-clock") return <DockClock />;
  if (mode === "dock-weather") return <DockWeather />;
  return <NotchApp />;
}
