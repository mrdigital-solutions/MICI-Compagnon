import { Pause, Play, RotateCcw, Wind, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BreathingModalProps {
  onClose: () => void
}

const INHALE_SEC = 4
const EXHALE_SEC = 6
const CYCLE_SEC = INHALE_SEC + EXHALE_SEC
const TOTAL_CYCLES = 18 // 3 minutes

export function BreathingModal({ onClose }: BreathingModalProps) {
  const [running, setRunning] = useState(true)
  const [elapsedSec, setElapsedSec] = useState(0)

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => {
        if (prev + 1 >= TOTAL_CYCLES * CYCLE_SEC) {
          setRunning(false)
          return TOTAL_CYCLES * CYCLE_SEC
        }
        return prev + 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [running])

  const cyclePos = elapsedSec % CYCLE_SEC
  const isInhale = cyclePos < INHALE_SEC
  const phaseRemaining = isInhale
    ? INHALE_SEC - cyclePos
    : CYCLE_SEC - cyclePos
  const completedCycles = Math.floor(elapsedSec / CYCLE_SEC)

  const scaleClass = running
    ? isInhale
      ? 'scale-125 bg-gradient-to-br from-teal-300/80 to-sky-300/80'
      : 'scale-90 bg-gradient-to-br from-emerald-200/70 to-teal-200/70'
    : 'scale-100 bg-slate-200/70 dark:bg-slate-800'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-gradient-to-b from-[#FFFDF9] to-[#EFF8F5] dark:from-slate-900 dark:to-slate-950 border border-white/80 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pause respiration calme
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cohérence cardiaque · 4 s inspir / 6 s expir
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center space-y-6">
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed">
            Idéal pour apaiser le stress, détendre le ventre lors d'une crampe ou se poser juste
            avant une injection.
          </p>

          {/* Animated breathing circle */}
          <div className="relative w-52 h-52 flex items-center justify-center">
            <div
              className={`w-36 h-36 rounded-full transition-all ease-in-out flex items-center justify-center shadow-lg ${scaleClass}`}
              style={{
                transitionDuration: isInhale ? '4000ms' : '6000ms',
              }}
            >
              <div className="w-24 h-24 rounded-full bg-white/90 dark:bg-slate-900/90 flex flex-col items-center justify-center shadow-inner">
                <span className="text-2xl font-extrabold text-teal-700 dark:text-teal-300">
                  {running ? `${phaseRemaining}s` : 'Pause'}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {running ? (isInhale ? 'Inspirez' : 'Expirez') : 'Prêt'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Cycle {Math.min(completedCycles + 1, TOTAL_CYCLES)} / {TOTAL_CYCLES}
          </div>

          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-semibold shadow-sm"
            >
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {running ? 'Pause' : 'Reprendre'}
            </button>
            <button
              type="button"
              onClick={() => {
                setElapsedSec(0)
                setRunning(true)
              }}
              aria-label="Recommencer"
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
