import * as React from 'react'

/** Runs the effect once on mount; cleanup runs on unmount. Same as `useEffect(fn, [])`. */
export function useEffectMount(effect: React.EffectCallback) {
  React.useEffect(effect, [])
}
