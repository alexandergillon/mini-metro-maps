/** Straight line segment implementation. */
import {JsonStraightLineSegment} from "./JsonTypes.js";
import {LineSegment, Point} from "../Types.js";

/** Implements a line segment which is a straight line. */
export class StraightLineSegment implements LineSegment {
    /** Length in the underlying coordinate space. */
    public readonly length: number;

    /** Endpoint of the line. */
    private readonly p0: Point;
    /** Other endpoint of the line. */
    private readonly p1: Point;
    /** Paper layer that this line segment is drawn on. */
    private readonly layer: paper.Layer;
    /** Paper Path which constitutes this line segment on-screen. */
    private readonly paperPath: paper.Path;

    /**
     * Constructor: builds a StraightLineSegment from a JsonStraightLineSegment.
     * @param json Input endpoint data.
     * @param layer Layer to draw this line segment on.
     * @param lineWidth Line width.
     * @param color Color.
     */
    public constructor(json: JsonStraightLineSegment, layer: paper.Layer, lineWidth: number, color: paper.Color) {
        this.p0 = json.p0;
        this.p1 = json.p1;

        const dx = json.p1.x - json.p0.x;
        const dy = json.p1.y - json.p0.y;
        this.length =  Math.sqrt(dx * dx + dy * dy);

        this.layer = layer;
        this.paperPath = this.initializePaperPath(lineWidth, color);
    }

    /** Draws this segment on-screen. */
    public draw() {
        this.layer.addChild(this.paperPath);
    }

    /** Hides this segment from the screen. */
    public hide() {
        this.paperPath.remove();
    }

    /**
     * Initializes the Paper Path which makes up this line segment on-screen.
     * @param lineWidth Line width.
     * @param color Color.
     * @private
     */
    private initializePaperPath(lineWidth: number, color: paper.Color): paper.Path {
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