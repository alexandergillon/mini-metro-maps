/** @file Edge implementation. */
import { BezierLineSegment } from "./BezierLineSegment.js";
import { StraightLineSegment } from "./StraightLineSegment.js";
/** Implements an edge on a metro line. */
export class EdgeImpl {
    /**
     * Constructor: builds an edge from a JsonEdge.
     * @param json Input edge data.
     * @param station1 From station (needed as we can't resolve station ID -> Station here).
     * @param station2 To station (needed as we can't resolve station ID -> Station here).
     * @param layer Layer to draw this edge on.
     * @param lineWidth Line width.
     * @param color Color.
     */
    constructor(json, station1, station2, layer, lineWidth, color) {
        this.station1 = station1;
        this.station2 = station2;
        this.lineSegments = json.lineSegments.map(lineSegment => lineSegment.straightLine ? new StraightLineSegment(lineSegment, layer, lineWidth, color)
            : new BezierLineSegment(lineSegment, layer, lineWidth, color));
        this.length = this.lineSegments.map(lineSegment => lineSegment.length).reduce((l1, l2) => l1 + l2);
    }
    /** Draws this edge on-screen. */
    draw() {
        this.lineSegments.forEach(lineSegment => lineSegment.draw());
    }
    /** Hides this edge from the screen. */
    hide() {
        this.lineSegments.forEach(lineSegment => lineSegment.hide());
    }
}
