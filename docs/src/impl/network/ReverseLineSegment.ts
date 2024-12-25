/** @file Line segment which wraps an underlying line segment, but reverses it. */
import {LineSegment, Point} from "../Types.js";

/** Class that provides a reversed 'view' of a line segment. */
export class ReverseLineSegment implements LineSegment {
    /** The underlying line segment to reverse. */
    private readonly lineSegment;

    constructor(lineSegment: LineSegment) {
        this.lineSegment = lineSegment;
    }

    public get length() {
        return this.lineSegment.length;
    }

    public get reverse() {
        return this.lineSegment;
    }

    public draw(): void {
        this.lineSegment.draw();
    }

    public hide(): void {
        this.lineSegment.hide();
    }

    public samplePoint(distance: number): Point {
        return this.lineSegment.samplePoint(this.length - distance);
    }

    public toString() {
        return `Reverse line segment of ${this.lineSegment}`;
    }
}
