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
  Footprints,
  HeartPulse,
  Instagram,
  Settings,
  ShieldCheck,
  Smartphone,
  Store,
  Watch,
} from 'lucide-react'

type Platform = 'android' | 'ios'
type Device = 'samsung' | 'xiaomi' | 'motorola' | 'pixel' | 'other'
type SourceApp =
  | 'apple-health'
  | 'samsung-health'
  | 'mi-fitness'
  | 'google-fit'
  | 'garmin-fitbit'
  | 'other'
type PasitoCheck = 'works' | 'not-yet'
type InstalledAnswer = 'yes' | 'no'
type StepId =
  | 'platform'
  | 'ios-intro'
  | 'ios-source'
  | 'ios-health'
  | 'ios-source-connect'
  | 'ios-pasito-permissions'
  | 'ios-test'
  | 'ios-updates'
  | 'android-intro'
  | 'device'
  | 'source'
  | 'android-required-apps'
  | 'pasito-check'
  | 'pasito-install'
  | 'health-connect-check'
  | 'health-connect-install'
  | 'source-check'
  | 'source-install'
  | 'source-connect'
  | 'health-data'
  | 'pasito-permissions'
  | 'pasito-test'
  | 'battery'
  | 'updates'
  | 'google-fit-fallback'
  | 'contact'
  | 'done'

type Choice<T extends string> = {
  id: T
  label: string
  detail?: string
  icon: LucideIcon
}

type ActionLink = {
  label: string
  href: string
}

const HEALTH_CONNECT_URL =
  'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata'
const PASITO_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=ar.pasito.pasito'
const GOOGLE_FIT_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.google.android.apps.fitness'
const APPLE_HEALTH_URL = 'https://apps.apple.com/app/apple-health/id1242545199'
const GARMIN_CONNECT_APP_STORE_URL = 'https://apps.apple.com/app/garmin-connect/id583446403'
const INSTAGRAM_URL = 'https://www.instagram.com/pasito.app/'

const platformOptions: Choice<Platform>[] = [
  {
    id: 'android',
    label: 'Android',
    icon: Smartphone,
  },
  {
    id: 'ios',
    label: 'iPhone',
    icon: CircleAlert,
  },
]

const deviceOptions: Choice<Device>[] = [
  {
    id: 'samsung',
    label: 'Samsung',
    icon: Watch,
  },
  {
    id: 'xiaomi',
    label: 'Xiaomi / Redmi',
    detail: 'POCO / HyperOS',
    icon: Settings,
  },
  {
    id: 'motorola',
    label: 'Motorola',
    icon: Smartphone,
  },
  {
    id: 'pixel',
    label: 'Pixel',
    icon: ShieldCheck,
  },
  {
    id: 'other',
    label: 'Otro Android',
    icon: Smartphone,
  },
]

const sourceOptions: Choice<SourceApp>[] = [
  {
    id: 'samsung-health',
    label: 'Samsung Health',
    icon: HeartPulse,
  },
  {
    id: 'mi-fitness',
    label: 'Mi Fitness / Zepp Life',
    detail: 'Xiaomi / Redmi',
    icon: Footprints,
  },
  {
    id: 'google-fit',
    label: 'Google Fit',
    icon: Footprints,
  },
  {
    id: 'garmin-fitbit',
    label: 'Garmin / Fitbit',
    icon: Watch,
  },
  {
    id: 'other',
    label: 'Otra app',
    icon: HeartPulse,
  },
]

const iosSourceOptions: Choice<SourceApp>[] = [
  {
    id: 'apple-health',
    label: 'iPhone / Apple Watch',
    icon: Smartphone,
  },
  {
    id: 'garmin-fitbit',
    label: 'Garmin',
    icon: Watch,
  },
  {
    id: 'other',
    label: 'Otra app',
    icon: HeartPulse,
  },
]

