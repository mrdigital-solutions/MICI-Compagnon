import {
  AlertTriangle,
  Baby,
  Bone,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CigaretteOff,
  Droplet,
  Footprints,
  Heart,
  Pill,
  Scale,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../../db/database'
import { addDays, getTodayKey } from '../../utils/dateUtils'
import { TIP_TONE_CLASSES, buildTipSequence, type TipVisual } from '../../utils/wellnessTips'

const ROTATE_INTERVAL_MS = 14000
const SWIPE_THRESHOLD_PX = 40

const ICONS: Record<Extract<TipVisual, { kind: 'icon' }>['icon'], LucideIcon> = {
  walk: Footprints,
  sun: Sun,
  smoke: CigaretteOff,
  heart: Heart,
  shield: ShieldCheck,
  pill: Pill,
  bone: Bone,
  briefcase: Briefcase,
  users: Users,
  baby: Baby,
  alert: AlertTriangle,
  blood: Droplet,
  scale: Scale,
  calendar: CalendarDays,
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function WellnessTipTicker() {
  const today = getTodayKey()
  const settings = useLiveQuery(() => db.settings.get('default'), [])
  const injections = useLiveQuery(() => db.injections.where('status').equals('planned').toArray(), [])
  const dailyEntries = useLiveQuery(
    () => db.dailyEntries.where('date').aboveOrEqual(addDays(today, -31)).toArray(),
    [today],
  )

  const tips = useMemo(
    () => buildTipSequence({ today, settings, injections, dailyEntries }),
    [today, settings, injections, dailyEntries],
  )
  const personalCount = tips.filter((t) => t.personal).length
  const personalKey = tips
    .filter((t) => t.personal)
    .map((t) => t.id)
    .join('|')

  const [index, setIndex] = useState(0)
  const [autoplay, setAutoplay] = useState(() => !prefersReducedMotion())
  const [hovered, setHovered] = useState(false)
  const [touching, setTouching] = useState(false)
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  const touchStartX = useRef<number | null>(null)

  // Nouveaux conseils personnels : on revient au premier
  const [seenPersonalKey, setSeenPersonalKey] = useState(personalKey)
  if (seenPersonalKey !== personalKey) {
    setSeenPersonalKey(personalKey)
    setIndex(0)
  }

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const count = tips.length
  const safeIndex = count > 0 ? index % count : 0
  const tip = tips[safeIndex]
  const paused = !autoplay || hovered || touching || hidden

  function goTo(next: number, manual: boolean) {
    if (count === 0) return
    setIndex(((next % count) + count) % count)
    // Dès que la personne navigue elle-même, on arrête le défilement automatique
    if (manual) setAutoplay(false)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null
    setTouching(true)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    setTouching(false)
    const start = touchStartX.current
    touchStartX.current = null
    const end = e.changedTouches[0]?.clientX
    if (start === null || end === undefined) return
    const dx = end - start
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
    goTo(safeIndex + (dx < 0 ? 1 : -1), true)
  }

  if (!tip) return null
  const tone = TIP_TONE_CLASSES[tip.tone]
  const VisualIcon = tip.visual.kind === 'icon' ? ICONS[tip.visual.icon] : null

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="Conseils bien-être"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => setTouching(false)}
      className="rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3 select-none"
    >
      <div className="flex items-start gap-3.5">
        {tip.visual.kind === 'image' ? (
          <img
            src={tip.visual.src}
            alt=""
            className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl object-cover shrink-0 shadow-xs border border-white/80 dark:border-slate-700"
          />
        ) : (
          <div
            aria-hidden="true"
            className={`w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl shrink-0 flex items-center justify-center ${tone.tile}`}
          >
            {VisualIcon && <VisualIcon className="w-8 h-8" strokeWidth={1.75} />}
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            {tip.personal ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <UserRound className="w-3 h-3" />
                Pour vous
              </span>
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full truncate ${tone.badge}`}>
              {tip.category}
            </span>
          </div>

          <p
            aria-live={autoplay ? 'off' : 'polite'}
            className="text-[13px] sm:text-sm leading-relaxed text-slate-700 dark:text-slate-200"
          >
            {tip.text}
          </p>
        </div>
      </div>

      {/* Barre de progression (animation CSS, s'arrête quand le défilement est en pause) */}
      <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {autoplay ? (
          <div
            key={`${safeIndex}-${count}`}
            onAnimationEnd={() => goTo(safeIndex + 1, false)}
            className="h-full w-full origin-left rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
            style={{
              animation: `tip-progress ${ROTATE_INTERVAL_MS}ms linear forwards`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
        ) : (
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-[width] duration-300"
            style={{ width: `${((safeIndex + 1) / count) * 100}%` }}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-400">
          {tip.personal
            ? `Pour vous ${safeIndex + 1} / ${personalCount}`
            : `Conseil ${safeIndex - personalCount + 1} / ${count - personalCount}`}
          <span className="hidden sm:inline"> · Repère bien-être, non médical</span>
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => goTo(safeIndex - 1, true)}
            aria-label="Conseil précédent"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 bg-slate-100/80 dark:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => goTo(safeIndex + 1, true)}
            aria-label="Conseil suivant"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 bg-slate-100/80 dark:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="sm:hidden -mt-1 text-[10px] text-slate-400">
        Repère bien-être, non médical · glissez pour changer
      </p>
    </section>
  )
}
