'use client'

import { Suspense } from 'react'
import { PalpitarTabs } from '@/components/palpitar/phase-tabs'

export default function PalpitarPage() {
  return (
    <Suspense>
      <PalpitarTabs />
    </Suspense>
  )
}
