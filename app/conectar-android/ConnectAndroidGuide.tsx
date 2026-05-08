'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  BatteryCharging,
  Check,
  ChevronLeft,
  CircleAlert,
  ExternalLink,
  HeartPulse,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react'

type Issue = 'after-update' | 'never-counted' | 'still-not-working'
type StepId =
  | 'issue'
  | 'reset-permissions'
  | 'health-connect'
  | 'battery-pasito'
  | 'battery-source'
  | 'test'
  | 'done'

type Choice<T extends string> = {
  id: T
  label: string
  detail: string
  icon: LucideIcon
}

type ActionLink = {
  label: string
  href: string
}

const HEALTH_CONNECT_URL =
  'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata'

const issueOptions: Choice<Issue>[] = [
  {
    id: 'after-update',
    label: 'Se desconectó',
    detail: 'Pasó después de actualizar Pasito.',
    icon: RefreshCcw,
  },
  {
    id: 'never-counted',
    label: 'Nunca contó',
    detail: 'Pasito nunca sumó pasos.',
    icon: HeartPulse,
  },
  {
    id: 'still-not-working',
    label: 'Sigue sin contar',
    detail: 'Ya revisaste permisos.',
    icon: BatteryCharging,
  },
]

function getStepOrder(issue: Issue | null): StepId[] {
  if (issue === 'after-update') {
    return ['issue', 'reset-permissions', 'test', 'battery-pasito', 'battery-source', 'done']
  }

  if (issue === 'never-counted') {
    return ['issue', 'health-connect', 'reset-permissions', 'test', 'battery-pasito', 'battery-source', 'done']
  }

  if (issue === 'still-not-working') {
    return ['issue', 'battery-pasito', 'battery-source', 'test', 'done']
  }

  return ['issue']
}

export function ConnectAndroidGuide() {
  const [issue, setIssue] = useState<Issue | null>(null)
  const [stepIndex, setStepIndex] = useState(0)

  const steps = useMemo(() => getStepOrder(issue), [issue])
  const stepId = steps[Math.min(stepIndex, steps.length - 1)]
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100)

  const goNext = () => {
    setStepIndex((current) => Math.min(current + 1, steps.length - 1))
  }

  const goBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0))
  }

  const reset = () => {
    setIssue(null)
    setStepIndex(0)
  }

  const chooseIssue = (value: Issue) => {
    setIssue(value)
    setStepIndex(1)
  }

  return (
    <main className="min-h-[100svh] bg-[#F4F7F2] text-[#143628]">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-[430px] flex-col bg-[#F4F7F2]">
        <header className="sticky top-0 z-20 border-b border-[#D8E2D4] bg-[#F4F7F2]/96 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur">
          <div className="flex h-11 items-center justify-between">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#0C6B45]"
              aria-label="Volver"
            >
              <ArrowLeft size={22} />
            </Link>
            <Image
              src="/pasitohorizontal.png"
              alt="Pasito"
              width={86}
              height={21}
              priority
              style={{ height: 'auto' }}
            />
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={reset}
                className="h-10 rounded-full px-3 text-xs font-bold text-[#49715E]"
              >
                Reiniciar
              </button>
            ) : (
              <span className="w-[68px]" aria-hidden />
            )}
          </div>

          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#49715E]">
              <span>Paso {stepIndex + 1}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#DDE7D9]">
              <div
                className="h-full rounded-full bg-[#0C6B45] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </header>

        <section className="flex flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+92px)] pt-4">
          {stepId === 'issue' && (
            <ChoiceStep
              title="Pasito Android"
              lead="Elegí qué te está pasando con los pasos."
              options={issueOptions}
              value={issue}
              onChoose={chooseIssue}
            />
          )}

          {stepId === 'reset-permissions' && (
            <ActionStep
              icon={RefreshCcw}
              title="Resetear permisos"
              lead="Sacá y volvé a dar permisos para conectar las apps de nuevo."
              bullets={[
                'Abrí Health Connect.',
                'Entrá en Apps conectadas o Permisos de apps.',
                'Abrí cada app: Pasito, Samsung Health, Mi Fitness, Google Fit o tu app de pasos.',
                'Sacale todos los permisos.',
                'Si aparece, tocá "Borrar los datos de esta app en Health Connect".',
                'Volvé a entrar a cada app y activá los permisos otra vez.',
              ]}
              primaryLabel="Ya reseteé permisos"
              onPrimary={goNext}
            />
          )}

          {stepId === 'health-connect' && (
            <ActionStep
              icon={ShieldCheck}
              title="Revisar Health Connect"
              lead="Pasito lee los pasos desde Health Connect. Si ahí no hay datos, Pasito no puede leer nada."
              bullets={[
                'Asegurate de tener Health Connect instalado.',
                'Entrá a Health Connect.',
                'Revisá que Pasito tenga permiso.',
                'Revisá que tu app de pasos tenga permiso: Samsung Health, Mi Fitness, Google Fit u otra.',
                'Entrá en Datos y acceso.',
                'Fijate si aparecen datos de Pasos.',
                'Si dice "No hay datos disponibles", reseteá permisos en el próximo paso.',
              ]}
              links={[
                {
                  label: 'Abrir Health Connect',
                  href: HEALTH_CONNECT_URL,
                },
              ]}
              primaryLabel="Seguir"
              onPrimary={goNext}
            />
          )}

          {stepId === 'battery-pasito' && (
            <ActionStep
              icon={BatteryCharging}
              title="Batería de Pasito"
              lead="Algunos celulares bloquean apps en segundo plano."
              bullets={[
                'Abrí Ajustes.',
                'Entrá en Aplicaciones.',
                'Buscá Pasito.',
                'Entrá en Batería.',
                'Seleccioná No restringido.',
              ]}
              primaryLabel="Listo"
              onPrimary={goNext}
            />
          )}

          {stepId === 'battery-source' && (
            <ActionStep
              icon={BatteryCharging}
              title="Batería de la app de pasos"
              lead="Hacé lo mismo con la app que cuenta tus pasos."
              bullets={[
                'Abrí Ajustes.',
                'Entrá en Aplicaciones.',
                'Buscá Samsung Health, Mi Fitness, Google Fit o tu app de pasos.',
                'Entrá en Batería.',
                'Seleccioná No restringido.',
              ]}
              primaryLabel="Listo"
              onPrimary={goNext}
            />
          )}

          {stepId === 'test' && (
            <ActionStep
              icon={Check}
              title="Probá otra vez"
              lead="Después de los permisos, probá si vuelve a contar."
              bullets={[
                'Caminá unos pasos.',
                'Abrí Pasito.',
                'Cerrá y volvé a abrir la app.',
                'Mirá si empieza a contar.',
              ]}
              primaryLabel="Seguir"
              onPrimary={goNext}
            />
          )}

          {stepId === 'done' && (
            <ActionStep
              icon={CircleAlert}
              title="Si sigue igual"
              lead="Ya hiciste los chequeos principales de Android."
              bullets={[
                'Health Connect instalado y con permisos.',
                'Pasito con permiso para leer pasos.',
                'La app de pasos con permiso para compartir pasos.',
                'Batería en No restringido para ambas apps.',
              ]}
              primaryLabel="Hacer otra revisión"
              onPrimary={reset}
            />
          )}
        </section>

        {stepIndex > 0 && stepId !== 'done' && (
          <footer className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-[#D8E2D4] bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-3 backdrop-blur">
            <button
              type="button"
              onClick={goBack}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#D8E2D4] text-sm font-bold text-[#0C6B45]"
            >
              <ChevronLeft size={18} />
              Volver
            </button>
          </footer>
        )}
      </div>
    </main>
  )
}

