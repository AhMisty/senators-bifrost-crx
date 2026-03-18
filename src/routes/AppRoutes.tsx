import { Navigate, Route, Router, type RouteSectionProps } from '@solidjs/router'
import { Show, createSignal, type Component } from 'solid-js'

import { Background } from '@/components/Background/Background'
import { IntroOverlay } from '@/components/IntroOverlay/IntroOverlay'
import { OptionsView } from '@/views/OptionsView'

import { defaultRoutePath, redirectRoutePaths, routePaths } from './routePaths'

type IntroStage = 'active' | 'exiting' | 'complete'

const EmptyView: Component = () => null
const RedirectToDefaultRoute: Component = () => <Navigate href={defaultRoutePath} />

const AppShell: Component<RouteSectionProps> = (props) => {
  const [introStage, setIntroStage] = createSignal<IntroStage>('active')

  const isBackgroundBlurred = (): boolean => introStage() !== 'active'
  const isIntroComplete = (): boolean => introStage() === 'complete'

  return (
    <div class="relative isolate min-h-screen">
      <Background isBlurred={isBackgroundBlurred()} />

      <div
        class="relative z-[1] min-h-screen overflow-auto transition-opacity duration-[220ms] ease-out"
        classList={{
          'pointer-events-none invisible opacity-0': !isIntroComplete(),
          'pointer-events-auto visible opacity-100': isIntroComplete(),
        }}
      >
        {props.children}
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
    {redirectRoutePaths.map((path) => (
      <Route path={path} component={RedirectToDefaultRoute} />
    ))}
    <Route path={routePaths.options} component={OptionsView} />
    <Route path={routePaths.sidepanel} component={EmptyView} />
    <Route path="*rest" component={RedirectToDefaultRoute} />
  </Router>
)
