/** @file Edge implementation. */
import {BezierLineSegment} from "./BezierLineSegment.js";
import {JsonEdge} from "./JsonTypes.js";
import {StraightLineSegment} from "./StraightLineSegment.js";
import {Edge, LineSegment, Station} from "../Types.js";

/** Implements an edge on a metro line. */
export class EdgeImpl implements Edge {
    // Graph properties
    /** From station. */
    public readonly station1: Station;
    /** To station. */
    public readonly station2: Station;

    // View properties
    /** Length in the underlying coordinate space. */
    public readonly length: number;
    /** Line segments which make up the edge. */
    private readonly lineSegments: LineSegment[];

    /**
     * Constructor: builds an edge from a JsonEdge.
     * @param json Input edge data.
     * @param station1 From station (needed as we can't resolve station ID -> Station here).
     * @param station2 To station (needed as we can't resolve station ID -> Station here).
     * @param layer Layer to draw this edge on.
     * @param lineWidth Line width.
     * @param color Color.
     */
    public constructor(json: JsonEdge, station1: Station, station2: Station, layer: paper.Layer, lineWidth: number, color: paper.Color) {
        this.station1 = station1;
        this.station2 = station2;
        this.lineSegments = json.lineSegments.map(lineSegment =>
            lineSegment.straightLine ? new StraightLineSegment(lineSegment, layer, lineWidth, color)
                : new BezierLineSegment(lineSegment, layer, lineWidth, color));

        this.length = this.lineSegments.map(lineSegment => lineSegment.length).reduce((l1, l2) => l1 + l2);
    }

    /** Draws this edge on-screen. */
    public draw() {
        this.lineSegments.forEach(lineSegment => lineSegment.draw());
    }

    /** Hides this edge from the screen. */
    public hide() {
        this.lineSegments.forEach(lineSegment => lineSegment.hide());
    }
}