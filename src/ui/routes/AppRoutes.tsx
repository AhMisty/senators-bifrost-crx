import { Navigate, Route, Router, type RouteSectionProps } from '@solidjs/router'
import { Show, createSignal, type Component } from 'solid-js'

import { Background } from '@/ui/components/Background/Background'
import { BifrostBrand } from '@/ui/components/BifrostBrand'
import { IntroOverlay } from '@/ui/components/IntroOverlay/IntroOverlay'
import { introExitTransitionDurationMs } from '@/ui/components/IntroOverlay/introOverlayTimings'
import { LineFrame } from '@/ui/components/LineFrame'
import { OptionsView } from '@/ui/views/OptionsView'
import { defaultRoute, redirectRoutes, routes } from '@/shared/routes'

type IntroStage = 'active' | 'exiting' | 'complete'

const EmptyView: Component = () => null
const RedirectToDefaultRoute: Component = () => <Navigate href={defaultRoute} />

const AppShell: Component<RouteSectionProps> = (props) => {
  const [introStage, setIntroStage] = createSignal<IntroStage>('active')

  const isBackgroundBlurred = (): boolean => introStage() !== 'active'
  const isAppEntering = (): boolean => introStage() !== 'active'
  const isIntroComplete = (): boolean => introStage() === 'complete'

  return (
    <div class="absolute inset-0 isolate overflow-hidden">
      <Background isBlurred={isBackgroundBlurred()} />

      <div
        class="absolute inset-0 z-[1] overflow-hidden transition-opacity [transition-duration:var(--app-enter-duration)] ease-out"
        classList={{
          'pointer-events-none opacity-0': !isAppEntering(),
          'pointer-events-none opacity-100': isAppEntering() && !isIntroComplete(),
          'pointer-events-auto opacity-100': isIntroComplete(),
        }}
        style={{
          '--app-enter-duration': `${introExitTransitionDurationMs}ms`,
        }}
      >
        <LineFrame active={isAppEntering()} title={<BifrostBrand active={isAppEntering()} />}>
          {props.children}
        </LineFrame>
      </div>

      <Show when={!isIntroComplete()}>
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
    <Route path={routes.sidepanel} component={EmptyView} />
    <Route path="*rest" component={RedirectToDefaultRoute} />
  </Router>
)
