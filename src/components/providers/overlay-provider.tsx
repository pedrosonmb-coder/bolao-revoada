'use client'

import { createContext, useCallback, useContext, useState } from 'react'

type OverlayContextValue = {
  openCount: number
  register: () => () => void
}

const OverlayContext = createContext<OverlayContextValue>({
  openCount: 0,
  register: () => () => {},
})

export function useOverlay() {
  return useContext(OverlayContext)
}

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [openCount, setOpenCount] = useState(0)

  const register = useCallback(() => {
    setOpenCount((c) => c + 1)
    return () => setOpenCount((c) => c - 1)
  }, [])

  return (
    <OverlayContext.Provider value={{ openCount, register }}>
      {children}
    </OverlayContext.Provider>
  )
}
