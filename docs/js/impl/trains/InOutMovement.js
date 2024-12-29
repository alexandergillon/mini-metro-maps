/** Class for a simple, in-out easing movement. */
export class InOutMovement {
    /**
     * Constructor.
     * @param train The train to play this animation on.
     * @param startTime Start time of the animation.
     * @param endTime End time of the animation.
     * @param path Path to follow.
     * @param initialDistance Initial distance along the path, default 0.
     */
    constructor(train, startTime, endTime, path, initialDistance = 0) {
        this.train = train;
        this.startTime = startTime;
        this.endTime = endTime;
        this.path = path;
        this.toMoveDistance = this.path.length - initialDistance;
        this.movedDistance = 0;
        if (initialDistance)
            this.path.move(initialDistance);
    }
    /**
     * Samples the current location of the train, using the current time.
     * @private
     */
    samplePoint() {
        // Easing function t^a / (t^a + (1-t)^a). More information on easing function: https://math.stackexchange.com/a/121755/1172131.
        const t = (Date.now() - this.startTime) / (this.endTime - this.startTime);
        const tAlpha = Math.pow(t, InOutMovement.EASING_ALPHA);
        const distanceProportion = tAlpha / (tAlpha + Math.pow(1 - t, InOutMovement.EASING_ALPHA));
        const newDistance = this.toMoveDistance * distanceProportion;
        this.path.move(newDistance - this.movedDistance);
        this.movedDistance = newDistance;
        return this.path.samplePoint();
    }
    update() {
        const newLocation = this.samplePoint();
        this.train.x = newLocation.x;
        this.train.y = newLocation.y;
    }
    get location() {
        return this.path.location;
    }
}
/**
 * Alpha parameter for the easing function t^a / (t^a + (1-t)^a).
 * More information on easing function: https://math.stackexchange.com/a/121755/1172131.
 */
InOutMovement.EASING_ALPHA = 2;
