import {microTask} from '../micro-task';

export type Disposables = {
  addEventListener<TEventName extends keyof WindowEventMap>(
    element: HTMLElement | Window | Document,
    name: TEventName,
    listener: (event: WindowEventMap[TEventName]) => any,
    options?: boolean | AddEventListenerOptions,
  ): () => void;

  requestAnimationFrame(cb: FrameRequestCallback): () => void;

  nextFrame(cb: FrameRequestCallback): () => void;

  setTimeout(
    cb: (...args: any[]) => void,
    ms?: number,
    ...args: any[]
  ): () => void;

  microTask(cb: () => void): () => void;

  style(node: HTMLElement, property: string, value: string): () => void;

  group(cb: (d: Disposables) => void): () => void;

  add(cb: () => void): () => void;

  dispose(): void;
};

export function disposables(): Disposables {
  const _disposables: Function[] = [];

  const api: Disposables = {
    addEventListener<TEventName extends keyof WindowEventMap>(
      element: HTMLElement | Window | Document,
      name: TEventName,
      listener: (event: WindowEventMap[TEventName]) => any,
      options?: boolean | AddEventListenerOptions,
    ) {
      element.addEventListener(name, listener as any, options);
      return api.add(() =>
        element.removeEventListener(name, listener as any, options),
      );
    },

    requestAnimationFrame(...args: Parameters<typeof requestAnimationFrame>) {
      let raf = requestAnimationFrame(...args);
      return api.add(() => cancelAnimationFrame(raf));
    },

    nextFrame(...args: Parameters<typeof requestAnimationFrame>) {
      return api.requestAnimationFrame(() => {
        return api.requestAnimationFrame(...args);
      });
    },

    setTimeout(...args: Parameters<typeof setTimeout>) {
      let timer = setTimeout(...args);
      return api.add(() => clearTimeout(timer));
    },

    microTask(...args: Parameters<typeof microTask>) {
      let task = {current: true};
      microTask(() => {
        if (task.current) {
          args[0]();
        }
      });
      return api.add(() => {
        task.current = false;
      });
    },

    style(node: HTMLElement, property: string, value: string) {
      let previous = node.style.getPropertyValue(property);
      Object.assign(node.style, {[property]: value});
      return api.add(() => {
        Object.assign(node.style, {[property]: previous});
      });
    },

    group(cb: (d: typeof api) => void) {
      let d = disposables();
      cb(d);
      return api.add(() => d.dispose());
    },

    add(cb: () => void) {
      if (!_disposables.includes(cb)) {
        _disposables.push(cb);
      }

      return () => {
        const idx = _disposables.indexOf(cb);
        if (idx >= 0) {
          for (const dispose of _disposables.splice(idx, 1)) {
            dispose();
          }
        }
      };
    },

    dispose() {
      for (const dispose of _disposables.splice(0)) {
        dispose();
      }
    },
  };

  return api;
}
