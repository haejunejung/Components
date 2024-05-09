import {disposables} from '@/shared/lib/utils/disposables';
import {useEffect, useState} from 'react';

export function useDisposables() {
  const [d] = useState(disposables);
  useEffect(() => () => d.dispose(), [d]);
  return d;
}
