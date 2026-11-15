import { HeartPulse, Moon, Settings, ShieldAlert, Sun, Wind } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { CalendarTab } from './components/Calendar/CalendarTab'
import { SetupScheduleModal } from './components/Calendar/SetupScheduleModal'
import { EmergencyCardModal } from './components/Emergency/EmergencyCardModal'
import { DailyJournalSheet } from './components/Journal/DailyJournalSheet'
import { JournalTab } from './components/Journal/JournalTab'
import { LabsTab } from './components/Labs/LabsTab'
import { TopNav } from './components/Layout/TopNav'
import { ReportTab } from './components/Report/ReportTab'
import { SettingsModal } from './components/Settings/SettingsModal'
import { BreathingModal } from './components/Wellness/BreathingModal'
import { DEFAULT_SETTINGS, db, ensureDefaultSettings } from './db/database'
import type { AppTab } from './types'
import { triggerLocalReminderIfNeeded } from './utils/notifications'

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('calendar')
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [breathingOpen, setBreathingOpen] = useState(false)

  const settings = useLiveQuery(() => db.settings.get('default'), [])
  const nextPlanned = useLiveQuery(
    () => db.injections.where('status').equals('planned').sortBy('scheduledDate').then((r) => r[0]),
    [],
  )

  useEffect(() => {
    ensureDefaultSettings()
  }, [])

  const currentSettings = settings ?? DEFAULT_SETTINGS

  useEffect(() => {
    const root = document.documentElement
    if (currentSettings.theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [currentSettings.theme])

  useEffect(() => {
    if (settings && nextPlanned) {
      triggerLocalReminderIfNeeded(nextPlanned, settings)
    }
  }, [settings, nextPlanned])

  async function toggleTheme() {
    const nextTheme = currentSettings.theme === 'dark' ? 'light' : 'dark'
    await db.settings.update('default', { theme: nextTheme })
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-20 pt-3 px-4">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white/75 dark:bg-slate-900/80 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-sm shadow-teal-500/25">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight text-slate-900 dark:text-white">
                  MICI Compagnon
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {currentSettings.treatmentName} · Bien-être & traitement
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:hidden">
              <button
                type="button"
                onClick={() => setBreathingOpen(true)}
                aria-label="Pause respiration calme"
                className="p-2 rounded-xl text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
              >
                <Wind className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setEmergencyOpen(true)}
                aria-label="Carte urgence"
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <ShieldAlert className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Changer de thème"
                className="p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
              >
                {currentSettings.theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Paramètres"
                className="p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          <TopNav activeTab={activeTab} onChange={setActiveTab} />

          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBreathingOpen(true)}
              aria-label="Pause respiration calme"
              title="Pause respiration apaisante"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50/90 dark:bg-sky-950/40 hover:bg-sky-100 transition-colors"
            >
              <Wind className="w-4 h-4" />
              Calme
            </button>
            <button
              type="button"
              onClick={() => setEmergencyOpen(true)}
              aria-label="Carte urgence"
              title="Carte Urgence & Infos médicales"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
              Urgence
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Changer de thème"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
            >
              {currentSettings.theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Paramètres"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-5">
        {activeTab === 'calendar' && (
          <CalendarTab
            settings={currentSettings}
            onSelectDay={(dateKey) => setSelectedDayKey(dateKey)}
          />
        )}
        {activeTab === 'journal' && <JournalTab />}
        {activeTab === 'labs' && <LabsTab />}
        {activeTab === 'report' && <ReportTab />}
      </main>

      <DailyJournalSheet
        dateKey={selectedDayKey}
        onClose={() => setSelectedDayKey(null)}
      />

      {settingsOpen && (
        <SettingsModal
          settings={currentSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {emergencyOpen && (
        <EmergencyCardModal
          settings={currentSettings}
          onClose={() => setEmergencyOpen(false)}
        />
      )}

      {breathingOpen && (
        <BreathingModal onClose={() => setBreathingOpen(false)} />
      )}

      {settings && !settings.onboardingCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-auto">
            <SetupScheduleModal
              initialTreatmentName={currentSettings.treatmentName}
              initialCycleDays={currentSettings.cycleDays}
              onDone={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
