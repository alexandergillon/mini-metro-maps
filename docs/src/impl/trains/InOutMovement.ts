/** @file Code for a simple, in-out easing movement. */
import {Path, Point, TrainMovement, ViewTrain} from "../Types";

/** Class for a simple, in-out easing movement. */
export class InOutMovement implements TrainMovement {
    /** The train that this animation is playing on. */
    private readonly train: ViewTrain;
    /** Current path that the train is on. */
    private readonly path: Path;
    /**
     * The distance that the train will move along this path. If the train starts partway through the path, this will
     * not be equal to the length of the path.
     */
    private readonly toMoveDistance;
    /**
     * Current distance that the train has moved as part of this movement. Note: does not equal distance along the path
     * when the train started partway through the path.
     */
    private movedDistance: number;
    /** Start time of this animation. */
    private readonly startTime: number;
    /** End time of this animation. */
    private readonly endTime: number;
    /**
     * Alpha parameter for the easing function t^a / (t^a + (1-t)^a).
     * More information on easing function: https://math.stackexchange.com/a/121755/1172131.
     */
    private static readonly EASING_ALPHA = 2;

    /**
     * Constructor.
     * @param train The train to play this animation on.
     * @param startTime Start time of the animation.
     * @param endTime End time of the animation.
     * @param path Path to follow.
     * @param initialDistance Initial distance along the path, default 0.
     */
    public constructor(train: ViewTrain, startTime: number, endTime: number, path: Path, initialDistance: number = 0) {
        this.train = train;
        this.startTime = startTime;
        this.endTime = endTime;
        this.path = path;
        this.toMoveDistance = this.path.length - initialDistance;
        this.movedDistance = 0;

        if (initialDistance) this.path.move(initialDistance);
    }

    /**
     * Samples the current location of the train, using the current time.
     * @private
     */
    private samplePoint(): Point {
        // Easing function t^a / (t^a + (1-t)^a). More information on easing function: https://math.stackexchange.com/a/121755/1172131.
        // Clamp t to 1 if Date.now() is after this.endTime, as we don't want to keep moving after the movement ends.
        const t = Math.min((Date.now() - this.startTime) / (this.endTime - this.startTime), 1);
        const tAlpha = Math.pow(t, InOutMovement.EASING_ALPHA);
        const distanceProportion =  tAlpha / (tAlpha + Math.pow(1-t, InOutMovement.EASING_ALPHA));
        const newDistance = this.toMoveDistance * distanceProportion;
        this.path.move(newDistance - this.movedDistance);
        this.movedDistance = newDistance;
        return this.path.samplePoint();
    }

    /** Updates the train's position based on the current time. */
    public update(): void {
        const newLocation = this.samplePoint();
        this.train.x = newLocation.x;
        this.train.y = newLocation.y;
    }

    /** Current location of the train. */
    public get location() {
        return this.path.location;
    }
}