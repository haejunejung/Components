'use clinet';

import {useActivePress} from '@/shared/hooks/use-active-press';
import {useDisabled} from '@/shared/internal/disabled';
import {
  forwardRefWithAs,
  HasDisplayName,
  mergeProps,
  RefProp,
  render,
} from '@/shared/lib/render';
import {Props} from '@/shared/lib/types';
import {useFocusRing} from '@react-aria/focus';
import {useHover} from '@react-aria/interactions';
import {ElementType, Ref, useMemo} from 'react';

const DEFAULT_BUTTON_TAG = 'button' as const;

type ButtonRenderPropArg = {
  disabled: boolean;
  hover: boolean;
  focus: boolean;
  active: boolean;
  autofocus: boolean;
};

type ButtonPropsWeControl = never;

export type ButtonProps<TTag extends ElementType = typeof DEFAULT_BUTTON_TAG> =
  Props<
    TTag,
    ButtonRenderPropArg,
    ButtonPropsWeControl,
    {
      disabled?: boolean;
      autoFocus?: boolean;
      type?: 'button' | 'submit' | 'reset';
    }
  >;

function ButtonFn<TTag extends ElementType = typeof DEFAULT_BUTTON_TAG>(
  props: ButtonProps<TTag>,
  ref: Ref<HTMLElement>,
) {
  const proviedDisabled = useDisabled();
  const {
    disabled = proviedDisabled || false,
    autoFocus = false,
    ...theirProps
  } = props;

  const {isFocusVisible: focus, focusProps} = useFocusRing({autoFocus});
  const {isHovered: hover, hoverProps} = useHover({isDisabled: disabled});
  const {pressed: active, pressProps} = useActivePress({disabled});

  const ourProps = mergeProps(
    {
      ref,
      type: theirProps.type ?? 'button',
      disabled: disabled || undefined,
      autoFocus,
    },
    focusProps,
    hoverProps,
    pressProps,
  );

  const slot = useMemo(() => {
    return {
      disabled,
      hover,
      focus,
      active,
      autofocus: autoFocus,
    } satisfies ButtonRenderPropArg;
  }, [disabled, hover, focus, active, autoFocus]);

  return render({
    ourProps,
    theirProps,
    slot,
    defaultTag: DEFAULT_BUTTON_TAG,
    name: 'Button',
  });
}

interface _internal_ComponentButton extends HasDisplayName {
  <TTag extends ElementType = typeof DEFAULT_BUTTON_TAG>(
    props: ButtonProps<TTag> & RefProp<typeof ButtonFn>,
  ): JSX.Element;
}

export let Button = forwardRefWithAs(ButtonFn) as _internal_ComponentButton;