function ChoiceStep<T extends string>({
  title,
  lead,
  options,
  value,
  onChoose,
}: {
  title: string
  lead: string
  options: Choice<T>[]
  value: T | null
  onChoose: (value: T) => void
}) {
  return (
    <div className="flex flex-1 flex-col">
      <StepIntro title={title} lead={lead} />

      <div className="mt-4 space-y-2.5">
        {options.map((option) => {
          const Icon = option.icon
          const selected = value === option.id

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChoose(option.id)}
              className={`flex min-h-[66px] w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                selected
                  ? 'border-[#0C6B45] bg-[#E9F8D9]'
                  : 'border-[#D8E2D4] bg-white active:scale-[0.99]'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                  selected ? 'bg-[#0C6B45] text-[#EEFA7A]' : 'bg-[#F0F5EC] text-[#0C6B45]'
                }`}
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-[#143628]">{option.label}</span>
                <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-[#5B766B]">
                  {option.detail}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ActionStep({
  icon: Icon,
  title,
  lead,
  bullets,
  links,
  primaryLabel,
  onPrimary,
}: {
  icon: LucideIcon
  title: string
  lead: string
  bullets: string[]
  links?: ActionLink[]
  primaryLabel: string
  onPrimary: () => void
}) {
  return (
    <div className="flex flex-1 flex-col">
      <StepIntro title={title} lead={lead} icon={Icon} />

      <div className="mt-4 rounded-lg border border-[#D8E2D4] bg-white p-3">
        <div className="space-y-2.5">
          {bullets.map((bullet, index) => (
            <div key={bullet} className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0C6B45] text-[10px] font-black text-[#EEFA7A]">
                {index + 1}
              </span>
              <p className="text-[13px] font-semibold leading-5 text-[#2C4B3D]">{bullet}</p>
            </div>
          ))}
        </div>
      </div>

      {links && links.length > 0 && (
        <div className="mt-3 space-y-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#0C6B45] bg-white px-4 text-sm font-black text-[#0C6B45] active:scale-[0.99]"
            >
              <ExternalLink size={16} />
              {link.label}
            </a>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onPrimary}
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-lg bg-[#0C6B45] px-5 text-sm font-black text-[#EEFA7A] active:scale-[0.99]"
      >
        {primaryLabel}
      </button>
    </div>
  )
}

function StepIntro({
  title,
  lead,
  icon: Icon,
}: {
  title: string
  lead: string
  icon?: LucideIcon
}) {
  return (
    <div>
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0C6B45] text-[#EEFA7A]">
          <Icon size={20} />
        </div>
      )}
      <h1 className="text-[20px] font-black leading-[1.15] text-[#0C6B45]">{title}</h1>
      <p className="mt-2 text-[13px] font-semibold leading-5 text-[#426255]">{lead}</p>
    </div>
  )
}
