/** @file Edge implementation. */
import {BezierLineSegment} from "./BezierLineSegment.js";
import {JsonEdge} from "./JsonTypes.js";
import {StraightLineSegment} from "./StraightLineSegment.js";
import {Edge, LineSegment, Point, Station} from "../Types.js";

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
     * Constructor.
     * @param station1 First station.
     * @param station2 Second station.
     * @param lineSegments Line segments between the two stations, in the direction station1 --> station2.
     * @private
     */
    private constructor(station1: Station, station2: Station, lineSegments: LineSegment[]) {
        this.station1 = station1;
        this.station2 = station2;
        this.length = lineSegments.map(lineSegment => lineSegment.length).reduce((l1, l2) => l1 + l2);
        this.lineSegments = lineSegments;
    }

    /**
     * Builds an edge from a JsonEdge.
     * @param json Input edge data.
     * @param station1 From station (needed as we can't resolve station ID -> Station here).
     * @param station2 To station (needed as we can't resolve station ID -> Station here).
     * @param layer Layer to draw this edge on.
     * @param lineWidth Line width.
     * @param color Color.
     */
    public static fromJson(json: JsonEdge, station1: Station, station2: Station, layer: paper.Layer, lineWidth: number, color: paper.Color): Edge {
        const lineSegments = json.lineSegments.map(lineSegment =>
            lineSegment.straightLine ? StraightLineSegment.fromJson(lineSegment, layer, lineWidth, color)
                : BezierLineSegment.fromJson(lineSegment, layer, lineWidth, color));
        return new EdgeImpl(station1, station2, lineSegments);
    }

    /** Draws this edge on-screen. */
    public draw() {
        this.lineSegments.forEach(lineSegment => lineSegment.draw());
    }

    /** Hides this edge from the screen. */
    public hide() {
        this.lineSegments.forEach(lineSegment => lineSegment.hide());
    }

    /**
     * Samples a point at a distance along this edge.
     * @param distance The distance along the edge to sample.
     * @return The sample point.
     */
    public samplePoint(distance: number): Point {
        if (distance >= this.length) {
            return this.station2.location;
        }

        // TODO: if this becomes a bottleneck, consider precomputing segment mapping
        let segmentIndex = 0;
        let prefixLength = 0;
        while (prefixLength + this.lineSegments[segmentIndex+1].length < distance) {
            segmentIndex++;
            prefixLength += this.lineSegments[segmentIndex+1].length;
        }

        return this.lineSegments[segmentIndex].samplePoint(distance - prefixLength);
    }
}