const pasitoCheckOptions: Choice<PasitoCheck>[] = [
  {
    id: 'works',
    label: 'Sí, ya ve pasos',
    icon: Check,
  },
  {
    id: 'not-yet',
    label: 'Todavía no',
    icon: CircleAlert,
  },
]

const installedOptions: Choice<InstalledAnswer>[] = [
  {
    id: 'yes',
    label: 'Sí, ya la tengo',
    icon: Check,
  },
  {
    id: 'no',
    label: 'No, instalar',
    icon: Store,
  },
]

function sourceLabel(source: SourceApp | null) {
  if (source === 'apple-health') return 'Apple Salud'
  if (source === 'samsung-health') return 'Samsung Health'
  if (source === 'mi-fitness') return 'Mi Fitness / Zepp Life'
  if (source === 'google-fit') return 'Google Fit'
  if (source === 'garmin-fitbit') return 'Garmin/Fitbit'
  if (source === 'other') return 'tu app de pasos'
  return 'tu app de pasos'
}

function iosSourceLabel(source: SourceApp | null) {
  if (source === 'garmin-fitbit') return 'Garmin Connect'
  if (source === 'other') return 'tu app de pasos'
  return 'Apple Salud'
}

function sourceStoreLinks(source: SourceApp | null): ActionLink[] {
  if (source === 'samsung-health') {
    return [
      {
        label: 'Abrir Samsung Health',
        href: 'https://play.google.com/store/apps/details?id=com.sec.android.app.shealth',
      },
    ]
  }

  if (source === 'google-fit') {
    return [
      {
        label: 'Abrir Google Fit',
        href: 'https://play.google.com/store/apps/details?id=com.google.android.apps.fitness',
      },
      {
        label: 'Abrir Fitbit',
        href: 'https://play.google.com/store/apps/details?id=com.fitbit.FitbitMobile',
      },
    ]
  }

  if (source === 'mi-fitness') {
    return [
      {
        label: 'Buscar Mi Fitness',
        href: 'https://play.google.com/store/search?q=Mi%20Fitness&c=apps',
      },
      {
        label: 'Buscar Zepp Life',
        href: 'https://play.google.com/store/search?q=Zepp%20Life&c=apps',
      },
    ]
  }

  if (source === 'garmin-fitbit') {
    return [
      {
        label: 'Abrir Garmin',
        href: 'https://play.google.com/store/apps/details?id=com.garmin.android.apps.connectmobile',
      },
      {
        label: 'Abrir Fitbit',
        href: 'https://play.google.com/store/apps/details?id=com.fitbit.FitbitMobile',
      },
    ]
  }

  return [
    {
      label: 'Buscar en Play Store',
      href: 'https://play.google.com/store/search?q=contador%20de%20pasos&c=apps',
    },
  ]
}

function getStepOrder({
  platform,
  device,
  source,
  pasitoInstalled,
  healthConnectInstalled,
  sourceInstalled,
}: {
  platform: Platform | null
  device: Device | null
  source: SourceApp | null
  pasitoInstalled: InstalledAnswer | null
  healthConnectInstalled: InstalledAnswer | null
  sourceInstalled: InstalledAnswer | null
}): StepId[] {
  if (platform === 'ios') {
    const iosSteps: StepId[] = [
      'platform',
      'ios-intro',
      'ios-source',
    ]

    if (source && source !== 'apple-health') {
      iosSteps.push('ios-source-connect')
    }

    iosSteps.push(
      'ios-health',
      'ios-pasito-permissions',
      'ios-test',
      'ios-updates',
      'contact',
      'done',
    )

    return iosSteps
  }

  return [
    'platform',
    'android-intro',
    'device',
    'source',
    'android-required-apps',
    'pasito-check',
    ...(pasitoInstalled === 'no' ? (['pasito-install'] as StepId[]) : []),
    'health-connect-check',
    ...(healthConnectInstalled === 'no' ? (['health-connect-install'] as StepId[]) : []),
    'source-check',
    ...(sourceInstalled === 'no' ? (['source-install'] as StepId[]) : []),
    'source-connect',
    'health-data',
    'pasito-permissions',
    'pasito-test',
    'battery',
    'updates',
    ...(device === 'samsung' || source === 'samsung-health'
      ? (['google-fit-fallback'] as StepId[])
      : []),
    'contact',
    'done',
  ]
}

