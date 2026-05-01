type SharedMousePointer = Readonly<{
  clientX: number
  clientY: number
}> | null

type SharedMousePointerListener = (pointer: SharedMousePointer) => void

const listeners = new Set<SharedMousePointerListener>()
let currentPointer: SharedMousePointer = null
let pendingPointer: SharedMousePointer | undefined
let animationFrameId = 0

const notifyListeners = (pointer: SharedMousePointer): void => {
  currentPointer = pointer

  listeners.forEach((listener) => {
    listener(pointer)
  })
}

const flushPendingPointer = (): void => {
  animationFrameId = 0

  if (pendingPointer === undefined) {
    return
  }

  const pointer = pendingPointer
  pendingPointer = undefined
  notifyListeners(pointer)
}

const schedulePointerNotification = (pointer: SharedMousePointer): void => {
  pendingPointer = pointer

  if (animationFrameId) {
    return
  }

  animationFrameId = requestAnimationFrame(flushPendingPointer)
}

const handleMouseMove = (event: MouseEvent): void => {
  schedulePointerNotification({
    clientX: event.clientX,
    clientY: event.clientY,
  })
}

const handleMouseLeave = (): void => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = 0
  }

  pendingPointer = undefined
  notifyListeners(null)
}

const addDocumentListeners = (): void => {
  document.addEventListener('mousemove', handleMouseMove, { passive: true })
  document.addEventListener('mouseleave', handleMouseLeave)
}

const removeDocumentListeners = (): void => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseleave', handleMouseLeave)
}

export const subscribeSharedMousePointer = (listener: SharedMousePointerListener): (() => void) => {
  if (typeof document === 'undefined') {
    return () => {}
  }

  if (listeners.size === 0) {
    addDocumentListeners()
  }

  listeners.add(listener)
  listener(currentPointer)

  return () => {
    listeners.delete(listener)

    if (listeners.size === 0) {
      removeDocumentListeners()
      cancelAnimationFrame(animationFrameId)
      animationFrameId = 0
      pendingPointer = undefined
      currentPointer = null
    }
  }
}
