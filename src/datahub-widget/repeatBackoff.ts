import {interval, MonoTypeOperatorFunction} from "rxjs";
import {delayWhen, repeatWhen} from "rxjs/operators";

/**
 * Exponentially (Doubling) backoff the repeats so that we aren't spamming an api
 * @param config
 */
export function repeatBackoff<T>(config: { initialDelay: number, maxDelay: number }): MonoTypeOperatorFunction<T> {
    // This isn't actually deprecated but appears so in some editors
    // noinspection JSDeprecatedSymbols
    return repeatWhen<T>(notifier => notifier.pipe(delayWhen((_, i) => interval(Math.min(Math.pow(2, i) * config.initialDelay, config.maxDelay)))));
}
