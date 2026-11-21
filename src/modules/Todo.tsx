import { useEffect, useState } from "react";
import { load, save } from "../lib/store";
import {
  googleGet,
  googleReq,
  isGoogleConnected,
} from "../lib/google";

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

interface GoogleTask {
  id: string;
  title: string;
  status: "needsAction" | "completed";
}

interface TasksListResp {
  items?: GoogleTask[];
}

const KEY = "sela.todos";
const TASKS_URL = "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks";

export default function Todo() {
  const [items, setItems] = useState<TodoItem[]>(() => load<TodoItem[]>(KEY, []));
  const [draft, setDraft] = useState("");

  function update(next: TodoItem[]) {
    setItems(next);
    save(KEY, next);
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    update([{ id: `${Date.now()}`, text, done: false }, ...items]);
    setDraft("");
  }

  function toggle(id: string) {
    update(items.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function remove(id: string) {
    update(items.filter((t) => t.id !== id));
  }

  const doneCount = items.filter((t) => t.done).length;

  // ---- Google Tasks (memakai auth yang sama dengan Kalender) ----
  const [gConnected] = useState(() => isGoogleConnected());
  const [gTasks, setGTasks] = useState<GoogleTask[]>([]);
  const [gDraft, setGDraft] = useState("");
  const [gBusy, setGBusy] = useState(false);
  const [gErr, setGErr] = useState("");

  async function fetchGTasks() {
    if (!isGoogleConnected()) return;
    setGBusy(true);
    setGErr("");
    try {
      const data = await googleGet<TasksListResp>(
        `${TASKS_URL}?showCompleted=true&maxResults=50`,
      );
      setGTasks(data.items ?? []);
    } catch (e) {
      setGErr(`Tidak bisa mengambil Google Tasks: ${String(e)}`);
    } finally {
      setGBusy(false);
    }
  }

  useEffect(() => {
    if (gConnected) void fetchGTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gConnected]);

  async function addGTask(e?: React.FormEvent) {
    e?.preventDefault();
    const text = gDraft.trim();
    if (!text) return;
    setGBusy(true);
    try {
      await googleReq("POST", TASKS_URL, { title: text });
      setGDraft("");
      await fetchGTasks();
    } catch (err) {
      setGErr(String(err));
    } finally {
      setGBusy(false);
    }
  }

  async function toggleGTask(t: GoogleTask) {
    setGBusy(true);
    try {
      await googleReq(
        "PATCH",
        `${TASKS_URL}/${t.id}`,
        t.status === "completed"
          ? { status: "needsAction" }
          : { status: "completed" },
      );
      await fetchGTasks();
    } catch (err) {
      setGErr(String(err));
    } finally {
      setGBusy(false);
    }
  }

  async function removeGTask(id: string) {
    setGBusy(true);
    try {
      await googleReq("DELETE", `${TASKS_URL}/${id}`);
      await fetchGTasks();
    } catch (err) {
      setGErr(String(err));
    } finally {
      setGBusy(false);
    }
  }

  return (
    <div>
      <h2>Todo</h2>
      <p className="sub">
        {items.length === 0
          ? "Belum ada tugas. Tambah satu di bawah."
          : `${doneCount} dari ${items.length} tugas selesai.`}
      </p>

      <form className="row" onSubmit={add}>
        <input
          className="grow"
          type="text"
          placeholder="Tugas baru…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn" type="submit">
          Tambah
        </button>
      </form>

      <div style={{ marginTop: 8 }}>
        {items.map((t) => (
          <div className="list-row" key={t.id}>
            <button
              className={t.done ? "check done" : "check"}
              onClick={() => toggle(t.id)}
              aria-label={t.done ? "Tandai belum selesai" : "Tandai selesai"}
            >
              ✓
            </button>
            <div className="list-main">
              <div className={t.done ? "list-title todo-done" : "list-title"}>
                {t.text}
              </div>
            </div>
            <button
              className="btn-ghost btn-mini"
              onClick={() => remove(t.id)}
              aria-label="Hapus tugas"
            >
              Hapus
            </button>
          </div>
        ))}
      </div>

      {doneCount > 0 && (
        <div style={{ marginTop: 12 }}>
          <button
            className="btn-ghost btn-mini"
            onClick={() => update(items.filter((t) => !t.done))}
          >
            Hapus yang sudah selesai
          </button>
        </div>
      )}

      <div className="divider" />
      <div className="card">
        <div className="row">
          <div className="grow">
            <div className="card-title">Google Tasks</div>
            <div className="list-sub">
              {gConnected
                ? "Tersinkron dengan daftar tugas Google-mu."
                : "Hubungkan dulu lewat tab Kalender (Google Calendar)."}
            </div>
          </div>
          {gConnected && (
            <button
              className="btn-ghost btn-mini"
              onClick={() => void fetchGTasks()}
              disabled={gBusy}
            >
              Muat ulang
            </button>
          )}
        </div>
        {gConnected && (
          <>
            <form className="row" onSubmit={addGTask} style={{ marginTop: 10 }}>
              <input
                className="grow"
                type="text"
                placeholder="Tugas Google baru…"
                value={gDraft}
                onChange={(e) => setGDraft(e.target.value)}
              />
              <button className="btn" type="submit" disabled={gBusy}>
                Tambah
              </button>
            </form>
            {gErr && (
              <div className="err" style={{ marginTop: 10, marginBottom: 0 }}>
                {gErr}
              </div>
            )}
            <div style={{ marginTop: 6 }}>
              {gTasks.length === 0 && !gErr ? (
                <p className="muted" style={{ fontSize: 13, margin: "8px 0 0" }}>
                  Tidak ada tugas Google.
                </p>
              ) : (
                gTasks.map((t) => (
                  <div className="list-row" key={t.id}>
                    <button
                      className={
                        t.status === "completed" ? "check done" : "check"
                      }
                      onClick={() => void toggleGTask(t)}
                      aria-label="Tandai selesai"
                    >
                      ✓
                    </button>
                    <div className="list-main">
                      <div
                        className={
                          t.status === "completed"
                            ? "list-title todo-done"
                            : "list-title"
                        }
                      >
                        {t.title}
                      </div>
                    </div>
                    <span className="badge green">Google</span>
                    <button
                      className="btn-ghost btn-mini"
                      onClick={() => void removeGTask(t.id)}
                      aria-label="Hapus tugas Google"
                    >
                      Hapus
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
