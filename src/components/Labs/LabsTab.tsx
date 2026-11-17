import { FileText, FileUp, FlaskConical, Plus, Trash2, TrendingUp } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '../../db/database'
import type { LabResult } from '../../types'
import { formatShortDateFr } from '../../utils/dateUtils'
import {
  LAB_MARKERS,
  getMarkerRange,
  isMarkerOutOfRange,
  type LabMarkerKey,
} from '../../utils/labParser'
import { ImportLabModal } from './ImportLabModal'

function isValidLabNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val)
}

export function LabsTab() {
  const [modalMode, setModalMode] = useState<'import' | 'manual' | null>(null)
  const [selectedMarker, setSelectedMarker] = useState<LabMarkerKey>('crp')

  const labResults = useLiveQuery(() => db.labResults.orderBy('date').toArray(), [])
  const patientSex = useLiveQuery(() => db.settings.get('default'), [])?.patientSex

  const activeMeta = useMemo(
    () => LAB_MARKERS.find((m) => m.key === selectedMarker) ?? LAB_MARKERS[0],
    [selectedMarker],
  )
  const activeRange = getMarkerRange(activeMeta, patientSex)

  const chartData = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const r of labResults ?? []) {
      const val = r[selectedMarker]
      if (isValidLabNumber(val)) {
        byDate.set(r.date, val)
      }
    }
    return Array.from(byDate.entries()).map(([date, value]) => ({
      dateLabel: formatShortDateFr(date),
      date,
      value,
    }))
  }, [labResults, selectedMarker])

  const latestByMarker = useMemo(() => {
    const result: Partial<Record<LabMarkerKey, LabResult>> = {}
    for (const meta of LAB_MARKERS) {
      for (let i = (labResults?.length ?? 0) - 1; i >= 0; i--) {
        const entry = labResults![i]
        if (isValidLabNumber(entry[meta.key])) {
          result[meta.key] = entry
          break
        }
      }
    }
    return result
  }, [labResults])

  const reversedResults = useMemo(
    () => [...(labResults ?? [])].reverse(),
    [labResults],
  )

  async function handleDelete(id?: number) {
    if (id === undefined) return
    await db.labResults.delete(id)
  }

  function handleOpenStoredPdf(blob: Blob, fileName?: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    if (fileName) a.download = fileName
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  return (
    <div className="space-y-5">
      {/* Top action bar */}
      <section className="rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Bilans biologiques
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Suivez votre inflammation, bilan hépatique et NFS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalMode('import')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-semibold shadow-sm shadow-teal-600/20 transition-all"
          >
            <FileUp className="w-4 h-4" />
            Importer PDF / Texte
          </button>
          <button
            type="button"
            onClick={() => setModalMode('manual')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50"
          >
            <Plus className="w-4 h-4" />
            Saisie
          </button>
        </div>
      </section>

      {/* Latest snapshot cards */}
      {(labResults?.length ?? 0) > 0 && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {LAB_MARKERS.slice(0, 4).map((meta) => {
            const markerResult = latestByMarker[meta.key]
            const rawVal = markerResult?.[meta.key]
            const val = isValidLabNumber(rawVal) ? rawVal : undefined
            const outOfRange = isMarkerOutOfRange(meta, val, patientSex)
            return (
              <button
                key={meta.key}
                type="button"
                onClick={() => setSelectedMarker(meta.key)}
                className={`text-left p-3.5 rounded-2xl border backdrop-blur-md transition-all ${
                  selectedMarker === meta.key
                    ? 'bg-white dark:bg-slate-900 border-teal-400 ring-2 ring-teal-500/20 shadow-sm'
                    : 'bg-white/75 dark:bg-slate-900/75 border-white/90 dark:border-slate-800 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {meta.shortLabel}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {getMarkerRange(meta, patientSex).refText}
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span
                    className={`text-xl font-extrabold ${
                      outOfRange
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {val !== undefined ? val : '—'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {meta.unit}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {markerResult ? `Dernier : ${formatShortDateFr(markerResult.date)}` : 'Aucune donnée'}
                </p>
              </button>
            )
          })}
        </section>
      )}

      {/* Evolution Chart */}
      <section className="rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Évolution : {activeMeta.label}
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              Réf : {activeRange.refText} {activeMeta.unit}
            </span>
          </div>
        </div>

        {/* Marker pills */}
        <div className="flex flex-wrap gap-1.5">
          {LAB_MARKERS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setSelectedMarker(m.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedMarker === m.key
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-slate-100/90 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70'
              }`}
            >
              {m.shortLabel}
            </button>
          ))}
        </div>

        {chartData.length > 0 ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`${value} ${activeMeta.unit}`, activeMeta.shortLabel]}
                />
                {activeRange.maxRef !== undefined && (
                  <ReferenceLine
                    y={activeRange.maxRef}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: `Max ${activeRange.maxRef}`,
                      position: 'insideTopRight',
                      fill: '#d97706',
                      fontSize: 10,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={activeMeta.color}
                  strokeWidth={3}
                  dot={{ r: 5, fill: activeMeta.color, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            Aucune donnée enregistrée pour <strong>{activeMeta.shortLabel}</strong>. Importez un
            PDF ou ajoutez un bilan pour afficher la courbe.
          </div>
        )}
      </section>

      {/* Results Table */}
      <section className="rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Historique des bilans ({reversedResults.length})
        </h3>

        {reversedResults.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
            Votre tableau est vide. Cliquez sur <strong>Importer PDF / Texte</strong> pour charger
            votre premier compte-rendu (ex: Biogroup).
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 pr-3 font-semibold">Date</th>
                  {LAB_MARKERS.map((m) => (
                    <th key={m.key} className="py-2.5 px-2 font-semibold whitespace-nowrap">
                      {m.shortLabel}
                    </th>
                  ))}
                  <th className="py-2.5 pl-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {reversedResults.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 pr-3 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {formatShortDateFr(row.date)}
                    </td>
                    {LAB_MARKERS.map((m) => {
                      const rawVal = row[m.key]
                      const val = isValidLabNumber(rawVal) ? rawVal : undefined
                      const out = isMarkerOutOfRange(m, val, patientSex)
                      return (
                        <td key={m.key} className="py-3 px-2 whitespace-nowrap">
                          {val !== undefined ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-lg font-semibold ${
                                out
                                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                  : 'text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {val}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="py-3 pl-2 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {row.pdfBlob instanceof Blob && (
                          <button
                            type="button"
                            onClick={() => handleOpenStoredPdf(row.pdfBlob!, row.pdfFileName)}
                            title={row.pdfFileName || 'Ouvrir le PDF enregistré'}
                            aria-label="Ouvrir le PDF"
                            className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          aria-label="Supprimer le bilan"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalMode && (
        <ImportLabModal
          initialMode={modalMode}
          onClose={() => setModalMode(null)}
        />
      )}
    </div>
  )
}
