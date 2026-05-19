import { useEffect } from 'react'
import { useOverlay } from '@/components/providers/overlay-provider'

export function useRegisterOverlay(isOpen: boolean) {
  const { register } = useOverlay()

  useEffect(() => {
    if (!isOpen) return
    const unregister = register()
    return unregister
  }, [isOpen, register])
}
