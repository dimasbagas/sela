import { useMemo, useState } from "react";
import { load, save } from "../lib/store";
import { BULAN, HARI_SINGKAT, dateKey } from "../lib/format";

interface CalEvent {
  id: string;
  text: string;
}
type Events = Record<string, CalEvent[]>;

const KEY = "sela.events";

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

  return (
    <div>
      <h2>Kalender</h2>
      <p className="sub">Klik tanggal untuk melihat / menambah acara.</p>

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
        {HARI_SINGKAT.map((d) => (
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
            </button>
          ),
        )}
      </div>

      <div className="divider" />
      <div className="card-title" style={{ marginBottom: 6 }}>
        {selDate.getDate()} {BULAN[selDate.getMonth()]} {selDate.getFullYear()}
      </div>
      {selEvents.length === 0 ? (
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
