import {
  cloneElement,
  createElement,
  ElementType,
  forwardRef,
  Fragment,
  isValidElement,
  MutableRefObject,
  ReactElement,
  Ref,
  useCallback,
  useRef,
} from 'react';
import {__, Expand, Props, XOR} from '../types';
import {classNames} from '../utils/class-names';
import {match} from '../utils/match';

export type HasDisplayName = {
  displayName: string;
};

export type RefProp<T extends Function> = T extends (
  props: any,
  ref: Ref<infer RefType>,
) => any
  ? {ref?: Ref<RefType>}
  : never;

export function mergeProps<T extends Props<any, any>[]>(...listOfProps: T) {
  if (listOfProps.length === 0) return {};
  if (listOfProps.length === 1) return listOfProps[0];

  const target: Props<any, any> = {};

  const eventHandlers: Record<
    string,
    ((...args: any[]) => void | undefined)[]
  > = {};

  for (const props of listOfProps) {
    for (const prop in props) {
      if (prop.startsWith('on') && typeof props[prop] === 'function') {
        eventHandlers[prop] ??= [];
        eventHandlers[prop].push(props[prop]);
      } else {
        target[prop] = props[prop];
      }
    }
  }

  for (const eventName in eventHandlers) {
    Object.assign(target, {
      [eventName](...args: any[]) {
        const handlers = eventHandlers[eventName];

        for (const handler of handlers) {
          handler?.(...args);
        }
      },
    });
  }

  return target;
}

export function forwardRefWithAs<
  T extends {name: string; displayName?: string},
>(component: T): T & HasDisplayName {
  return Object.assign(forwardRef(component as any) as any, {
    displayName: component.displayName ?? component.name,
  });
}

export enum RenderFeatures {
  None = 0,
  RenderStrategy = 1,
  Static = 2,
}

export enum RenderStrategy {
  Unmount,
  Hidden,
}

type PropsForFeature<
  TPassedInFeatures extends RenderFeatures,
  TForFeature extends RenderFeatures,
  TProps,
> = {
  [P in TPassedInFeatures]: P extends TForFeature ? TProps : __;
}[TPassedInFeatures];

export type PropsForFeatures<T extends RenderFeatures> = XOR<
  PropsForFeature<T, RenderFeatures.Static, {static?: boolean}>,
  PropsForFeature<T, RenderFeatures.RenderStrategy, {unmount?: boolean}>
>;

export function render<
  TFeature extends RenderFeatures,
  TTag extends ElementType,
  TSlot,
>({
  ourProps,
  theirProps,
  slot,
  defaultTag,
  features,
  visible = true,
  name,
  mergeRefs,
}: {
  ourProps: Expand<Props<TTag, TSlot, any> & PropsForFeatures<TFeature>> & {
    ref?: Ref<HTMLElement | ElementType>;
  };
  theirProps: Expand<Props<TTag, TSlot, any>>;
  slot?: TSlot;
  defaultTag: ElementType;
  features?: TFeature;
  visible?: boolean;
  name: string;
  mergeRefs?: ReturnType<typeof useMergeRefsFn>;
}) {
  mergeRefs = mergeRefs ?? defaultMergeRefs;

  const props = mergePropsAdvanced(theirProps, ourProps);

  // Visible always render
  if (visible) return _render(props, slot, defaultTag, name, mergeRefs);

  let featureFlags = features ?? RenderFeatures.None;

  if (featureFlags & RenderFeatures.Static) {
    let {static: isStatic = false, ...rest} =
      props as PropsForFeatures<RenderFeatures.Static>;

    // When the `static` prop is passed as `true`, then the user is in control, thus we don't care about anything else
    if (isStatic) return _render(rest, slot, defaultTag, name, mergeRefs);
  }

  if (featureFlags & RenderFeatures.RenderStrategy) {
    let {unmount = true, ...rest} =
      props as PropsForFeatures<RenderFeatures.RenderStrategy>;
    let strategy = unmount ? RenderStrategy.Unmount : RenderStrategy.Hidden;

    return match(strategy, {
      [RenderStrategy.Unmount]() {
        return null;
      },
      [RenderStrategy.Hidden]() {
        return _render(
          {...rest, ...{hidden: true, style: {display: 'none'}}},
          slot,
          defaultTag,
          name,
          mergeRefs!,
        );
      },
    });
  }

  // No features enabled, just render
  return _render(props, slot, defaultTag, name, mergeRefs);

  return;
}

