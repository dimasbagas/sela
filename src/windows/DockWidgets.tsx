import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { httpJson } from "../lib/api";
import { load } from "../lib/store";
import { cuacaText, formatAngka, jamMenitDetik, tanggalSingkat } from "../lib/format";

async function closeWin() {
  try {
    await getCurrentWindow().close();
  } catch {
    window.close();
  }
}

function CloseBtn() {
  return (
    <button className="widget-close" onClick={() => void closeWin()} aria-label="Tutup widget">
      ×
    </button>
  );
}

export function DockClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="widget-win" data-tauri-drag-region>
      <CloseBtn />
      <div className="widget-clock">{jamMenitDetik(now)}</div>
      <div className="widget-date">{tanggalSingkat(now)}</div>
    </div>
  );
}

interface Forecast {
  current: { temperature_2m: number; weather_code: number };
}

export function DockWeather() {
  const [wx, setWx] = useState<Forecast | null>(() =>
    load<Forecast | null>("sela.weather.data", null),
  );
  useEffect(() => {
    let stop = false;
    const fetchWx = async () => {
      try {
        const f = await httpJson<Forecast>(
          "https://api.open-meteo.com/v1/forecast?latitude=-6.2088&longitude=106.8456&current=temperature_2m,weather_code&timezone=auto",
        );
        if (!stop) setWx(f);
      } catch {
        // pakai cache
      }
    };
    void fetchWx();
    return () => {
      stop = true;
    };
  }, []);
  return (
    <div className="widget-win" data-tauri-drag-region>
      <CloseBtn />
      <div className="widget-temp">
        {wx ? `${formatAngka(wx.current.temperature_2m, 0)}°` : "—"}
      </div>
      <div className="widget-date">
        Jakarta · {wx ? cuacaText(wx.current.weather_code) : "memuat…"}
      </div>
    </div>
  );
}
