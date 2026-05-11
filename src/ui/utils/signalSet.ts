const cloneSet = <T>(values: Set<T>): Set<T> => new Set(values)

export const addSetValue = <T>(values: Set<T>, value: T): Set<T> => {
  if (values.has(value)) {
    return values
  }

  const nextValues = cloneSet(values)
  nextValues.add(value)
  return nextValues
}

export const deleteSetValue = <T>(values: Set<T>, value: T): Set<T> => {
  if (!values.has(value)) {
    return values
  }

  const nextValues = cloneSet(values)
  nextValues.delete(value)
  return nextValues
}

export const toggleSetValue = <T>(values: Set<T>, value: T): Set<T> => {
  const nextValues = cloneSet(values)

  if (nextValues.has(value)) {
    nextValues.delete(value)
  } else {
    nextValues.add(value)
  }

  return nextValues
}

export const retainSetValues = <T>(values: Set<T>, validValues: Set<T>): Set<T> => {
  let nextValues: Set<T> | undefined

  values.forEach((value) => {
    if (validValues.has(value)) {
      return
    }

    if (!nextValues) {
      nextValues = cloneSet(values)
    }

    nextValues.delete(value)
  })

  return nextValues ?? values
}
