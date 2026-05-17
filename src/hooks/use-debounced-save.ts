'use client'

import { useRef, useCallback } from 'react'

export function useDebouncedSave<T>(
  saveFn: (value: T) => Promise<void>,
  delayMs = 500
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    (value: T) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        await saveFn(value)
      }, delayMs)
    },
    [saveFn, delayMs]
  )

  return save
}
