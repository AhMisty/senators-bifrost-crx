import styles from './NotFoundView.module.css'

import { useNavigate } from '@solidjs/router'
import { type Component } from 'solid-js'

import { CardFrameList, CardFrameListItem } from '@/ui/components/CardFrameList'
import { ControlButton } from '@/ui/components/FormControls'
import { defaultRoute } from '@/shared/routes'

export const NotFoundView: Component = () => {
  const navigate = useNavigate()

  return (
    <main class={styles.root}>
      <CardFrameList class={styles.cardList}>
        <CardFrameListItem>
          <section class={styles.cardContent}>
            <p class={styles.code}>404</p>
            <h1 class={styles.title}>页面不存在</h1>
            <p class={styles.description}>当前路径没有对应的扩展页面。</p>
            <div class={styles.actions}>
              <ControlButton variant="primary" onClick={() => navigate(defaultRoute)}>
                返回配置
              </ControlButton>
            </div>
          </section>
        </CardFrameListItem>
      </CardFrameList>
    </main>
  )
}
