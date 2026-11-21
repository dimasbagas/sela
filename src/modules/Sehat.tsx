import { useEffect, useState } from "react";
import { load, save } from "../lib/store";
import { mmss } from "../lib/format";

export interface HealthSettings {
  enabled: boolean;
  waterMin: number;
  stretchMin: number;
  eyeMin: number;
}

export const HEALTH_KEY = "sela.health.settings";
export const HEALTH_LAST_KEY = "sela.health.last";
export const DEFAULT_HEALTH: HealthSettings = {
  enabled: true,
  waterMin: 60,
  stretchMin: 90,
  eyeMin: 30,
};

export type ReminderKind = "water" | "stretch" | "eye";
export const REMINDER_TEXT: Record<ReminderKind, string> = {
  water: "Waktunya minum air — segelas dulu.",
  stretch: "Waktunya peregangan — berdiri dan regangkan badan sebentar.",
  eye: "Istirahatkan mata — lihat jauh selama 20 detik.",
};

export function healthDue(settings: HealthSettings): ReminderKind[] {
  if (!settings.enabled) return [];
  const last = load<Record<string, number>>(HEALTH_LAST_KEY, {});
  const now = Date.now();
  const due: ReminderKind[] = [];
  const check = (kind: ReminderKind, min: number) => {
    const prev = last[kind] ?? now;
    if (now - prev >= min * 60 * 1000) due.push(kind);
  };
  check("water", settings.waterMin);
  check("stretch", settings.stretchMin);
  check("eye", settings.eyeMin);
  return due;
}

export function markReminderDone(kind: ReminderKind) {
  const last = load<Record<string, number>>(HEALTH_LAST_KEY, {});
  last[kind] = Date.now();
  save(HEALTH_LAST_KEY, last);
}

export default function Sehat() {
  const [s, setS] = useState<HealthSettings>(() =>
    load<HealthSettings>(HEALTH_KEY, DEFAULT_HEALTH),
  );
  const [tick, setTick] = useState(0);

  // Detik berjalan supaya hitung mundur "berikutnya" bergerak.
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  function update(next: HealthSettings) {
    setS(next);
    save(HEALTH_KEY, next);
  }

  const last = load<Record<string, number>>(HEALTH_LAST_KEY, {});
  const now = Date.now();

  function countdown(kind: ReminderKind, min: number): string {
    const prev = last[kind] ?? now;
    const left = Math.max(0, min * 60 - Math.floor((now - prev) / 1000));
    return mmss(left);
  }

  const row = (
    label: string,
    kind: ReminderKind,
    min: number,
    setMin: (v: number) => void,
  ) => (
    <div className="card">
      <div className="row">
        <div className="grow">
          <div className="card-title">{label}</div>
          <div className="list-sub mono">
            Berikutnya dalam {countdown(kind, min)}
          </div>
        </div>
        <label className="muted" style={{ fontSize: 12 }}>
          tiap
        </label>
        <input
          type="number"
          min={5}
          max={480}
          value={min}
          style={{ width: 64 }}
          onChange={(e) =>
            setMin(Math.max(5, Math.min(480, Number(e.target.value) || 5)))
          }
        />
        <span className="muted" style={{ fontSize: 12 }}>
          mnt
        </span>
        <button
          className="btn-ghost btn-mini"
          onClick={() => markReminderDone(kind)}
        >
          Sudah
        </button>
      </div>
    </div>
  );

  void tick;

  return (
    <div>
      <h2>Pengingat Sehat</h2>
      <p className="sub">
        Pengingat minum, peregangan, dan istirahat mata. Pengingat muncul
        sebagai banner di panel saat waktunya tiba.
      </p>

      <div className="card">
        <div className="row">
          <div className="grow">
            <div className="card-title">Pengingat aktif</div>
            <div className="list-sub">Matikan bila tidak mau diganggu.</div>
          </div>
          <button
            className={s.enabled ? "btn-ghost active" : "btn-ghost"}
            onClick={() => update({ ...s, enabled: !s.enabled })}
          >
            {s.enabled ? "Aktif" : "Mati"}
          </button>
        </div>
      </div>

      {row("Minum air", "water", s.waterMin, (v) =>
        update({ ...s, waterMin: v }),
      )}
      {row("Peregangan", "stretch", s.stretchMin, (v) =>
        update({ ...s, stretchMin: v }),
      )}
      {row("Istirahat mata", "eye", s.eyeMin, (v) =>
        update({ ...s, eyeMin: v }),
      )}

      <p className="hint">
        Timer berjalan selama Sela terbuka. Tombol “Sudah” mengatur ulang
        hitung mundur pengingat itu dari sekarang.
      </p>
    </div>
  );
}
