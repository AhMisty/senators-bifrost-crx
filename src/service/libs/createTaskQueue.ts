type TaskQueue = {
  run: <Result>(task: () => Promise<Result>) => Promise<Result>
  wait: () => Promise<void>
}

const ignoreResolution = (): void => undefined

export const createTaskQueue = (): TaskQueue => {
  let pending: Promise<void> = Promise.resolve()

  return {
    run: <Result>(task: () => Promise<Result>): Promise<Result> => {
      const result = pending.then(task, task)

      pending = result.then(ignoreResolution, ignoreResolution)

      return result
    },
    wait: async (): Promise<void> => {
      await pending.catch(ignoreResolution)
    },
  }
}
