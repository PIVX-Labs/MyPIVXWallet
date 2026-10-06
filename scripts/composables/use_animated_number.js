import { ref, watch, onUnmounted } from 'vue';

const prefersReducedMotion = () =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Tween a numeric ref towards its latest value, for count-up style displays
 * @param {() => number} source - Getter for the value to follow
 * @param {() => any} [snapKey] - Getter for a context key (e.g. the active account);
 * when it changes the value snaps instead of animating, so switching contexts
 * never looks like money moving
 * @param {number} [duration] - Tween duration in ms
 * @returns {import('vue').Ref<number>} The animated value
 */
export function useAnimatedNumber(
    source,
    snapKey = () => null,
    duration = 700
) {
    const value = ref(source());
    let frame = null;

    const cancel = () => {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
    };

    watch([source, snapKey], ([target, key], [, oldKey]) => {
        cancel();
        if (key !== oldKey || prefersReducedMotion()) {
            value.value = target;
            return;
        }
        const from = value.value;
        const start = performance.now();
        const step = (now) => {
            const t = Math.min(1, (now - start) / duration);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - t, 3);
            value.value = from + (target - from) * eased;
            frame = t < 1 ? requestAnimationFrame(step) : null;
        };
        frame = requestAnimationFrame(step);
    });

    onUnmounted(cancel);

    return value;
}
