import {JSXElementConstructor, ReactElement, ReactNode} from 'react';

// A unique placeholder we can use as a default. This is nice because we can use this instead of
// defaulting to null / never / ... and possibly collide with actual data.
// Ideally we use a unique symbol here.
let __ = '1D45E01E-AF44-47C4-988A-19A94EBAF55C' as const;
export type __ = typeof __;

export type ReactTag = keyof JSX.IntrinsicElements | JSXElementConstructor<any>;

type PropsWeControl = 'as' | 'children' | 'refName' | 'className';

type PropsOf<TTag extends ReactTag> = TTag extends React.ElementType
  ? Omit<React.ComponentProps<TTag>, 'ref'>
  : never;

type CleanProps<
  TTag extends ReactTag,
  TOmittableProps extends PropertyKey = never,
> = Omit<PropsOf<TTag>, TOmittableProps | PropsWeControl>;

type OurProps<TTag extends ReactTag, TSlot> = {
  as?: TTag;
  children?: ReactNode | ((bag: TSlot) => ReactElement);
  refName?: string;
};

type HasProperty<T extends object, K extends PropertyKey> = T extends never
  ? never
  : K extends keyof T
    ? true
    : never;

// className = {'active'}
// className = {active => active ? 'active' : 'inactive'} ((bag: TSlot) => string)
type ClassNameOverride<TTag extends ReactTag, TSlot = {}> =
  true extends HasProperty<PropsOf<TTag>, 'className'>
    ? {className?: PropsOf<TTag>['className'] | ((bag: TSlot) => string)}
    : {};

export type Expand<T> = T extends infer O ? {[K in keyof O]: O[K]} : never;

export type Props<
  TTag extends ReactTag,
  TSlot = {},
  TOmittableProps extends PropertyKey = never,
  Overrides = {},
> = CleanProps<TTag, TOmittableProps | keyof Overrides> &
  OurProps<TTag, TSlot> &
  ClassNameOverride<TTag, TSlot> &
  Overrides;

type Without<T, U> = {[P in Exclude<keyof T, keyof U>]?: never};

export type XOR<T, U> = T | U extends __
  ? never
  : T extends __
    ? U
    : U extends __
      ? T
      : T | U extends object
        ? (Without<T, U> & U) | (Without<U, T> & T)
        : T | U;
