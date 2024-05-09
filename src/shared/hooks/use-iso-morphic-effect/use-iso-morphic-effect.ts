import {env} from '@/shared/lib/utils/env';
import {
  DependencyList,
  EffectCallback,
  useEffect,
  useLayoutEffect,
} from 'react';

export function useIsoMorphicEffecct(
  effect: EffectCallback,
  deps?: DependencyList | undefined,
) {
  if (env.isServer) {
    useEffect(effect, deps);
  } else {
    useLayoutEffect(effect, deps);
  }
}
