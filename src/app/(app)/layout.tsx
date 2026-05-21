import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { TelegramProvider } from '@/components/providers/telegram-provider'
import { SWRProvider } from '@/components/providers/swr-provider'
import { OverlayProvider } from '@/components/providers/overlay-provider'
import { ToastProvider } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { OfflineBanner } from '@/components/ui/offline-banner'
import { PaymentPendingBanner } from '@/components/payment-pending-banner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SWRProvider>
      <TelegramProvider>
        <OverlayProvider>
          <ToastProvider>
            <ErrorBoundary>
              <div className="flex flex-col min-h-screen bg-(--color-bg-base)">
                <Header />
                <OfflineBanner />
                <PaymentPendingBanner />
                <main className="flex-1 overflow-y-auto pb-20">
                  {children}
                </main>
                <BottomNav />
              </div>
            </ErrorBoundary>
          </ToastProvider>
        </OverlayProvider>
      </TelegramProvider>
    </SWRProvider>
  )
}
