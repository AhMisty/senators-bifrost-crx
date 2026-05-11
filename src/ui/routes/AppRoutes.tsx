import { Navigate, Route, Router, type RouteSectionProps } from '@solidjs/router'
import { Show, createEffect, createSignal, type Component } from 'solid-js'

import { Background } from '@/ui/components/Background'
import { BrandLogo } from '@/ui/components/BrandLogo'
import { IntroOverlay } from '@/ui/components/IntroOverlay'
import { LineFrame } from '@/ui/components/LineFrame'
import { usePrefersReducedMotion } from '@/ui/hooks/usePrefersReducedMotion'
import { introExitTransitionDurationMs } from '@/ui/utils/motion'
import { NotFoundView } from '@/ui/views/NotFoundView'
import { OptionsView } from '@/ui/views/OptionsView'
import { SidePanelView } from '@/ui/views/SidePanelView'
import { defaultRoute, redirectRoutes, routes } from '@/shared/routes'

type IntroStage = 'active' | 'exiting' | 'complete'

const RedirectToDefaultRoute: Component = () => <Navigate href={defaultRoute} />

const AppShell: Component<RouteSectionProps> = (props) => {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [introStage, setIntroStage] = createSignal<IntroStage>(
    prefersReducedMotion() ? 'complete' : 'active',
  )

  createEffect(() => {
    if (prefersReducedMotion() && introStage() !== 'complete') {
      setIntroStage('complete')
    }
  })

  const isShellVisible = (): boolean => introStage() !== 'active'
  const isAppInteractive = (): boolean => introStage() === 'complete'

  return (
    <div class="absolute inset-0 isolate overflow-hidden">
      <Background isBlurred={isShellVisible()} />

      <div
        class="absolute inset-0 z-[1] overflow-hidden transition-opacity [transition-duration:var(--app-enter-duration)] [transition-timing-function:var(--app-motion-ease-out)]"
        classList={{
          'pointer-events-none opacity-0': !isShellVisible(),
          'pointer-events-none opacity-100': isShellVisible() && !isAppInteractive(),
          'pointer-events-auto opacity-100': isAppInteractive(),
        }}
        style={{
          '--app-enter-duration': `${introExitTransitionDurationMs}ms`,
        }}
      >
        <LineFrame active={isShellVisible()} title={<BrandLogo active={isShellVisible()} />}>
          {props.children}
        </LineFrame>
      </div>

      <Show when={!isAppInteractive()}>
        <IntroOverlay
          onExitStart={() => setIntroStage('exiting')}
          onComplete={() => setIntroStage('complete')}
        />
      </Show>
    </div>
  )
}

export const AppRoutes: Component = () => (
  <Router root={AppShell}>
    {redirectRoutes.map((path) => (
      <Route path={path} component={RedirectToDefaultRoute} />
    ))}
    <Route path={routes.options} component={OptionsView} />
    <Route path={routes.sidepanel} component={SidePanelView} />
    <Route path="*rest" component={NotFoundView} />
  </Router>
)
