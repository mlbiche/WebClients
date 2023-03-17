import type { Callback } from '@proton/pass/types';

interface SharedContext<T = any> {
    set: (ctx: T) => T;
    get: () => T;
}

type SharedContextValue<T extends SharedContext = SharedContext> = T extends SharedContext<infer U> ? U : never;
type SharedContextInjector<F extends Callback, T extends SharedContext> = (
    ctx: SharedContextValue<T>,
    ...args: Parameters<F>
) => ReturnType<F>;

/**
 * Creates a generic context with a simple
 * setter/getter mechanism - Useful when you
 * want to create a global singleton context object
 * while avoiding "argument-drilling"
 */
export const createSharedContext = <T>(id: string): SharedContext<T> => {
    const ref: { ctx?: T } = {};

    const set = (ctx: T) => (ref.ctx = ctx);

    const get = (): T => {
        if (ref.ctx === undefined) {
            throw new Error(`Context#${id} has not been initialized`);
        }

        return ref.ctx;
    };

    return { set, get };
};

/**
 * Utility for creating a Higher-order context injector
 * to avoid calling context.get() everywhere. Maintains strong
 * type-safety when used with typed callbacks.
 *
 * usage:
 * ```
 * const withCtx = createSharedContextInjector(sharedContext);
 * const fn: (foo: string) => boolean = withCtx((ctx, check: boolean) => {
 *   // do something with the context;
 *   return check;
 * });
 *
 * fn(true);
 * ```
 */
export const createSharedContextInjector = <T extends SharedContext>(context: T) => {
    return <P extends any[], F extends Callback<P>>(fn: SharedContextInjector<F, T>) =>
        (...args: P) => {
            const value = context.get();
            return fn(value, ...(args as any));
        };
};
