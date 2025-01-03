import { Bezier } from "../lib/bezierjs/bezier.js";
/** Implements a line segment which is a cubic Bezier curve. */
export class BezierLineSegment {
    /**
     * Constructor: builds a BezierLineSegment from a JsonBezierLineSegment.
     * @param json Input control point data.
     * @param layer Layer to draw this line segment on.
     * @param lineWidth Line width.
     * @param color Color.
     */
    constructor(json, layer, lineWidth, color) {
        this.bezier = new Bezier(json.p0, json.p1, json.p2, json.p3);
        this.length = this.bezier.length();
        this.layer = layer;
        this.paperPaths = this.initializePaperPaths(json.p0, json.p1, json.p2, json.p3, lineWidth, color);
    }
    /** Draws this segment on-screen. */
    draw() {
        for (const paperPath of this.paperPaths) {
            this.layer.addChild(paperPath);
        }
    }
    /** Hides this segment from the screen. */
    hide() {
        for (const paperPath of this.paperPaths) {
            paperPath.remove();
        }
    }
    /**
     * Initializes the Paper objects that represent this line segment on-screen.
     * @param p0 Bezier control point p0.
     * @param p1 Bezier control point p0.
     * @param p2 Bezier control point p0.
     * @param p3 Bezier control point p0.
     * @param lineWidth Line width.
     * @param color Color.
     * @private
     */
    initializePaperPaths(p0, p1, p2, p3, lineWidth, color) {
        // paper.js does not allow you to define cubic Bezier curves directly.
        // You have to instead define each endpoint as a Segment object.
        const p1OffsetFromP0 = new paper.Point(p1.x - p0.x, p1.y - p0.y);
        const p2OffsetFromP3 = new paper.Point(p2.x - p3.x, p2.y - p3.y);
        const noOffset = new paper.Point(0, 0);
        // paper.js Segments use offsets for handle points.
        const p0Segment = new paper.Segment(p0, noOffset, p1OffsetFromP0);
        const p3Segment = new paper.Segment(p3, p2OffsetFromP3, noOffset);
        const paperPath = new paper.Path();
        paperPath.add(p0Segment);
        paperPath.add(p3Segment);
        paperPath.strokeWidth = lineWidth;
        paperPath.strokeColor = color;
        paperPath.remove();
        // Covers up gaps between adjacent bezier segments of dependent curves. todo: work with R script to potentially remove
        // Also between truncated Bezier curves and other segments.
        const circ1 = new paper.Path.Circle(p0, lineWidth / 2);
        circ1.fillColor = color;
        circ1.remove();
        const circ2 = new paper.Path.Circle(p3, lineWidth / 2);
        circ2.fillColor = color;
        circ2.remove();
        return [paperPath, circ1, circ2];
    }
}
