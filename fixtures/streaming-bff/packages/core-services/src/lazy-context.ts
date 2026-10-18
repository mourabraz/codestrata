/** One factory per context property. A factory runs the first time its value is used. */
export type ContextBuilders<T> = { [K in keyof T]: () => T[K] };

/** A stand-in for the value `build` returns. The value is built on first access and then reused. */
function lazyValue<T extends object>(build: () => T): T {
  let instance: T | undefined;
  const resolve = () => {
    instance ??= build();
    return instance;
  };
  return new Proxy({} as T, {
    get(_target, property) {
      const target = resolve();
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    has: (_target, property) => property in resolve(),
    ownKeys: () => Reflect.ownKeys(resolve()),
    getOwnPropertyDescriptor(_target, property) {
      const descriptor = Reflect.getOwnPropertyDescriptor(resolve(), property);
      return descriptor && { ...descriptor, configurable: true };
    },
  });
}

/**
 * Builds a per-request context whose services are created lazily, so a request only pays for the
 * services its resolvers actually touch. Every property is a real property holding a Proxy, so the
 * context survives being copied (GraphQL servers merge it into their own context object).
 */
export function createLazyContext<T extends { [K in keyof T]: object }>(builders: ContextBuilders<T>): T {
  const context = {} as T;
  for (const key of Object.keys(builders) as (keyof T)[]) {
    context[key] = lazyValue(builders[key]);
  }
  return context;
}
