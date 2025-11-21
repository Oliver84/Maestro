/**
 * Throttle function - limits how often a function can be called
 * @param func Function to throttle
 * @param delay Minimum time between calls in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timeoutId: NodeJS.Timeout | null = null;

    return function (this: any, ...args: Parameters<T>) {
        const now = Date.now();
        const timeSinceLastCall = now - lastCall;

        // Clear any pending timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        if (timeSinceLastCall >= delay) {
            // Enough time has passed, call immediately
            lastCall = now;
            func.apply(this, args);
        } else {
            // Schedule a call for later
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                func.apply(this, args);
                timeoutId = null;
            }, delay - timeSinceLastCall);
        }
    };
}
