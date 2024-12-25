import { Point } from "../Types.js";
import { ReverseLineSegment } from "./ReverseLineSegment.js";
/** Implements a line segment which is a straight line. */
export class StraightLineSegment {
    /**
     * Constructor.
     * @param p0 First endpoint.
     * @param p1 Second endpoint.
     * @param layer Layer to draw this line segment on.
     * @param lineWidth Line width.
     * @param color Color.
     * @private
     */
    constructor(p0, p1, layer, lineWidth, color) {
        this.p0 = p0;
        this.p1 = p1;
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        this.length = Math.sqrt(dx * dx + dy * dy);
        this.unitVector = new Point(dx / this.length, dy / this.length);
        this.reverse = new ReverseLineSegment(this);
        this.layer = layer;
        this.paperPath = this.initializePaperPath(lineWidth, color);
    }
    /**
     * Builds a StraightLineSegment from a JsonStraightLineSegment.
     * @param json Input endpoint data.
     * @param layer Layer to draw this line segment on.
     * @param lineWidth Line width.
     * @param color Color.
     */
    static fromJson(json, layer, lineWidth, color) {
        return new StraightLineSegment(json.p0, json.p1, layer, lineWidth, color);
    }
    /** Draws this segment on-screen. */
    draw() {
        this.layer.addChild(this.paperPath);
    }
    /** Hides this segment from the screen. */
    hide() {
        this.paperPath.remove();
    }
    /**
     * Samples a point at a distance along this line segment.
     * @param distance The distance along the line segment to sample.
     * @return The sample point.
     */
    samplePoint(distance) {
        const x = this.p0.x + distance * this.unitVector.x;
        const y = this.p0.y + distance * this.unitVector.y;
        return new Point(x, y);
    }
    /**
     * Initializes the Paper Path which makes up this line segment on-screen.
     * @param lineWidth Line width.
     * @param color Color.
     * @private
     */
    initializePaperPath(lineWidth, color) {
        // dx and dy extend all straight line segments by 1 pixel in either direction.
        // Otherwise, it will appear like there are tiny gaps between segments.
        const dx = Math.sign(this.p1.x - this.p0.x);
        const dy = Math.sign(this.p1.y - this.p0.y);
        const p0 = new paper.Point(this.p0.x - dx, this.p0.y - dy);
        const p1 = new paper.Point(this.p1.x + dx, this.p1.y + dy);
        const paperPath = new paper.Path();
        paperPath.add(p0);
        paperPath.add(p1);
        paperPath.strokeWidth = lineWidth;
        paperPath.strokeColor = color;
        paperPath.remove();
        return paperPath;
    }
}
