'use client'

import { useEffect } from 'react'

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export function MarketingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-marketing-page]')
    if (!root) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const revealItems = new Set<HTMLElement>()

    root.querySelectorAll<HTMLElement>(':scope > section').forEach((section) => {
      Array.from(section.children).forEach((child) => {
        if (child instanceof HTMLElement) revealItems.add(child)
      })
    })
    root.querySelectorAll<HTMLElement>('section article, [data-motion-item]').forEach((item) => revealItems.add(item))

    let revealIndex = 0
    revealItems.forEach((item) => {
      item.dataset.reveal = 'true'
      item.style.setProperty('--reveal-delay', `${(revealIndex % 4) * 55}ms`)
      if (reducedMotion) item.dataset.visible = 'true'
      revealIndex += 1
    })

    root.dataset.motionReady = 'true'

    const observer = reducedMotion
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return
              const element = entry.target as HTMLElement
              element.dataset.visible = 'true'
              observer?.unobserve(element)
            })
          },
          { threshold: 0.1, rootMargin: '0px 0px -8% 0px' },
        )

    observer && revealItems.forEach((item) => observer.observe(item))

    const tilt = root.querySelector<HTMLElement>('[data-hero-tilt]')
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    let tiltFrame = 0
    let currentX = 0
    let currentY = 0
    let targetX = 0
    let targetY = 0

    const renderTilt = () => {
      currentX += (targetX - currentX) * 0.12
      currentY += (targetY - currentY) * 0.12
      if (tilt) {
        tilt.style.transform = `perspective(1100px) rotateX(${(-currentY * 4.5).toFixed(2)}deg) rotateY(${(currentX * 6).toFixed(2)}deg) translate3d(${(currentX * 5).toFixed(1)}px, ${(currentY * 3).toFixed(1)}px, 0)`
      }
      if (Math.abs(targetX - currentX) > 0.005 || Math.abs(targetY - currentY) > 0.005) {
        tiltFrame = requestAnimationFrame(renderTilt)
      } else {
        tiltFrame = 0
      }
    }

    const startTilt = () => {
      if (!tiltFrame) tiltFrame = requestAnimationFrame(renderTilt)
    }
    const handlePointerMove = (event: PointerEvent) => {
      if (!tilt) return
      const rect = tilt.getBoundingClientRect()
      targetX = clamp((event.clientX - rect.left) / rect.width, 0, 1) - 0.5
      targetY = clamp((event.clientY - rect.top) / rect.height, 0, 1) - 0.5
      startTilt()
    }
    const resetTilt = () => {
      targetX = 0
      targetY = 0
      startTilt()
    }

    if (tilt && canHover && !reducedMotion) {
      tilt.addEventListener('pointermove', handlePointerMove)
      tilt.addEventListener('pointerleave', resetTilt)
    }

    const fans = Array.from(root.querySelectorAll<HTMLElement>('[data-phone-fan]'))
    let fanFrame = 0
    const updateFans = () => {
      fanFrame = 0
      const viewportHeight = window.innerHeight
      fans.forEach((fan) => {
        const rect = fan.getBoundingClientRect()
        const open = reducedMotion ? 1 : clamp((viewportHeight * 0.92 - rect.top) / (viewportHeight * 0.58))
        const maxX = Math.min(160, Math.max(92, fan.clientWidth * 0.28))
        fan.querySelectorAll<HTMLElement>('[data-fan-index]').forEach((phone) => {
          const index = Number(phone.dataset.fanIndex || 0)
          if (index === 0) {
            phone.style.transform = `translate(-50%, -50%) translateY(${(-5 * open).toFixed(1)}px) scale(${(1 + 0.015 * open).toFixed(3)})`
            return
          }
          const x = maxX * open * index
          const rotation = 9 * open * index
          phone.style.transform = `translate(-50%, -50%) translateX(${x.toFixed(1)}px) rotate(${rotation.toFixed(1)}deg) scale(.92)`
        })
      })
    }
    const queueFanUpdate = () => {
      if (!fanFrame) fanFrame = requestAnimationFrame(updateFans)
    }

    updateFans()
    window.addEventListener('scroll', queueFanUpdate, { passive: true })
    window.addEventListener('resize', queueFanUpdate)

    return () => {
      observer?.disconnect()
      if (tilt) {
        tilt.removeEventListener('pointermove', handlePointerMove)
        tilt.removeEventListener('pointerleave', resetTilt)
      }
      window.removeEventListener('scroll', queueFanUpdate)
      window.removeEventListener('resize', queueFanUpdate)
      if (tiltFrame) cancelAnimationFrame(tiltFrame)
      if (fanFrame) cancelAnimationFrame(fanFrame)
    }
  }, [])

  return null
}
