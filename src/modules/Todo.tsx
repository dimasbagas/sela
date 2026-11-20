import { useState } from "react";
import { load, save } from "../lib/store";

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

const KEY = "sela.todos";

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
    </div>
  );
}
