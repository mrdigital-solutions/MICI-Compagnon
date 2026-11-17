import {
  Activity,
  AlertTriangle,
  BarChart3,
  Check,
  Copy,
  Download,
  FileText,
  FlaskConical,
  Syringe,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DEFAULT_SETTINGS, db, getSiteLabel } from '../../db/database'
import { formatDateFr, formatShortDateFr, toDateKey } from '../../utils/dateUtils'
import {
  buildMedicalReport,
  exportReportToPdf,
  formatReportAsText,
} from '../../utils/reportGenerator'

type PeriodPreset = 'current_month' | 'previous_month' | 'custom'

function getMonthBounds(offsetMonths: number): { start: string; end: string } {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1, 12, 0, 0)
  const last = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0, 12, 0, 0)
  return { start: toDateKey(first), end: toDateKey(last) }
}

export function ReportTab() {
  const currentBounds = getMonthBounds(0)
  const [preset, setPreset] = useState<PeriodPreset>('current_month')
  const [customStart, setCustomStart] = useState(currentBounds.start)
  const [customEnd, setCustomEnd] = useState(currentBounds.end)
  const [copied, setCopied] = useState(false)

  const settings = useLiveQuery(() => db.settings.get('default'), [])
  const injections = useLiveQuery(() => db.injections.toArray(), [])
  const dailyEntries = useLiveQuery(() => db.dailyEntries.toArray(), [])
  const labResults = useLiveQuery(() => db.labResults.toArray(), [])

  const { startDate, endDate } = useMemo(() => {
    if (preset === 'current_month') {
      const b = getMonthBounds(0)
      return { startDate: b.start, endDate: b.end }
    }
    if (preset === 'previous_month') {
      const b = getMonthBounds(-1)
      return { startDate: b.start, endDate: b.end }
    }
    return {
      startDate: customStart <= customEnd ? customStart : customEnd,
      endDate: customStart <= customEnd ? customEnd : customStart,
    }
  }, [preset, customStart, customEnd])

  const report = useMemo(() => {
    return buildMedicalReport({
      startDate,
      endDate,
      settings: settings ?? DEFAULT_SETTINGS,
      injections: injections ?? [],
      dailyEntries: dailyEntries ?? [],
      labResults: labResults ?? [],
    })
  }, [startDate, endDate, settings, injections, dailyEntries, labResults])

  const plainText = useMemo(() => formatReportAsText(report), [report])

  async function handleCopy() {
    await navigator.clipboard.writeText(plainText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <section className="rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Bilan Mensuel & Rapport Médecin
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Du {formatDateFr(startDate, { day: 'numeric', month: 'short' })} au{' '}
                {formatDateFr(endDate, { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-semibold shadow-sm shadow-teal-600/20 transition-all"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié !' : 'Copier le résumé'}
            </button>
            <button
              type="button"
              onClick={() => exportReportToPdf(report)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'current_month' as const, label: 'Mois en cours' },
            { id: 'previous_month' as const, label: 'Mois précédent' },
            { id: 'custom' as const, label: 'Période personnalisée' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                preset === p.id
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-slate-100/90 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Du
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Au
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              />
            </div>
          </div>
        )}
      </section>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Traitement */}
        <section className="rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
          <div className="flex items-center gap-2">
            <Syringe className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Traitement ({report.treatmentName})
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                Injections réalisées
              </p>
              <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100 mt-0.5">
                {report.doneInjections.length}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                Décalages
              </p>
              <p className="text-2xl font-extrabold text-amber-900 dark:text-amber-100 mt-0.5">
                {report.shiftedInjections.length}
              </p>
            </div>
          </div>

          {report.doneInjections.length > 0 && (
            <ul className="space-y-1.5 text-[13px]">
              {report.doneInjections.map((inj) => (
                <li
                  key={inj.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {formatShortDateFr(inj.actualDate ?? inj.scheduledDate)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {getSiteLabel(inj.site)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {report.shiftedInjections.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Motifs de décalage
              </p>
              {report.shiftedInjections.map((inj) => (
                <div
                  key={inj.id}
                  className="text-xs px-3 py-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200"
                >
                  Prévue le {formatShortDateFr(inj.scheduledDate)} :{' '}
                  <strong>+{inj.shiftDays} j</strong> ({inj.shiftReason || 'Report'})
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2. Symptômes & Pics */}
        <section className="rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Symptômes ({report.totalLoggedDays} jours saisis)
              </h3>
            </div>
            {report.feverDays > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
                {report.feverDays} j fièvre
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60">
              <p className="text-[11px] text-slate-500">Digestif</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                {report.digestiveDays} j
              </p>
              <p className="text-[10px] text-slate-400">moy {report.avgDigestive}/5</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60">
              <p className="text-[11px] text-slate-500">Articulaire</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                {report.jointDays} j
              </p>
              <p className="text-[10px] text-slate-400">moy {report.avgJoint}/5</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60">
              <p className="text-[11px] text-slate-500">Fatigue</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                {report.fatigueDays} j
              </p>
              <p className="text-[10px] text-slate-400">moy {report.avgFatigue}/5</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60">
              <p className="text-[11px] text-slate-500">Migraines</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                {report.migraineDays} j
              </p>
              <p className="text-[10px] text-slate-400">moy {report.avgMigraine}/5</p>
            </div>
          </div>

          {(report.virusDays > 0 || report.antibioticDays > 0) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {report.virusDays > 0 && (
                <span className="px-2.5 py-1 rounded-full font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300">
                  🦠 {report.virusDays} j Virus / Rhume
                </span>
              )}
              {report.antibioticDays > 0 && (
                <span className="px-2.5 py-1 rounded-full font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300">
                  💊 {report.antibioticDays} j Antibiotiques
                </span>
              )}
            </div>
          )}

          {report.totalLoggedDays > 0 && (
            <div className="grid grid-cols-4 gap-2 text-center p-2.5 rounded-2xl bg-amber-50/60 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700/60">
              <div>
                <p className="text-[10px] text-slate-500">Selles/j</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {report.avgStoolCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Liquides</p>
                <p className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
                  {report.liquidStoolDays} j
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Nocturnes</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                  {report.nocturnalStoolDays} j
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Sang</p>
                <p
                  className={`text-sm font-extrabold ${
                    report.bloodStoolDays > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {report.bloodStoolDays} j
                </p>
              </div>
            </div>
          )}

          {report.peakDays.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                Pics repérés ({report.peakDays.length})
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {report.peakDays.map((p) => (
                  <div
                    key={p.date}
                    className="flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 text-slate-800 dark:text-slate-200"
                  >
                    <div>
                      <span className="font-bold">{formatShortDateFr(p.date)}</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {' '}
                        · {p.details.join(', ')}
                      </span>
                    </div>
                    {p.isEndOfCycle && (
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        Fin de cycle
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.topSuspectedFoods.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Aliments suspectés
              </p>
              <div className="flex flex-wrap gap-1.5">
                {report.topSuspectedFoods.map((f) => (
                  <span
                    key={f.food}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300"
                  >
                    {f.food} ({f.count}x)
                  </span>
                ))}
              </div>
            </div>
          )}

          {report.topTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {report.topTags.map((t) => (
                <span
                  key={t.tag}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {t.tag} ({t.count})
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Effet fin de dose chart */}
      <section className="rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Effet « fin de dose » (symptômes avant l'injection)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Score moyen / 5</span>
        </div>

        {report.endOfDoseCurve.some((b) => b.daysCount > 0) ? (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.endOfDoseCurve} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(value) => [`${value} / 5`, 'Moyenne symptômes']}
                />
                <Bar dataKey="avgScore" fill="#0d9488" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Saisissez quelques jours dans le journal pour visualiser si vos symptômes augmentent à l'approche de l'injection.
          </p>
        )}
      </section>

      {/* 3. Évolution biologique */}
      <section className="rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Derniers marqueurs biologiques
          </h3>
        </div>

        {report.labComparisons.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Aucun bilan biologique enregistré pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {report.labComparisons.map((item) => (
              <div
                key={item.meta.key}
                className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60"
              >
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {item.meta.shortLabel}
                </p>
                <p
                  className={`text-lg font-extrabold mt-0.5 ${
                    item.outOfRange
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {item.latestValue}{' '}
                  <span className="text-[11px] font-normal text-slate-500">
                    {item.meta.unit}
                  </span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {formatShortDateFr(item.latestDate)}
                  {item.previousValue !== undefined && ` (vs ${item.previousValue})`}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Email preview */}
      <section className="rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Aperçu du texte prêt à envoyer par mail
        </h3>
        <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50/90 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
          {plainText}
        </pre>
      </section>
    </div>
  )
}
