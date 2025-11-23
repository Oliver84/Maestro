
/**
 * Converts a linear fader value (0.0 - 1.0) to a dB string representation
 * approximating the Behringer X32/M32 fader curve.
 */
export const faderToDb = (value: number): string => {
    if (value >= 1.0) return '+10 dB';
    if (value <= 0.0) return '-oo dB';

    let db = 0;

    // Piecewise approximation of the X32 fader curve
    if (value >= 0.5) {
        // 0.5 -> -10dB, 0.75 -> 0dB, 1.0 -> +10dB
        // Linear interpolation for simplicity in this range is usually "close enough" for display
        // but let's try to be slightly more precise if possible.
        // 0.5 to 1.0 maps to -10 to +10. range = 0.5, dbRange = 20.
        // db = (value - 0.75) * 40; 
        // Check: 0.75 -> 0. 1.0 -> 10. 0.5 -> -10. Perfect.
        db = (value - 0.75) * 40;
    } else if (value >= 0.25) {
        // 0.25 -> -30dB, 0.5 -> -10dB
        // range = 0.25, dbRange = 20.
        // db = -30 + (value - 0.25) * 80;
        db = -30 + (value - 0.25) * 80;
    } else if (value >= 0.0625) {
        // 0.0625 -> -60dB, 0.25 -> -30dB
        // range = 0.1875, dbRange = 30.
        // db = -60 + (value - 0.0625) * (30 / 0.1875);
        db = -60 + (value - 0.0625) * 160;
    } else {
        // 0 -> -oo, 0.0625 -> -60
        // Just fade out quickly
        db = -90 + (value * 480);
    }

    // Formatting
    if (db > 0) return `+${db.toFixed(1)}`;
    return `${db.toFixed(1)}`;
};

/**
 * Converts a dB value to linear fader value (0.0 - 1.0)
 * Inverse of the above.
 */
export const dbToFader = (db: number): number => {
    if (db >= 10) return 1.0;
    if (db <= -90) return 0.0;

    if (db >= -10) {
        // (db / 40) + 0.75
        return (db / 40) + 0.75;
    } else if (db >= -30) {
        // (db + 30) / 80 + 0.25
        return (db + 30) / 80 + 0.25;
    } else if (db >= -60) {
        // (db + 60) / 160 + 0.0625
        return (db + 60) / 160 + 0.0625;
    } else {
        return (db + 90) / 480;
    }
}
