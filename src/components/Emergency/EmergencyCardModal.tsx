import {
  Camera,
  Edit3,
  HeartHandshake,
  Maximize2,
  Phone,
  ShieldAlert,
  Stethoscope,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../../db/database'
import type { AppSettings } from '../../types'

interface EmergencyCardModalProps {
  settings: AppSettings
  onClose: () => void
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export function EmergencyCardModal({ settings, onClose }: EmergencyCardModalProps) {
  const [view, setView] = useState<'toilet' | 'medical'>('toilet')
  const [editing, setEditing] = useState(false)

  const [patientName, setPatientName] = useState(settings.patientName ?? '')
  const [bloodGroup, setBloodGroup] = useState(settings.bloodGroup ?? '')
  const [allergies, setAllergies] = useState(settings.allergies ?? '')
  const [doctorName, setDoctorName] = useState(settings.doctorName ?? '')
  const [doctorPhone, setDoctorPhone] = useState(settings.doctorPhone ?? '')
  const [emergencyContactName, setEmergencyContactName] = useState(
    settings.emergencyContactName ?? '',
  )
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    settings.emergencyContactPhone ?? '',
  )
  const [emergencyNotes, setEmergencyNotes] = useState(settings.emergencyNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [fullscreenCard, setFullscreenCard] = useState(false)
  const cardInputRef = useRef<HTMLInputElement>(null)

  const cardPreviewUrl = useMemo(() => {
    if (settings.priorityCardBlob instanceof Blob) {
      return URL.createObjectURL(settings.priorityCardBlob)
    }
    return null
  }, [settings.priorityCardBlob])

  useEffect(() => {
    return () => {
      if (cardPreviewUrl) URL.revokeObjectURL(cardPreviewUrl)
    }
  }, [cardPreviewUrl])

  async function handleCardUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const blob = new Blob([await file.arrayBuffer()], {
      type: file.type || 'image/jpeg',
    })
    await db.settings.update('default', {
      priorityCardBlob: blob,
      priorityCardName: file.name,
    })
  }

  async function handleRemoveCard() {
    await db.settings.update('default', {
      priorityCardBlob: undefined,
      priorityCardName: undefined,
    })
    setFullscreenCard(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await db.settings.update('default', {
        patientName: patientName.trim() || undefined,
        bloodGroup: bloodGroup || undefined,
        allergies: allergies.trim() || undefined,
        doctorName: doctorName.trim() || undefined,
        doctorPhone: doctorPhone.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        emergencyNotes: emergencyNotes.trim() || undefined,
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

        {/* Switcher: Accès Toilettes (discret) vs Fiche Secours */}
        {!editing && (
          <div className="px-5 pt-4 shrink-0">
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setView('toilet')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  view === 'toilet'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Carte Toilettes
              </button>
              <button
                type="button"
                onClick={() => setView('medical')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  view === 'medical'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Fiche Secours
              </button>
            </div>
          </div>
        )}

        <div className="p-5 space-y-4 overflow-y-auto">
          {!editing && view === 'toilet' && (
            <div className="space-y-4">
              <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800/70 text-center space-y-3">
                <span className="inline-block px-3 py-1 rounded-full bg-rose-500 text-white text-[11px] font-extrabold uppercase tracking-wider">
                  Urgence Médicale · MICI
                </span>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                  Je suis atteint(e) d'une maladie chronique de l'intestin (Crohn / RCH).
                </p>
                <p className="text-base font-bold text-rose-700 dark:text-rose-300">
                  Merci de me laisser accéder aux toilettes en urgence.
                </p>
              </div>

              {/* Priority / AFA Card Photo */}
              <div className="space-y-2">
                {cardPreviewUrl ? (
                  <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        Ma carte de priorité / AFA
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFullscreenCard(true)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold"
                        >
                          <Maximize2 className="w-3 h-3" />
                          Agrandir
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveCard}
                          aria-label="Supprimer la carte"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFullscreenCard(true)}
                      className="w-full block overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700"
                    >
                      <img
                        src={cardPreviewUrl}
                        alt="Carte de priorité"
                        className="w-full max-h-56 object-contain bg-slate-50 dark:bg-slate-900"
                      />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => cardInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-dashed border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50 text-xs font-bold text-rose-700 dark:text-rose-300 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Ajouter ma carte en photo (AFA / CMI Priorité)
                  </button>
                )}
                <input
                  ref={cardInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCardUpload}
                  className="hidden"
                />
              </div>

              <p className="text-[11px] text-center text-slate-400">
                Stocké uniquement sur votre téléphone · Aucune donnée médicale affichée ici.
              </p>
            </div>
          )}

          {!editing && view === 'medical' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-3 text-sm">
                {(settings.patientName || settings.bloodGroup) && (
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <strong className="text-slate-900 dark:text-white">
                        {settings.patientName || 'Patient'}
                      </strong>
                    </div>
                    {settings.bloodGroup && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 text-xs font-extrabold">
                        Groupe {settings.bloodGroup}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Traitement en cours
                  </span>
                  <div className="text-right">
                    <strong className="block text-slate-900 dark:text-white">
                      {settings.treatmentName}
                    </strong>
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      Biothérapie / Immunosuppresseur
                    </span>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Allergies</span>
                  <strong className="text-right text-slate-900 dark:text-white">
                    {settings.allergies || 'Aucune signalée'}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Gastro</span>
                  </div>
                  <div className="text-right">
                    <strong className="block text-slate-900 dark:text-white">
                      {settings.doctorName || 'Non renseigné'}
                    </strong>
                    {settings.doctorPhone && (
                      <a
                        href={`tel:${settings.doctorPhone}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400"
                      >
                        <Phone className="w-3 h-3" />
                        {settings.doctorPhone}
                      </a>
                    )}
                  </div>
                </div>

                {(settings.emergencyContactName || settings.emergencyContactPhone) && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
                      <span>Proche à prévenir</span>
                    </div>
                    <div className="text-right">
                      <strong className="block text-slate-900 dark:text-white">
                        {settings.emergencyContactName || 'Contact'}
                      </strong>
                      {settings.emergencyContactPhone && (
                        <a
                          href={`tel:${settings.emergencyContactPhone}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400"
                        >
                          <Phone className="w-3 h-3" />
                          {settings.emergencyContactPhone}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {settings.emergencyNotes && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                    <p className="text-slate-500 dark:text-slate-400 mb-0.5">Autres notes :</p>
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
          )}

          {editing && (
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Nom & Prénom
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Ex: Mohamed R."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Groupe sanguin
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  >
                    <option value="">Non renseigné</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Allergies médicamenteuses / autres
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="Ex: Pénicilline, aucune..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Gastro-entérologue
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="Dr ..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Tél. Gastro
                  </label>
                  <input
                    type="tel"
                    value={doctorPhone}
                    onChange={(e) => setDoctorPhone(e.target.value)}
                    placeholder="04 72..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Proche à prévenir
                  </label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="Nom du proche"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Tél. proche
                  </label>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="06 ..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Autres notes
                </label>
                <textarea
                  rows={2}
                  value={emergencyNotes}
                  onChange={(e) => setEmergencyNotes(e.target.value)}
                  placeholder="N° Sécu, hôpital de suivi..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
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

      {fullscreenCard && cardPreviewUrl && (
        <div
          onClick={() => setFullscreenCard(false)}
          className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setFullscreenCard(false)}
            className="self-end mb-3 p-2.5 rounded-full bg-white/15 text-white"
            aria-label="Fermer l'aperçu"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={cardPreviewUrl}
            alt="Carte de priorité en plein écran"
            className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}
