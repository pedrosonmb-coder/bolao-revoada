# Design System — Overlays & Z-Index

## Regra global

Todo overlay (modal, drawer, toast, popup) **DEVE** usar os z-index definidos em `src/lib/constants/z-index.ts` e as classes Tailwind correspondentes (`z-modal-backdrop`, `z-modal`, `z-drawer`, `z-toast`). Nenhum overlay deve usar `z-50` diretamente.

## Stack de z-index

| Camada          | Classe Tailwind       | Valor | Arquivo de referência                      |
|-----------------|-----------------------|-------|--------------------------------------------|
| Dropdown        | `z-dropdown`          | 10    | team-picker, futuros dropdowns             |
| Header          | `z-header` / `z-30`   | 30    | `layout/header.tsx`                        |
| Phase tabs      | `z-30`                | 30    | `palpitar/phase-tabs.tsx`                  |
| Bottom Nav      | `z-bottom-nav`        | 50    | `layout/bottom-nav.tsx`                    |
| Modal backdrop  | `z-modal-backdrop`    | 90    | fundo escuro atrás de modal/drawer         |
| Modal / Drawer  | `z-modal` / `z-drawer`| 100   | painéis de conteúdo                        |
| Toast / Banner  | `z-toast`             | 200   | `ui/toast.tsx`, `ui/offline-banner.tsx`    |

Os valores estão definidos como variáveis CSS no `@theme` de `src/app/globals.css` e exportados como constantes TypeScript em `src/lib/constants/z-index.ts`.

## Comportamento do Bottom Nav

O `BottomNav` esconde-se (`translate-y-full`) automaticamente quando qualquer overlay está aberto. Isso é gerenciado pelo `OverlayContext` (`src/components/providers/overlay-provider.tsx`).

**Para registrar um novo overlay:**

```tsx
import { useRegisterOverlay } from '@/hooks/use-register-overlay'

// Dentro do componente:
useRegisterOverlay(isOpen)  // isOpen = boolean indicando se o overlay está visível
```

O hook registra o overlay quando `isOpen` é `true` e desregistra automaticamente quando vira `false` ou o componente desmonta.

## Safe area (iOS home indicator)

Qualquer overlay `fixed bottom-0` deve ter:

```tsx
style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
```

Para modais com botão de ação na base, use `max()` para garantir padding mínimo:

```tsx
style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
```

## Inventário de overlays existentes

| Componente                  | Tipo          | Z-index         | Registra OverlayContext? |
|-----------------------------|---------------|-----------------|--------------------------|
| `admin/matches-tab.tsx`     | Modal bottom  | `z-modal-backdrop` | Sim (`!!overrideModal`) |
| `ranking/user-detail-drawer.tsx` | Drawer bottom | `z-drawer` + `z-modal-backdrop` | Sim (`!!userId`) |
| `ui/toast.tsx`              | Toast         | `z-toast`       | Não (não esconde nav)    |
| `ui/offline-banner.tsx`     | Banner        | `z-toast`       | Não (não esconde nav)    |

## Como criar um novo overlay

1. Use `useRegisterOverlay(isOpen)` no componente para que o bottom nav se esconda.
2. Use `z-modal-backdrop` no backdrop (overlay escuro) e `z-modal` / `z-drawer` no painel.
3. Adicione `paddingBottom: 'env(safe-area-inset-bottom)'` no painel se ele toca a base da tela.
4. Use `dvh` (dynamic viewport height) em vez de `vh` para `max-height` se houver teclado virtual.
