/** @file Code for a simple, in-out easing movement. */
import {Path, Point, TrainMovement} from "../Types";

/** Class for a simple, in-out easing movement. */
export class InOutMovement implements TrainMovement {
    /** Current path that the train is on. */
    private readonly path: Path;
    /** Current distance along the path. */
    private distance: number;
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
     * @param path Path to follow.
     * @param startTime Start time of the animation.
     * @param finishTime End time of the animation.
     */
    constructor(path: Path, startTime: number, finishTime: number) {
        this.path = path;
        this.distance = 0;
        this.startTime = startTime;
        this.endTime = finishTime;
    }

    samplePoint(): Point {
        // Easing function t^a / (t^a + (1-t)^a). More information on easing function: https://math.stackexchange.com/a/121755/1172131.
        const t = (Date.now() - this.startTime) / (this.endTime - this.startTime);
        const tAlpha = Math.pow(t, InOutMovement.EASING_ALPHA);
        const distanceProportion =  tAlpha / (tAlpha + Math.pow(1-t, InOutMovement.EASING_ALPHA));
        const newDistance = this.path.length * distanceProportion;
        this.path.move(newDistance - this.distance);
        this.distance = newDistance;
        return this.path.samplePoint();
    }
}