export function useMergeRefsFn() {
  type MaybeRef<T> =
    | MutableRefObject<T>
    | ((value: T) => void)
    | null
    | undefined;
  const currentRefs = useRef<MaybeRef<any>[]>([]);
  const mergedRef = useCallback((value: any) => {
    for (const ref of currentRefs.current) {
      if (ref === null) continue;
      else if (ref === undefined) continue;
      else if (typeof ref === 'function') ref(value);
      else ref.current = value;
    }
  }, []);

  return (...refs: any[]) => {
    if (refs.every(ref => ref === null)) {
      return undefined;
    }

    currentRefs.current = refs;
    return mergedRef;
  };
}

export function defaultMergeRefs(...refs: any[]) {
  return refs.every(ref => ref === null)
    ? undefined
    : (value: any) => {
        for (const ref of refs) {
          if (ref === null) continue;
          else if (ref === undefined) continue;
          else if (typeof ref === 'function') ref(value);
          else ref.current = value;
        }
      };
}

export function mergePropsAdvanced(...listOfProps: Props<any, any>[]) {
  if (listOfProps.length === 0) return {};
  if (listOfProps.length === 1) return listOfProps[0];

  const target: Props<any, any> = {};

  const eventHandlers: Record<
    string,
    ((event: {defaultPrevented: boolean}, ...args: any[]) => void | undefined)[]
  > = {};

  for (const props of listOfProps) {
    for (const prop in props) {
      if (prop.startsWith('on') && typeof props[prop] === 'function') {
        eventHandlers[prop] ??= [];
        eventHandlers[prop].push(props[prop]);
      } else {
        target[prop] = props[prop];
      }
    }
  }

  if (target.disabled || target['aria-disabled']) {
    for (const eventName in eventHandlers) {
      if (
        /^(on(?:Click|Pointer|Mouse|Key)(?:Down|Up|Press)?)$/.test(eventName)
      ) {
        eventHandlers[eventName] = [(e: any) => e?.preventDefault?.()];
      }
    }
  }

  for (const eventName in eventHandlers) {
    Object.assign(target, {
      [eventName](
        event: {nativeEvent?: Event; defaultPrevented: boolean},
        ...args: any[]
      ) {
        const handlers = eventHandlers[eventName];

        for (const handler of handlers) {
          if (
            (event instanceof Event || event?.nativeEvent instanceof Event) &&
            event.defaultPrevented
          ) {
            return;
          }

          handler(event, ...args);
        }
      },
    });
  }

  return target;
}

