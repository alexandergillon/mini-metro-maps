/** Class for a simple, in-out easing movement. */
export class InOutMovement {
    /**
     * Constructor.
     * @param path Path to follow.
     * @param startTime Start time of the animation.
     * @param finishTime End time of the animation.
     */
    constructor(path, startTime, finishTime) {
        this.path = path;
        this.distance = 0;
        this.startTime = startTime;
        this.endTime = finishTime;
    }
    samplePoint() {
        // Easing function t^a / (t^a + (1-t)^a). More information on easing function: https://math.stackexchange.com/a/121755/1172131.
        const t = (Date.now() - this.startTime) / (this.endTime - this.startTime);
        const tAlpha = Math.pow(t, InOutMovement.EASING_ALPHA);
        const distanceProportion = tAlpha / (tAlpha + Math.pow(1 - t, InOutMovement.EASING_ALPHA));
        const newDistance = this.path.length * distanceProportion;
        this.path.move(newDistance - this.distance);
        this.distance = newDistance;
        return this.path.samplePoint();
    }
}
/**
 * Alpha parameter for the easing function t^a / (t^a + (1-t)^a).
 * More information on easing function: https://math.stackexchange.com/a/121755/1172131.
 */
InOutMovement.EASING_ALPHA = 2;
