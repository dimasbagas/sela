import { useEffect, useState } from "react";
import { httpJson, sysStats, type SysStats } from "../lib/api";
import { load } from "../lib/store";
import { cuacaText, formatAngka, jamMenitDetik, tanggalId } from "../lib/format";

interface Forecast {
  current: { temperature_2m: number; weather_code: number };
}

export default function HUD() {
  const [stats, setStats] = useState<SysStats | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [wx, setWx] = useState<Forecast | null>(() =>
    load<Forecast | null>("sela.weather.data", null),
  );

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      const s = await sysStats();
      if (!stop) setStats(s);
    };
    void poll();
    const t = setInterval(poll, 3000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    let stop = false;
    const fetchWx = async () => {
      try {
        const f = await httpJson<Forecast>(
          "https://api.open-meteo.com/v1/forecast?latitude=-6.2088&longitude=106.8456&current=temperature_2m,weather_code&timezone=auto",
        );
        if (!stop) setWx(f);
      } catch {
        // pakai cache cuaca yang sudah ada
      }
    };
    void fetchWx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memPct = stats ? Math.round(stats.mem_percent) : 0;

  return (
    <div>
      <h2>HUD</h2>
      <p className="sub">Sekilas: waktu, cuaca Jakarta, dan beban sistem.</p>

      <div className="hud-grid">
        <div className="hud-cell">
          <div className="hud-num">{jamMenitDetik(now)}</div>
          <div className="hud-label">{tanggalId(now)}</div>
        </div>
        <div className="hud-cell">
          <div className="hud-num">
            {wx ? `${formatAngka(wx.current.temperature_2m, 0)}°` : "—"}
          </div>
          <div className="hud-label">
            Jakarta · {wx ? cuacaText(wx.current.weather_code) : "cuaca belum dimuat"}
          </div>
        </div>
        <div className="hud-cell">
          <div className="hud-num">
            {stats ? `${Math.round(stats.cpu_percent)}%` : "—"}
          </div>
          <div className="hud-label">
            CPU{stats ? ` · load ${stats.load1.toFixed(2)}` : ""}
          </div>
          <div className="meter">
            <div
              className="meter-fill"
              style={{
                width: `${stats ? Math.min(100, stats.cpu_percent) : 0}%`,
              }}
            />
          </div>
        </div>
        <div className="hud-cell">
          <div className="hud-num">
            {stats ? `${stats.mem_used_mb} MB` : "—"}
          </div>
          <div className="hud-label">
            RAM{stats ? ` · ${memPct}% dari ${stats.mem_total_mb} MB` : ""}
          </div>
          <div className="meter">
            <div className="meter-fill" style={{ width: `${memPct}%` }} />
          </div>
        </div>
      </div>

      <p className="hint" style={{ marginTop: 12 }}>
        CPU dan RAM dibaca dari <span className="mono">/proc/stat</span> dan{" "}
        <span className="mono">/proc/meminfo</span> (Linux), diperbarui tiap 3
        detik.
      </p>
    </div>
  );
}