export function ConnectAndroidGuide() {
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [device, setDevice] = useState<Device | null>(null)
  const [source, setSource] = useState<SourceApp | null>(null)
  const [pasitoCheck, setPasitoCheck] = useState<PasitoCheck | null>(null)
  const [pasitoInstalled, setPasitoInstalled] = useState<InstalledAnswer | null>(null)
  const [healthConnectInstalled, setHealthConnectInstalled] = useState<InstalledAnswer | null>(null)
  const [sourceInstalled, setSourceInstalled] = useState<InstalledAnswer | null>(null)

  const steps = useMemo(
    () =>
      getStepOrder({
        platform,
        device,
        source,
        pasitoInstalled,
        healthConnectInstalled,
        sourceInstalled,
      }),
    [platform, device, source, pasitoInstalled, healthConnectInstalled, sourceInstalled],
  )
  const [stepIndex, setStepIndex] = useState(0)
  const stepId = steps[Math.min(stepIndex, steps.length - 1)]
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100)
  const progressLabel = `Paso ${stepIndex + 1}`
  const sourceName = sourceLabel(source)
  const iosSourceName = iosSourceLabel(source)
  const sourceLinks = sourceStoreLinks(source)

  const goNext = () => {
    setStepIndex((current) => Math.min(current + 1, steps.length - 1))
  }

  const goBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0))
  }

  const goTo = (target: StepId) => {
    const targetIndex = steps.indexOf(target)
    if (targetIndex >= 0) {
      setStepIndex(targetIndex)
    }
  }

  const reset = () => {
    setPlatform(null)
    setDevice(null)
    setSource(null)
    setPasitoCheck(null)
    setPasitoInstalled(null)
    setHealthConnectInstalled(null)
    setSourceInstalled(null)
    setStepIndex(0)
  }

  const choosePlatform = (value: Platform) => {
    setPlatform(value)
    setDevice(null)
    setSource(null)
    setPasitoCheck(null)
    setPasitoInstalled(null)
    setHealthConnectInstalled(null)
    setSourceInstalled(null)
    setStepIndex(1)
  }

  const chooseDevice = (value: Device) => {
    setDevice(value)
    setPasitoCheck(null)
    setPasitoInstalled(null)
    setHealthConnectInstalled(null)
    setSourceInstalled(null)
    if (value === 'samsung') {
      setSource('samsung-health')
    } else if (value === 'xiaomi') {
      setSource('mi-fitness')
    }
    goNext()
  }

  const chooseSource = (value: SourceApp) => {
    setSource(value)
    setPasitoCheck(null)
    setPasitoInstalled(null)
    setHealthConnectInstalled(null)
    setSourceInstalled(null)
    goNext()
  }

  const choosePasitoInstalled = (value: InstalledAnswer) => {
    setPasitoInstalled(value)
    goNext()
  }

  const chooseHealthConnectInstalled = (value: InstalledAnswer) => {
    setHealthConnectInstalled(value)
    goNext()
  }

  const chooseSourceInstalled = (value: InstalledAnswer) => {
    setSourceInstalled(value)
    goNext()
  }

  const choosePasitoCheck = (value: PasitoCheck) => {
    setPasitoCheck(value)
    if (value === 'works') {
      goTo('done')
      return
    }

    goNext()
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
              <span>{progressLabel}</span>
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
          {stepId === 'platform' && (
            <ChoiceStep
              title="¿Qué celular tenés?"
              options={platformOptions}
              value={platform}
              onChoose={choosePlatform}
            />
          )}

          {stepId === 'ios-intro' && (
            <ActionStep
              icon={ShieldCheck}
              title="Cómo se conecta"
              lead="En iPhone, Pasito lee pasos desde Apple Salud."
              bullets={[
                'iPhone guarda pasos en Apple Salud.',
                'Garmin también puede mandar pasos a Apple Salud.',
                'Pasito necesita permiso para leerlos.',
              ]}
              primaryLabel="Empezar"
              onPrimary={goNext}
            />
          )}

          {stepId === 'ios-source' && (
            <ChoiceStep
              title="¿Cuál es tu app de pasos?"
              lead="Elegí la app que muestra tus pasos."
              options={iosSourceOptions}
              value={source}
              onChoose={chooseSource}
            />
          )}

          {stepId === 'ios-health' && (
            <ActionStep
              icon={HeartPulse}
              title="Revisar Apple Salud"
              lead="Primero confirmá que Salud tiene pasos."
              bullets={[
                'Abrí la app Salud.',
                'Tocá Buscar.',
                'Entrá en Actividad > Pasos.',
                'Si ves pasos, vamos bien.',
              ]}
              links={[
                {
                  label: 'Abrir Apple Salud',
                  href: APPLE_HEALTH_URL,
                },
              ]}
              primaryLabel="Veo pasos"
              onPrimary={goNext}
            />
          )}

          {stepId === 'ios-source-connect' && (
            <ActionStep
              icon={source === 'garmin-fitbit' ? Watch : HeartPulse}
              title={
                source === 'garmin-fitbit'
                  ? 'Garmin con Apple Salud'
                  : source === 'other'
                    ? 'App con Apple Salud'
                    : 'Pasos en Apple Salud'
              }
              lead={
                source === 'garmin-fitbit'
                  ? 'Garmin tiene que enviar pasos a Salud.'
                  : source === 'other'
                    ? 'Tu app tiene que compartir pasos con Salud.'
                    : 'Si Salud ya tiene pasos, seguí.'
              }
              bullets={
                source === 'garmin-fitbit'
                  ? [
                      'Abrí Garmin Connect.',
                      'Tocá Más > Ajustes.',
                      'Entrá en Apps conectadas.',
                      'Tocá Apple Salud.',
                      'Permití Pasos.',
                    ]
                  : source === 'other'
                    ? [
                        `Abrí ${iosSourceName}.`,
                        'Entrá en Ajustes.',
                        'Buscá Apple Salud.',
                        'Activá compartir Pasos.',
                      ]
                    : [
                        'Mantené Salud con pasos visibles.',
                        'Si usás Apple Watch, esperá que sincronice.',
                        'Después dale permiso a Pasito.',
                      ]
              }
              links={
                source === 'garmin-fitbit'
                  ? [
                      {
                        label: 'Abrir Garmin Connect',
                        href: GARMIN_CONNECT_APP_STORE_URL,
                      },
                    ]
                  : undefined
              }
              primaryLabel={source === 'apple-health' ? 'Seguir' : 'Ya lo conecté'}
              onPrimary={goNext}
            />
          )}

          {stepId === 'ios-pasito-permissions' && (
            <ActionStep
              icon={ShieldCheck}
              title="Dar permiso a Pasito"
              lead="Pasito necesita leer pasos de Apple Salud."
              bullets={[
                'Abrí la app Salud.',
                'Tocá tu foto o perfil.',
                'Entrá en Apps y servicios.',
                'Tocá Pasito.',
                'Activá Pasos.',
              ]}
              primaryLabel="Permiso listo"
              onPrimary={goNext}
            />
          )}

          {stepId === 'ios-test' && (
            <ChoiceStep
              title="¿Pasito ya ve pasos?"
              lead="Abrí Pasito y mirá si ya aparecen tus pasos."
              options={pasitoCheckOptions}
              value={pasitoCheck}
              onChoose={choosePasitoCheck}
            />
          )}

          {stepId === 'ios-updates' && (
            <ActionStep
              icon={Store}
              title="Actualizar y abrir apps"
              lead="Último intento antes de soporte."
              bullets={[
                'Actualizá Pasito.',
                source === 'garmin-fitbit' ? 'Actualizá Garmin Connect.' : 'Actualizá tu app de pasos.',
                source === 'garmin-fitbit'
                  ? 'Abrí Garmin Connect y esperá que sincronice.'
                  : 'Abrí Salud y tu app de pasos.',
                'Volvé a abrir Pasito.',
              ]}
              links={
                source === 'garmin-fitbit'
                  ? [
                      {
                        label: 'Abrir Garmin Connect',
                        href: GARMIN_CONNECT_APP_STORE_URL,
                      },
                    ]
                  : [
                      {
                        label: 'Abrir Apple Salud',
                        href: APPLE_HEALTH_URL,
                      },
                    ]
              }
              primaryLabel="Ya actualicé"
              onPrimary={goNext}
            />
          )}

          {stepId === 'android-intro' && (
            <ActionStep
              icon={ShieldCheck}
              title="En Android son 3 apps"
              lead="Para que Pasito sume pasos, necesitás tener estas tres."
              bullets={[
                'Pasito.',
                'Health Connect.',
                'La app que cuenta tus pasos.',
              ]}
              primaryLabel="Revisarlas"
              onPrimary={goNext}
            />
          )}

          {stepId === 'device' && (
            <ChoiceStep
              title="¿Qué Android tenés?"
              options={deviceOptions}
              value={device}
              onChoose={chooseDevice}
            />
          )}

          {stepId === 'source' && (
            <ChoiceStep
              title="¿Cuál es tu app de pasos?"
              lead="Es la app del celular o reloj que cuenta tus pasos."
              options={sourceOptions}
              value={source}
              onChoose={chooseSource}
            />
          )}

          {stepId === 'android-required-apps' && (
            <ActionStep
              icon={ShieldCheck}
              title="Necesitás estas 3"
              lead="Las tres tienen que estar instaladas."
              bullets={[
                'Pasito.',
                'Health Connect.',
                sourceName,
              ]}
              primaryLabel="Chequear una por una"
              onPrimary={goNext}
            />
          )}

          {stepId === 'pasito-check' && (
            <ChoiceStep
              title="¿Tenés Pasito?"
              lead="Primero confirmá que Pasito esté instalado."
              options={installedOptions}
              value={pasitoInstalled}
              onChoose={choosePasitoInstalled}
            />
          )}

          {stepId === 'pasito-install' && (
            <ActionStep
              icon={Store}
              title="Instalar Pasito"
              lead="Abrí Play Store y revisá Pasito."
              bullets={[
                'Tocá Abrir en Play Store.',
                'Si dice Instalar, instalalo.',
                'Si dice Actualizar, actualizalo.',
                'Si dice Abrir, está listo.',
              ]}
              links={[
                {
                  label: 'Abrir Pasito',
                  href: PASITO_PLAY_STORE_URL,
                },
              ]}
              primaryLabel="Ya lo tengo"
              onPrimary={goNext}
            />
          )}

          {stepId === 'health-connect-check' && (
            <ChoiceStep
              title="¿Tenés Health Connect?"
              lead="Es la app de Android que conecta los pasos."
              options={installedOptions}
              value={healthConnectInstalled}
              onChoose={chooseHealthConnectInstalled}
            />
          )}

          {stepId === 'health-connect-install' && (
            <ActionStep
              icon={Store}
              title="Instalar Health Connect"
              lead="Abrí Play Store y revisalo."
              bullets={[
                'Tocá Abrir en Play Store.',
                'Si dice Instalar, instalalo.',
                'Si dice Actualizar, actualizalo.',
                'Si dice Abrir, está listo.',
              ]}
              links={[
                {
                  label: 'Abrir Health Connect',
                  href: HEALTH_CONNECT_URL,
                },
              ]}
              primaryLabel="Ya lo tengo"
              onPrimary={goNext}
            />
          )}

          {stepId === 'source-check' && (
            <ChoiceStep
              title={`¿Tenés ${sourceName}?`}
              lead="Esta es la app que cuenta tus pasos."
              options={installedOptions}
              value={sourceInstalled}
              onChoose={chooseSourceInstalled}
            />
          )}

          {stepId === 'source-install' && (
            <ActionStep
              icon={HeartPulse}
              title={`Instalar ${sourceName}`}
              lead="Abrí Play Store y revisá la app de pasos."
              bullets={[
                sourceLinks.length > 0 ? 'Abrí el link de abajo.' : 'Buscala en Play Store.',
                'Si dice Instalar, instalala.',
                'Si dice Actualizar, actualizala.',
                device === 'samsung'
                  ? 'Samsung: revisá Galaxy Store también.'
                  : 'Cuando esté lista, volvé acá.',
              ]}
              links={sourceLinks}
              primaryLabel="Ya la tengo"
              onPrimary={goNext}
            />
          )}

          {stepId === 'source-connect' && (
            <ActionStep
              icon={HeartPulse}
              title={`${sourceName} con Health Connect`}
              lead={`${sourceName} tiene que mandar pasos.`}
              bullets={
                source === 'samsung-health' || device === 'samsung'
                  ? [
                      'Abrí Samsung Health.',
                      'Tocá los 3 puntitos.',
                      'Entrá en Ajustes.',
                      'Tocá Health Connect.',
                      'Tocá Comenzar y permití Pasos.',
                    ]
                  : [
                      `Abrí ${sourceName}.`,
                      'Entrá en Ajustes.',
                      'Buscá Health Connect.',
                      'Activá compartir Pasos.',
                    ]
              }
              primaryLabel="Ya lo conecté"
              onPrimary={goNext}
            />
          )}

          {stepId === 'health-data' && (
            <ActionStep
              icon={Footprints}
              title="¿Llegan los pasos?"
              lead="Ahora mirá dentro de Health Connect."
              bullets={[
                'Abrí Ajustes > Health Connect.',
                'Entrá en Datos y acceso.',
                'Tocá Pasos.',
                `Deberías ver ${sourceName}.`,
              ]}
              primaryLabel="Sí, veo pasos"
              onPrimary={goNext}
              secondaryLabel="No veo pasos"
              onSecondary={() => goTo('source-connect')}
            />
          )}

          {stepId === 'pasito-permissions' && (
            <ActionStep
              icon={ShieldCheck}
              title="Dar permiso a Pasito"
              lead="Pasito necesita leer pasos."
              bullets={[
                'Ajustes > Health Connect.',
                'Permisos de apps > Pasito.',
                'Activá Pasos o Actividad.',
                'Si aparece Leer, activalo.',
              ]}
              primaryLabel="Permiso listo"
              onPrimary={goNext}
            />
          )}

          {stepId === 'pasito-test' && (
            <ChoiceStep
              title="¿Pasito ya ve pasos?"
              lead="Abrí Pasito y mirá si ya aparecen tus pasos."
              options={pasitoCheckOptions}
              value={pasitoCheck}
              onChoose={choosePasitoCheck}
            />
          )}

          {stepId === 'battery' && (
            <ActionStep
              icon={BatteryCharging}
              title="Revisar batería"
              lead="Android puede dormir las apps."
              bullets={[
                'Ajustes > Apps > Pasito.',
                'Batería > No restringido.',
                `Repetí con ${sourceName}.`,
                device === 'xiaomi' ? 'Xiaomi: activá Autoinicio.' : 'No elijas Restringido.',
              ]}
              primaryLabel="Ya lo hice"
              onPrimary={goNext}
            />
          )}

          {stepId === 'updates' && (
            <ActionStep
              icon={Store}
              title="Actualizar todo"
              lead={
                device === 'samsung' || source === 'samsung-health'
                  ? 'Primero probemos actualizar.'
                  : 'Último intento antes de soporte.'
              }
              bullets={[
                'Actualizá Health Connect.',
                `Actualizá ${sourceName}.`,
                'Actualizá Pasito.',
                device === 'samsung' ? 'Samsung: revisá Galaxy Store.' : 'Cerrá y abrí las apps.',
              ]}
              links={[
                {
                  label: 'Abrir Health Connect',
                  href: HEALTH_CONNECT_URL,
                },
                {
                  label: 'Abrir Pasito',
                  href: PASITO_PLAY_STORE_URL,
                },
              ]}
              primaryLabel="Ya actualicé"
              onPrimary={goNext}
            />
          )}

          {stepId === 'google-fit-fallback' && (
            <ActionStep
              icon={Footprints}
              title="Probá Google Fit"
              lead="Si Samsung Health no suma, Google Fit suele funcionar mejor."
              bullets={[
                'Instalá Google Fit.',
                'Abrilo y dejá que cuente tus pasos.',
                'Conectalo con Health Connect.',
                'Después volvé a Pasito.',
              ]}
              links={[
                {
                  label: 'Abrir Google Fit',
                  href: GOOGLE_FIT_PLAY_STORE_URL,
                },
              ]}
              primaryLabel="Ya probé Google Fit"
              onPrimary={goNext}
            />
          )}

          {stepId === 'contact' && (
            <ActionStep
              icon={Instagram}
              title="Si todavía no suma"
              lead="Mandanos el caso por Instagram."
              bullets={[
                platform === 'ios' ? 'Modelo de iPhone.' : 'Marca del celular.',
                `App de pasos: ${platform === 'ios' ? iosSourceName : sourceName}.`,
                'Captura de la pantalla de Pasito.',
              ]}
              links={[
                {
                  label: 'Abrir Instagram',
                  href: INSTAGRAM_URL,
                },
              ]}
              primaryLabel="Terminar"
              onPrimary={goNext}
            />
          )}

          {stepId === 'done' && (
            <ActionStep
              icon={Check}
              title="Listo"
              lead={
                pasitoCheck === 'works'
                  ? 'Si Pasito ve pasos, quedó bien.'
                  : 'Ya hiciste todos los chequeos.'
              }
              bullets={
                platform === 'ios'
                  ? [
                      'Apple Salud tiene pasos.',
                      `${iosSourceName} conectado.`,
                      'Pasito con permiso.',
                    ]
                  : [
                      'Health Connect instalado.',
                      `${sourceName} conectado.`,
                      'Pasito con permiso.',
                    ]
              }
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
  note,
  options,
  value,
  onChoose,
}: {
  title: string
  lead?: string
  note?: string
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
              className={`flex min-h-[60px] w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
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
                {option.detail && (
                  <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-[#5B766B]">
                    {option.detail}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {note && (
        <div className="mt-4 rounded-xl border border-[#E6B74A]/35 bg-[#FFF8E6] p-3 text-xs font-bold leading-5 text-[#6F5518]">
          {note}
        </div>
      )}
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
  secondaryLabel,
  onSecondary,
  warning,
}: {
  icon: LucideIcon
  title: string
  lead?: string
  bullets: string[]
  links?: ActionLink[]
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  warning?: string
}) {
  return (
    <div className="flex flex-1 flex-col">
      <StepIntro title={title} lead={lead} icon={Icon} />

      {warning && (
        <div className="mt-3 rounded-lg border border-[#E6B74A]/35 bg-[#FFF8E6] p-3 text-xs font-bold leading-5 text-[#6F5518]">
          {warning}
        </div>
      )}

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

      {secondaryLabel && onSecondary && (
        <button
          type="button"
          onClick={onSecondary}
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg border border-[#D8E2D4] bg-white px-5 text-sm font-black text-[#0C6B45] active:scale-[0.99]"
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  )
}

function StepIntro({
  title,
  lead,
  icon: Icon,
}: {
  title: string
  lead?: string
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
      {lead && <p className="mt-2 text-[13px] font-semibold leading-5 text-[#426255]">{lead}</p>}
    </div>
  )
}
