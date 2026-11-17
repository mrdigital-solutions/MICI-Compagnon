import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

interface WellnessTip {
  category: string
  text: string
  image: string
  badgeClass: string
}

const WELLNESS_TIPS: WellnessTip[] = [
  {
    category: 'Biothérapie',
    text: 'Sortez votre stylo du réfrigérateur 15 à 30 min avant l’injection pour plus de confort.',
    image: './tips/biotherapie.jpg',
    badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  },
  {
    category: 'Hydratation',
    text: 'Buvez par petites gorgées tout au long de la journée. En cas de selles liquides, pensez aux bouillons salés ou tisanes de camomille.',
    image: './tips/hydratation.jpg',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  },
  {
    category: 'Alimentation',
    text: 'En période sensible, fractionnez en 4 à 5 petits repas, mâchez lentement et privilégiez les légumes bien cuits et doux.',
    image: './tips/alimentation.jpg',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  },
  {
    category: 'Stress & Ventre',
    text: '3 minutes de respiration lente (bouton Calme en haut) aident à détendre le nerf vague et apaiser les crampes abdominales.',
    image: './tips/stress.jpg',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  },
  {
    category: 'Rémission',
    text: 'Hors poussée, évitez de garder un régime trop strict inutilement : réintroduisez les aliments un par un en observant votre tolérance.',
    image: './tips/alimentation.jpg',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  {
    category: 'Sommeil',
    text: 'Un coucher à heure régulière aide à réguler l’immunité et réduit la fatigue chronique liée aux MICI.',
    image: './tips/sommeil.jpg',
    badgeClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  },
  {
    category: 'Prévention',
    text: 'En cas de fièvre ou d’infection, décalez l’injection et demandez l’avis de votre médecin avant de la réaliser.',
    image: './tips/biotherapie.jpg',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  },
  {
    category: 'Voyage',
    text: 'En déplacement, transportez toujours vos stylos dans une pochette isotherme (sans contact direct avec le pain de glace) et gardez votre ordonnance.',
    image: './tips/voyage.jpg',
    badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  },
  {
    category: 'Alimentation douce',
    text: 'En cas d’inconfort digestif, le riz blanc, la banane mûre, les carottes cuites et les compotes sans sucre sont souvent très bien tolérés.',
    image: './tips/alimentation.jpg',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  },
  {
    category: 'Soleil & Peau',
    text: 'Certaines biothérapies rendent la peau plus sensible : pensez à une protection solaire (SPF 50) lors des expositions prolongées.',
    image: './tips/voyage.jpg',
    badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  },
  {
    category: 'Hydratation',
    text: 'Limitez les boissons gazeuses, très froides ou très sucrées si vous avez des ballonnements : préférez l’eau tempérée ou les infusions.',
    image: './tips/hydratation.jpg',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  },
  {
    category: 'Mouvement doux',
    text: 'Une marche de 15 à 20 minutes par jour ou des étirements doux soulagent les raideurs articulaires et boostent le moral.',
    image: './tips/stress.jpg',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  {
    category: 'Vaccins & Suivi',
    text: 'Sous biothérapie, les vaccins vivants atténués sont contre-indiqués : demandez toujours conseil à votre gastro-entérologue avant un vaccin.',
    image: './tips/biotherapie.jpg',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  },
  {
    category: 'Écoute de soi',
    text: 'Notez vos repas ou émotions dans le Journal : cela aide souvent à repérer vos propres déclencheurs au fil des semaines.',
    image: './tips/stress.jpg',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  },
  {
    category: 'Tabac & Crohn',
    text: 'Dans la maladie de Crohn, réduire ou arrêter le tabac diminue nettement la fréquence des poussées et améliore l’efficacité du traitement.',
    image: './tips/sommeil.jpg',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  },
  {
    category: 'Moral',
    text: 'Les jours difficiles ne durent pas toujours : avancez un jour à la fois et n’hésitez pas à utiliser l’onglet Rapport pour dialoguer avec votre médecin.',
    image: './tips/sommeil.jpg',
    badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  },
]

const ROTATE_INTERVAL_MS = 8500
const TICK_MS = 50

export function WellnessTipTicker() {
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const step = (TICK_MS / ROTATE_INTERVAL_MS) * 100
    const id = window.setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          setIndex((i) => (i + 1) % WELLNESS_TIPS.length)
          return 0
        }
        return prev + step
      })
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [paused])

  function goTo(nextIndex: number) {
    setIndex(nextIndex)
    setProgress(0)
  }

  const tip = WELLNESS_TIPS[index]

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-white/90 dark:border-slate-800 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3 transition-all"
    >
      <div className="flex items-start gap-3.5">
        <img
          src={tip.image}
          alt={tip.category}
          className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl object-cover shrink-0 shadow-xs border border-white/80 dark:border-slate-700"
        />

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full truncate ${tip.badgeClass}`}
              >
                {tip.category}
              </span>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() =>
                  goTo((index - 1 + WELLNESS_TIPS.length) % WELLNESS_TIPS.length)
                }
                aria-label="Conseil précédent"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => goTo((index + 1) % WELLNESS_TIPS.length)}
                aria-label="Conseil suivant"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-[13px] sm:text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {tip.text}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-[width] duration-75 ease-linear"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[10px] font-medium text-slate-400">
          Conseil {index + 1} / {WELLNESS_TIPS.length}
        </span>
        <span className="text-[10px] text-slate-400">
          Repère bien-être · non médical
        </span>
      </div>
    </section>
  )
}
