import {useRef} from 'react';
import {useIsoMorphicEffecct} from '../use-iso-morphic-effect';

export function useLatestValue<T>(value: T) {
  const cache = useRef(value);

  useIsoMorphicEffecct(() => {
    cache.current = value;
  }, [value]);

  return cache;
}
