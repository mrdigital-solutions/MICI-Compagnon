import {
  Check,
  ChevronDown,
  MessageCircleQuestion,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../../db/database'
import { quickWrite } from '../../db/dbHealth'
import type { DoctorQuestion, MemoNote } from '../../types'
import { formatDateFr, formatShortDateFr, getTodayKey, toDateKey } from '../../utils/dateUtils'
import { newId } from '../../utils/id'

interface NotesPanelProps {
  /** Ouvre une journée du journal */
  onOpenDay: (dateKey: string) => void
}

const card =
  'rounded-3xl bg-white/85 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 p-4 space-y-3'

function matches(text: string, query: string): boolean {
  if (!query) return true
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
  return normalize(text).includes(normalize(query))
}

export function NotesPanel({ onOpenDay }: NotesPanelProps) {
  const settings = useLiveQuery(() => db.settings.get('default'), [])
  const journalNotes = useLiveQuery(
    () =>
      db.dailyEntries
        .orderBy('date')
        .reverse()
        .filter((e) => (e.notes ?? '').trim().length > 0)
        .toArray(),
    [],
  )

  const questions = useMemo(() => settings?.doctorQuestions ?? [], [settings])
  const memos = useMemo(() => settings?.memoNotes ?? [], [settings])

  const [query, setQuery] = useState('')
  const [newQuestion, setNewQuestion] = useState('')
  const [newMemo, setNewMemo] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showAsked, setShowAsked] = useState(false)

  const q = query.trim()
  const openQuestions = questions.filter((x) => !x.askedAt && matches(x.text, q))
  const askedQuestions = questions
    .filter((x) => x.askedAt && matches(x.text, q))
    .sort((a, b) => (b.askedAt ?? '').localeCompare(a.askedAt ?? ''))
  const visibleMemos = [...memos]
    .filter((m) => matches(m.text, q))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const visibleJournal = (journalNotes ?? []).filter((e) => matches(e.notes, q))

  function saveQuestions(next: DoctorQuestion[]) {
    return quickWrite(() => db.settings.update('default', { doctorQuestions: next }))
  }
  function saveMemos(next: MemoNote[]) {
    return quickWrite(() => db.settings.update('default', { memoNotes: next }))
  }

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault()
    const text = newQuestion.trim()
    if (!text) return
    if (await saveQuestions([...questions, { id: newId(), text, createdAt: getTodayKey() }])) {
      setNewQuestion('')
    }
  }

  function toggleAsked(id: string) {
    void saveQuestions(
      questions.map((x) =>
        x.id === id ? { ...x, askedAt: x.askedAt ? undefined : getTodayKey() } : x,
      ),
    )
  }

  async function addMemo(e: React.FormEvent) {
    e.preventDefault()
    const text = newMemo.trim()
    if (!text) return
    const now = new Date().toISOString()
    if (await saveMemos([...memos, { id: newId(), text, createdAt: now, updatedAt: now }])) {
      setNewMemo('')
    }
  }

  function startEdit(id: string, text: string) {
    setEditingId(id)
    setEditText(text)
    setConfirmDeleteId(null)
  }

  async function saveEdit() {
    const text = editText.trim()
    if (!editingId || !text) return
    const now = new Date().toISOString()
    let ok: boolean
    if (questions.some((x) => x.id === editingId)) {
      ok = await saveQuestions(questions.map((x) => (x.id === editingId ? { ...x, text } : x)))
    } else {
      ok = await saveMemos(memos.map((m) => (m.id === editingId ? { ...m, text, updatedAt: now } : m)))
    }
    if (ok) setEditingId(null)
  }

  function remove(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    setConfirmDeleteId(null)
    if (questions.some((x) => x.id === id)) void saveQuestions(questions.filter((x) => x.id !== id))
    else void saveMemos(memos.filter((m) => m.id !== id))
  }

  function itemActions(id: string, text: string) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => startEdit(id, text)}
          aria-label="Modifier"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => remove(id)}
          aria-label={confirmDeleteId === id ? 'Confirmer la suppression' : 'Supprimer'}
          className={`h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${
            confirmDeleteId === id
              ? 'px-2.5 bg-rose-600 text-white'
              : 'w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
          }`}
        >
          {confirmDeleteId === id ? 'Supprimer ?' : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    )
  }

  function editor() {
    return (
      <div className="space-y-2">
        <textarea
          rows={3}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          autoFocus
          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void saveEdit()}
            disabled={!editText.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-600 disabled:opacity-50"
          >
            Enregistrer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Recherche */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher dans mes notes…"
          className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Questions pour le médecin */}
      <section className={card}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
            <MessageCircleQuestion className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Questions pour mon médecin</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Cochez-les une fois posées · elles apparaissent dans le Rapport
            </p>
          </div>
        </div>

        <form onSubmit={addQuestion} className="flex gap-2">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ex : Puis-je espacer les injections ?"
            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={!newQuestion.trim()}
            aria-label="Ajouter la question"
            className="w-10 shrink-0 rounded-xl bg-indigo-600 text-white flex items-center justify-center disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {openQuestions.length === 0 && askedQuestions.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {q ? 'Aucune question ne correspond.' : 'Notez ici les questions qui vous viennent entre deux rendez-vous.'}
          </p>
        )}

        <ul className="space-y-1.5">
          {openQuestions.map((x) => (
            <li key={x.id} className="p-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50">
              {editingId === x.id ? (
                editor()
              ) : (
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggleAsked(x.id)}
                    aria-label="Marquer comme posée"
                    className="mt-0.5 w-6 h-6 shrink-0 rounded-full border-2 border-indigo-300 dark:border-indigo-700"
                  />
                  <p className="flex-1 min-w-0 text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words">
                    {x.text}
                  </p>
                  {itemActions(x.id, x.text)}
                </div>
              )}
            </li>
          ))}
        </ul>

        {askedQuestions.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowAsked((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showAsked ? 'rotate-180' : ''}`} />
              Déjà posées ({askedQuestions.length})
            </button>
            {(showAsked || q) && (
              <ul className="mt-2 space-y-1.5">
                {askedQuestions.map((x) => (
                  <li key={x.id} className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/30">
                    <button
                      type="button"
                      onClick={() => toggleAsked(x.id)}
                      aria-label="Remettre à poser"
                      className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-through whitespace-pre-wrap break-words">
                        {x.text}
                      </p>
                      <p className="text-[10px] text-slate-400">Posée le {formatShortDateFr(x.askedAt!)}</p>
                    </div>
                    {itemActions(x.id, x.text)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Bloc-notes */}
      <section className={card}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
            <NotebookPen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bloc-notes</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ce que le médecin a dit, un nom de médicament, un contact…
            </p>
          </div>
        </div>

        <form onSubmit={addMemo} className="space-y-2">
          <textarea
            rows={2}
            value={newMemo}
            onChange={(e) => setNewMemo(e.target.value)}
            placeholder="Écrire une note…"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
          />
          {newMemo.trim() && (
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
            >
              Ajouter la note
            </button>
          )}
        </form>

        {visibleMemos.length === 0 ? (
          q && <p className="text-xs text-slate-500 dark:text-slate-400">Aucune note ne correspond.</p>
        ) : (
          <ul className="space-y-1.5">
            {visibleMemos.map((m) => (
              <li key={m.id} className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50">
                {editingId === m.id ? (
                  editor()
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 mb-0.5">
                        {formatShortDateFr(toDateKey(new Date(m.updatedAt)))}
                      </p>
                      <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words">
                        {m.text}
                      </p>
                    </div>
                    {itemActions(m.id, m.text)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Notes du journal */}
      <section className={card}>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notes du journal</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Les « notes libres » de chaque journée · touchez pour ouvrir le jour
          </p>
        </div>
        {visibleJournal.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {q ? 'Aucune note du journal ne correspond.' : 'Aucune note libre pour le moment.'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {visibleJournal.map((e) => (
              <li key={e.date}>
                <button
                  type="button"
                  onClick={() => onOpenDay(e.date)}
                  className="w-full text-left p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <p className="text-[11px] font-bold capitalize text-teal-700 dark:text-teal-300 mb-0.5">
                    {formatDateFr(e.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words line-clamp-4">
                    {e.notes}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
