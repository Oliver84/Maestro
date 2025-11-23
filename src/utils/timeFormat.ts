/**
 * Format seconds into MM:SS format
 */
export function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format time remaining (shows negative if past duration)
 */
export function formatTimeRemaining(current: number, duration: number): string {
    const remaining = duration - current;
    if (remaining < 0) {
        return `-${formatTime(Math.abs(remaining))}`;
    }
    return formatTime(remaining);
}
