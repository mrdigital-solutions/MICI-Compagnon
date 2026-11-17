import {
  Bell,
  Coffee,
  Lock,
  Download,
  ExternalLink,
  RefreshCw,
  Smartphone,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  APP_VERSION,
  CHANGELOG,
  DONATION_URL,
  TREATMENT_PRESETS,
} from '../../config/support'
import {
  BackupFormatError,
  applyTreatmentToPlanned,
  db,
  exportAllDataToJson,
  parseBackupJson,
  restoreBackup,
  updateCycleDaysAndRecalculate,
  type ParsedBackup,
} from '../../db/database'
import type { AppSettings, PatientSex } from '../../types'
import { formatDateFr, getTodayKey, toDateKey } from '../../utils/dateUtils'
import { isOralTreatment } from '../../utils/treatment'
import {
  isNotificationSupported,
  requestNotificationPermission,
} from '../../utils/notifications'
import {
  canPromptPwaInstall,
  isStandalonePwa,
  promptPwaInstall,
  subscribePwaInstall,
} from '../../utils/pwaInstall'
import { SetupScheduleModal } from '../Calendar/SetupScheduleModal'

interface SettingsModalProps {
  settings: AppSettings
  onClose: () => void
}

export function SettingsModal({ settings, onClose }: SettingsModalProps) {
  const [treatmentName, setTreatmentName] = useState(settings.treatmentName)
  const [treatmentIsCustom, setTreatmentIsCustom] = useState(
    () => !TREATMENT_PRESETS.some((p) => p.name === settings.treatmentName),
  )
  const [cycleDays, setCycleDays] = useState(settings.cycleDays)
  const [secondaryTreatmentName, setSecondaryTreatmentName] = useState(
    settings.secondaryTreatmentName ?? '',
  )
  const [secondaryIsCustom, setSecondaryIsCustom] = useState(
    () =>
      Boolean(settings.secondaryTreatmentName) &&
      !TREATMENT_PRESETS.some((p) => p.name === settings.secondaryTreatmentName),
  )
  const [secondaryCycleDays, setSecondaryCycleDays] = useState(
    settings.secondaryCycleDays ?? 7,
  )
  const [secondaryNextDate, setSecondaryNextDate] = useState(
    settings.secondaryNextDate ?? '',
  )
  const [penStock, setPenStock] = useState(settings.penStock ?? 2)
  const [nextDoctorAppointment, setNextDoctorAppointment] = useState(
    settings.nextDoctorAppointment ?? '',
  )
  const [nextLabDate, setNextLabDate] = useState(settings.nextLabDate ?? '')
  const [reminderDayBefore, setReminderDayBefore] = useState(settings.reminderDayBefore)
  const [reminderSameDay, setReminderSameDay] = useState(settings.reminderSameDay)
  const [reminderHour, setReminderHour] = useState(settings.reminderHour || '09:00')
  const [patientSex, setPatientSex] = useState<PatientSex | ''>(settings.patientSex ?? '')
  const [pendingBackup, setPendingBackup] = useState<ParsedBackup | null>(null)
  const [importing, setImporting] = useState(false)
  const [notifStatus, setNotifStatus] = useState<string>(
    isNotificationSupported() ? Notification.permission : 'unsupported',
  )
  const [showReschedule, setShowReschedule] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [canInstall, setCanInstall] = useState(() => canPromptPwaInstall())
  const [feedback, setFeedback] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return subscribePwaInstall(() => setCanInstall(canPromptPwaInstall()))
  }, [])

  async function handleSaveSettings() {
    const nextTreatment = treatmentName.trim() || settings.treatmentName
    if (cycleDays !== settings.cycleDays) {
      await updateCycleDaysAndRecalculate(cycleDays)
    }
    if (nextTreatment !== settings.treatmentName) {
      // Met à jour la dose et la rotation des sites des prises encore prévues
      await applyTreatmentToPlanned(nextTreatment)
    }
    await db.settings.update('default', {
      treatmentName: nextTreatment,
      secondaryTreatmentName: secondaryTreatmentName.trim() || undefined,
      secondaryCycleDays: secondaryTreatmentName.trim() ? secondaryCycleDays : undefined,
      secondaryNextDate:
        secondaryTreatmentName.trim() && secondaryNextDate
          ? secondaryNextDate
          : secondaryTreatmentName.trim()
            ? getTodayKey()
            : undefined,
      penStock,
      nextDoctorAppointment: nextDoctorAppointment || undefined,
      nextLabDate: nextLabDate || undefined,
      reminderDayBefore,
      reminderSameDay,
      reminderHour,
      patientSex: patientSex || undefined,
    })
    setFeedback('Paramètres enregistrés.')
    setTimeout(() => setFeedback(null), 2000)
  }

  async function handleEnableNotifications() {
    const result = await requestNotificationPermission()
    setNotifStatus(result)
  }

  async function handleExportJson() {
    const json = await exportAllDataToJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mici-compagnon-sauvegarde-${getTodayKey()}.json`
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  /** Étape 1 : lecture et vérification du fichier, sans rien modifier. */
  async function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Réinitialise le champ pour pouvoir re-sélectionner le même fichier
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      setPendingBackup(parseBackupJson(text))
      setFeedback(null)
    } catch (err) {
      setPendingBackup(null)
      setFeedback(
        err instanceof BackupFormatError
          ? `Erreur : ${err.message}`
          : 'Erreur : impossible de lire ce fichier.',
      )
    }
  }

  /** Étape 2 : remplacement des données après confirmation explicite. */
  async function handleConfirmRestore() {
    if (!pendingBackup) return
    setImporting(true)
    try {
      await restoreBackup(pendingBackup)
      setPendingBackup(null)
      setFeedback('Sauvegarde restaurée avec succès.')
    } catch {
      setFeedback('Erreur pendant la restauration : vos données actuelles sont conservées.')
    } finally {
      setImporting(false)
    }
  }

  async function handleForceAppUpdate() {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((reg) => reg.unregister()))
    }
    if ('caches' in window) {
      const cacheKeys = await window.caches.keys()
      await Promise.all(cacheKeys.map((key) => window.caches.delete(key)))
    }
    window.location.reload()
  }

  async function handleResetAll() {
    await db.transaction(
      'rw',
      db.injections,
      db.dailyEntries,
      db.labResults,
      db.settings,
      async () => {
        await Promise.all([
          db.injections.clear(),
          db.dailyEntries.clear(),
          db.labResults.clear(),
          db.settings.clear(),
        ])
      },
    )
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Paramètres & Sauvegarde
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {showReschedule ? (
            <SetupScheduleModal
              initialTreatmentName={settings.treatmentName}
              initialCycleDays={settings.cycleDays}
              onDone={() => setShowReschedule(false)}
              onCancel={() => setShowReschedule(false)}
            />
          ) : (
            <>
              {/* Treatment & cycle (grouped cleanly at the top) */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Traitement principal
                  </label>
                  <select
                    value={treatmentIsCustom ? '__custom__' : treatmentName}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '__custom__') {
                        setTreatmentIsCustom(true)
                      } else {
                        setTreatmentIsCustom(false)
                        setTreatmentName(val)
                        const found = TREATMENT_PRESETS.find((p) => p.name === val)
                        if (found) setCycleDays(found.cycleDays)
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    {TREATMENT_PRESETS.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.cycleDays} j)
                      </option>
                    ))}
                    <option value="__custom__">Autre traitement (saisie libre)...</option>
                  </select>
                  {treatmentIsCustom && (
                    <input
                      type="text"
                      value={treatmentName}
                      onChange={(e) => setTreatmentName(e.target.value)}
                      placeholder="Nom et dosage du traitement..."
                      className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    2e traitement (Combothérapie · optionnel)
                  </label>
                  <select
                    value={
                      !secondaryTreatmentName && !secondaryIsCustom
                        ? ''
                        : secondaryIsCustom
                          ? '__custom__'
                          : secondaryTreatmentName
                    }
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '') {
                        setSecondaryIsCustom(false)
                        setSecondaryTreatmentName('')
                      } else if (val === '__custom__') {
                        setSecondaryIsCustom(true)
                        if (!secondaryTreatmentName) setSecondaryTreatmentName('')
                        if (!secondaryNextDate) {
                          setSecondaryNextDate(getTodayKey())
                        }
                      } else {
                        setSecondaryIsCustom(false)
                        setSecondaryTreatmentName(val)
                        const found = TREATMENT_PRESETS.find((p) => p.name === val)
                        if (found) setSecondaryCycleDays(found.cycleDays)
                        if (!secondaryNextDate) {
                          setSecondaryNextDate(getTodayKey())
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="">Aucun</option>
                    {TREATMENT_PRESETS.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.cycleDays} j)
                      </option>
                    ))}
                    <option value="__custom__">Autre traitement (saisie libre)...</option>
                  </select>
                  {secondaryIsCustom && (
                    <input
                      type="text"
                      value={secondaryTreatmentName}
                      onChange={(e) => setSecondaryTreatmentName(e.target.value)}
                      placeholder="Nom du 2e traitement (ex: Méthotrexate 15 mg)..."
                      className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white"
                    />
                  )}
                  {(secondaryTreatmentName.trim() || secondaryIsCustom) && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Cycle 2e (jours)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={secondaryCycleDays}
                          onChange={(e) => setSecondaryCycleDays(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Prochaine prise
                        </label>
                        <input
                          type="date"
                          value={secondaryNextDate}
                          onChange={(e) => setSecondaryNextDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Cycle principal (en jours)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={cycleDays}
                      onChange={(e) => setCycleDays(Number(e.target.value))}
                      className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowReschedule(true)}
                      className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Replanifier
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className={isOralTreatment(treatmentName) ? 'hidden' : ''}>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Stock stylos
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={penStock}
                      onChange={(e) => setPenStock(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Prochain RDV Gastro
                    </label>
                    <input
                      type="date"
                      value={nextDoctorAppointment}
                      onChange={(e) => setNextDoctorAppointment(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Prochaine prise de sang
                  </label>
                  <input
                    type="date"
                    value={nextLabDate}
                    onChange={(e) => setNextLabDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Sexe (valeurs de référence des bilans)
                  </label>
                  <select
                    value={patientSex}
                    onChange={(e) => setPatientSex(e.target.value as PatientSex | '')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="">Non renseigné (normes hommes par défaut)</option>
                    <option value="F">Femme</option>
                    <option value="M">Homme</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Certaines normes (hématies, transaminases, GGT) diffèrent selon le sexe. Les
                    valeurs du laboratoire font toujours foi.
                  </p>
                </div>
              </div>

              {/* Reminders */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Rappels locaux
                </p>
                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-sm">
                  <span>Rappel la veille (J-1)</span>
                  <input
                    type="checkbox"
                    checked={reminderDayBefore}
                    onChange={(e) => setReminderDayBefore(e.target.checked)}
                    className="w-4 h-4 accent-teal-600"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-sm">
                  <span>Rappel le jour J</span>
                  <input
                    type="checkbox"
                    checked={reminderSameDay}
                    onChange={(e) => setReminderSameDay(e.target.checked)}
                    className="w-4 h-4 accent-teal-600"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-sm">
                  <span>Heure du rappel</span>
                  <input
                    type="time"
                    value={reminderHour}
                    onChange={(e) => setReminderHour(e.target.value || '09:00')}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                  />
                </label>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Les notifications s'affichent quand l'application est ouverte. Pour un rappel
                  garanti même appli fermée, utilisez « Ajouter le rappel à mon Agenda (.ics) » sur
                  le calendrier.
                </p>

                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-teal-500/40 text-teal-700 dark:text-teal-300 bg-teal-500/10 text-xs font-semibold"
                >
                  <Bell className="w-4 h-4" />
                  {notifStatus === 'granted'
                    ? 'Notifications système autorisées'
                    : notifStatus === 'denied'
                      ? 'Notifications bloquées par le navigateur'
                      : 'Activer les notifications système'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
              >
                Enregistrer les préférences
              </button>

              {/* Backup & Restore */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sauvegarde (changement de téléphone)
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <Download className="w-4 h-4" />
                    Sauvegarder
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <Upload className="w-4 h-4" />
                    Restaurer
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportJson}
                    className="hidden"
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Le fichier contient toutes vos données de santé en clair (journal, bilans et PDF,
                  carte de priorité) : conservez-le en lieu sûr et ne le partagez pas.
                </p>

                {pendingBackup && (
                  <div className="p-3 rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/80 dark:bg-rose-950/30 space-y-2">
                    <p className="text-xs font-semibold text-rose-900 dark:text-rose-100">
                      Remplacer toutes vos données actuelles par cette sauvegarde
                      {pendingBackup.exportedAt
                        ? ` du ${formatDateFr(toDateKey(new Date(pendingBackup.exportedAt)), { day: 'numeric', month: 'long', year: 'numeric' })}`
                        : ''}{' '}
                      ?
                    </p>
                    <p className="text-[11px] text-rose-800 dark:text-rose-200">
                      {pendingBackup.injections.length} prise(s), {pendingBackup.dailyEntries.length}{' '}
                      jour(s) de journal, {pendingBackup.labResults.length} bilan(s). Les données
                      actuelles de ce téléphone seront effacées.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPendingBackup(null)}
                        className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmRestore}
                        disabled={importing}
                        className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold"
                      >
                        {importing ? 'Restauration...' : 'Remplacer mes données'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {feedback && (
                <p className="text-center text-xs font-semibold text-teal-600 dark:text-teal-400">
                  {feedback}
                </p>
              )}

              {/* Install PWA button (when not already running standalone) */}
              {!isStandalonePwa() && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  {canInstall ? (
                    <button
                      type="button"
                      onClick={() => promptPwaInstall()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-xs transition-colors"
                    >
                      <Smartphone className="w-4 h-4" />
                      Installer l'application sur l'écran d'accueil
                    </button>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                      Pour installer l'appli : sur Android, menu <strong>⋮</strong> (descendre en
                      bas) → <strong>Ajouter à l'écran d'accueil</strong> ; sur iPhone,{' '}
                      <strong>Partager → Sur l'écran d'accueil</strong>.
                    </p>
                  )}
                </div>
              )}

              {/* Force PWA cache refresh (preserves IndexedDB data) */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
                <button
                  type="button"
                  onClick={handleForceAppUpdate}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50/70 dark:bg-teal-950/30 hover:bg-teal-100/70 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Forcer la mise à jour de l'application
                </button>
              </div>

              {/* Reset local data */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Réinitialiser l'application (repartir à zéro)
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                    >
                      Confirmer la remise à zéro
                    </button>
                  </div>
                )}
              </div>

              {/* Confidentialité */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                  Confidentialité
                </p>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  Vos données de santé restent uniquement sur cet appareil : aucun compte, aucun
                  serveur, rien n'est envoyé. Seule une mesure d'audience anonyme (GoatCounter, sans
                  cookie ni donnée de santé) compte les visites et installations de l'application.
                </p>
              </div>

              {/* Changelog / Nouveautés */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowChangelog((v) => !v)}
                  className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <span>Nouveautés de l'application (v{APP_VERSION})</span>
                  <span className="text-teal-600 dark:text-teal-400">
                    {showChangelog ? 'Masquer' : 'Voir'}
                  </span>
                </button>
                {showChangelog && (
                  <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60 space-y-3 text-[11px] text-slate-600 dark:text-slate-300">
                    {CHANGELOG.map((rel) => (
                      <div key={rel.version} className="space-y-1">
                        <p className="font-bold text-slate-800 dark:text-slate-100">
                          Version {rel.version}
                        </p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {rel.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Support / Donation card */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/70 dark:from-slate-800/80 dark:to-slate-800 border border-amber-200/60 dark:border-slate-700 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs font-bold">Soutenir MICI Compagnon (Bêta gratuite)</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    Phase de test 100 % gratuite, sans pub et privée (données stockées sur votre
                    appareil). Les personnes qui soutiennent le projet pendant cette période auront
                    l'accès à vie offert à la future version complète.
                  </p>
                  {DONATION_URL ? (
                    <a
                      href={DONATION_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
                    >
                      <Coffee className="w-4 h-4" />
                      Soutenir le projet sur Ko-fi
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <p className="text-[11px] font-medium text-amber-800/80 dark:text-amber-300/80">
                      Lien de don à configurer dans{' '}
                      <code className="px-1 py-0.5 rounded bg-white/70 dark:bg-slate-900">
                        src/config/support.ts
                      </code>
                      .
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
