import { Edit3, Phone, ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'
import { db } from '../../db/database'
import type { AppSettings } from '../../types'

interface EmergencyCardModalProps {
  settings: AppSettings
  onClose: () => void
}

export function EmergencyCardModal({ settings, onClose }: EmergencyCardModalProps) {
  const [editing, setEditing] = useState(false)
  const [doctorName, setDoctorName] = useState(settings.doctorName ?? '')
  const [doctorPhone, setDoctorPhone] = useState(settings.doctorPhone ?? '')
  const [emergencyNotes, setEmergencyNotes] = useState(settings.emergencyNotes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await db.settings.update('default', {
        doctorName: doctorName.trim(),
        doctorPhone: doctorPhone.trim(),
        emergencyNotes: emergencyNotes.trim(),
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#FFFCF8] dark:bg-slate-900 border border-rose-200/70 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6" />
            <div>
              <h2 className="text-base font-extrabold">Carte Urgence & Infos</h2>
              <p className="text-[11px] text-rose-100">Accès rapide hors-ligne</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Urgent Toilet Access Card */}
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800/70 text-center space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Besoin urgent · Maladie chronique (MICI)
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
              Je suis atteint(e) d'une maladie inflammatoire chronique de l'intestin (Crohn / RCH).
              Merci de me laisser accéder aux toilettes en urgence.
            </p>
          </div>

          {/* Medical Info */}
          {!editing ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Traitement en cours</span>
                  <strong className="text-slate-900 dark:text-white">
                    {settings.treatmentName}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Gastro-entérologue</span>
                  <strong className="text-slate-900 dark:text-white">
                    {settings.doctorName || 'Non renseigné'}
                  </strong>
                </div>
                {settings.doctorPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Téléphone</span>
                    <a
                      href={`tel:${settings.doctorPhone}`}
                      className="inline-flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {settings.doctorPhone}
                    </a>
                  </div>
                )}
                {settings.emergencyNotes && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400 mb-0.5">
                      Allergies / Groupe sanguin / Notes :
                    </p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {settings.emergencyNotes}
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setEditing(true)}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Modifier mes informations médicales
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nom du gastro-entérologue
                </label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Ex: Dr Nadia Bouarioua"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Téléphone du cabinet / service
                </label>
                <input
                  type="tel"
                  value={doctorPhone}
                  onChange={(e) => setDoctorPhone(e.target.value)}
                  placeholder="Ex: 04 72 82 67 16"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Allergies, groupe sanguin, contact d'urgence
                </label>
                <textarea
                  rows={2}
                  value={emergencyNotes}
                  onChange={(e) => setEmergencyNotes(e.target.value)}
                  placeholder="Ex: Groupe A+, allergie pénicilline..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-semibold"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