function _render<TTag extends ElementType, TSlot>(
  props: Props<TTag, TSlot> & {ref?: unknown},
  slot: TSlot = {} as TSlot,
  tag: ElementType,
  name: string,
  mergeRefs: ReturnType<typeof useMergeRefsFn>,
) {
  let {
    as: Component = tag,
    children,
    refName = 'ref',
    ...rest
  } = omit(props, ['unmount', 'static']);

  // This allows us to use `<HeadlessUIComponent as={MyComponent} refName="innerRef" />`
  let refRelatedProps = props.ref !== undefined ? {[refName]: props.ref} : {};

  let resolvedChildren = (
    typeof children === 'function' ? children(slot) : children
  ) as ReactElement | ReactElement[];

  // Allow for className to be a function with the slot as the contents
  if (
    'className' in rest &&
    rest.className &&
    typeof rest.className === 'function'
  ) {
    rest.className = rest.className(slot);
  }

  // Drop `aria-labelledby` if it only references the current element. If the `aria-labelledby`
  // references itself but also another element then we can keep it.
  if (rest['aria-labelledby'] && rest['aria-labelledby'] === rest.id) {
    rest['aria-labelledby'] = undefined;
  }

  let dataAttributes: Record<string, string> = {};
  if (slot) {
    let exposeState = false;
    let states = [];
    for (let [k, v] of Object.entries(slot)) {
      if (typeof v === 'boolean') {
        exposeState = true;
      }

      if (v === true) {
        states.push(k.replace(/([A-Z])/g, m => `-${m.toLowerCase()}`));
      }
    }

    if (exposeState) {
      dataAttributes['data-headlessui-state'] = states.join(' ');
      for (let state of states) {
        dataAttributes[`data-${state}`] = '';
      }
    }
  }

  if (Component === Fragment) {
    if (
      Object.keys(compact(rest)).length > 0 ||
      Object.keys(compact(dataAttributes)).length > 0
    ) {
      if (
        !isValidElement(resolvedChildren) ||
        (Array.isArray(resolvedChildren) && resolvedChildren.length > 1)
      ) {
        if (Object.keys(compact(rest)).length > 0) {
          throw new Error(
            [
              'Passing props on "Fragment"!',
              '',
              `The current component <${name} /> is rendering a "Fragment".`,
              `However we need to passthrough the following props:`,
              Object.keys(compact(rest))
                .concat(Object.keys(compact(dataAttributes)))
                .map(line => `  - ${line}`)
                .join('\n'),
              '',
              'You can apply a few solutions:',
              [
                'Add an `as="..."` prop, to ensure that we render an actual element instead of a "Fragment".',
                'Render a single element as the child so that we can forward the props onto that element.',
              ]
                .map(line => `  - ${line}`)
                .join('\n'),
            ].join('\n'),
          );
        }
      } else {
        // Merge class name prop in SSR
        // @ts-ignore We know that the props may not have className. It'll be undefined then which is fine.
        let childProps = resolvedChildren.props as {
          className: string | (() => string);
        } | null;

        let childPropsClassName = childProps?.className;
        let newClassName =
          typeof childPropsClassName === 'function'
            ? (...args: any[]) =>
                classNames(
                  (childPropsClassName as Function)(...args),
                  (rest as {className?: string}).className,
                )
            : classNames(
                childPropsClassName,
                (rest as {className?: string}).className,
              );

        let classNameProps = newClassName ? {className: newClassName} : {};

        // Merge props from the existing element with the incoming props
        let mergedProps = mergePropsAdvanced(
          resolvedChildren.props as any,
          // Filter out undefined values so that they don't override the existing values
          compact(omit(rest, ['ref'])),
        );

        // Make sure that `data-*` that already exist in the `mergedProps` are
        // skipped.
        //
        // Typically we want to keep the props we set in each component because
        // they are required to make the component work correctly. However, in
        // case of `data-*` attributes, these are attributes that help the end
        // user.
        //
        // This means that since the props are not required for the component to
        // work, that we can safely prefer the `data-*` attributes from the
        // component that the end user provided.
        for (let key in dataAttributes) {
          if (key in mergedProps) {
            delete dataAttributes[key];
          }
        }

        return cloneElement(
          resolvedChildren,
          Object.assign(
            {},
            mergedProps,
            dataAttributes,
            refRelatedProps,
            {
              ref: mergeRefs(
                (resolvedChildren as any).ref,
                refRelatedProps.ref,
              ),
            },
            classNameProps,
          ),
        );
      }
    }
  }

  return createElement(
    Component,
    Object.assign(
      {},
      omit(rest, ['ref']),
      Component !== Fragment && refRelatedProps,
      Component !== Fragment && dataAttributes,
    ),
    resolvedChildren,
  );
}

export function compact<T extends Record<any, any>>(object: T) {
  let clone = Object.assign({}, object);
  for (let key in clone) {
    if (clone[key] === undefined) delete clone[key];
  }
  return clone;
}

function omit<T extends Record<any, any>>(
  object: T,
  keysToOmit: string[] = [],
) {
  let clone = Object.assign({}, object) as T;
  for (let key of keysToOmit) {
    if (key in clone) delete clone[key];
  }
  return clone;
}
