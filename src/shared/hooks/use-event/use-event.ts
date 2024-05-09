import {useCallback} from 'react';
import {useLatestValue} from '../use-latest-value';

export const useEvent = function useEvent<
  F extends (...args: any[]) => any,
  P extends any[] = Parameters<F>,
  R = ReturnType<F>,
>(cb: (...args: P) => R) {
  let cache = useLatestValue(cb);
  return useCallback((...args: P) => cache.current(...args), [cache]);
};
