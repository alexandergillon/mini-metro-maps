/** @file Edge implementation. */
import { BezierLineSegment } from "./BezierLineSegment.js";
import { StraightLineSegment } from "./StraightLineSegment.js";
/** Implements an edge on a metro line. */
export class EdgeImpl {
    /**
     * Constructor.
     * @param station1 First station.
     * @param station2 Second station.
     * @param lineSegments Line segments between the two stations, in the direction station1 --> station2.
     * @private
     */
    constructor(station1, station2, lineSegments) {
        this.station1 = station1;
        this.station2 = station2;
        this.length = lineSegments.map(lineSegment => lineSegment.length).reduce((l1, l2) => l1 + l2);
        this.lineSegments = lineSegments;
        this.reverse = new ReverseEdge(this);
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
    static fromJson(json, station1, station2, layer, lineWidth, color) {
        const lineSegments = json.lineSegments.map(lineSegment => lineSegment.straightLine ? StraightLineSegment.fromJson(lineSegment, layer, lineWidth, color)
            : BezierLineSegment.fromJson(lineSegment, layer, lineWidth, color));
        return new EdgeImpl(station1, station2, lineSegments);
    }
    /** Draws this edge on-screen. */
    draw() {
        this.lineSegments.forEach(lineSegment => lineSegment.draw());
    }
    /** Hides this edge from the screen. */
    hide() {
        this.lineSegments.forEach(lineSegment => lineSegment.hide());
    }
    /**
     * Samples a point at a distance along this edge.
     * @param distance The distance along the edge to sample.
     * @return The sample point.
     */
    samplePoint(distance) {
        if (distance >= this.length) {
            return this.station2.location;
        }
        // TODO: if this becomes a bottleneck, consider precomputing prefix lengths
        let segmentIndex = 0;
        let prefixLength = 0;
        while (segmentIndex < this.lineSegments.length - 1 && prefixLength + this.lineSegments[segmentIndex].length < distance) {
            prefixLength += this.lineSegments[segmentIndex].length;
            segmentIndex++;
        }
        return this.lineSegments[segmentIndex].samplePoint(distance - prefixLength);
    }
    toString() {
        return `EdgeImpl from ${this.station1} to ${this.station2}`;
    }
}
/** Class that provides a reversed 'view' of a line segment. */
class ReverseEdge {
    constructor(edge) {
        this.edge = edge;
    }
    get length() {
        return this.edge.length;
    }
    get reverse() {
        return this.edge;
    }
    get station1() {
        return this.edge.station2;
    }
    get station2() {
        return this.edge.station1;
    }
    draw() {
        this.edge.draw();
    }
    hide() {
        this.edge.hide();
    }
    samplePoint(distance) {
        return this.edge.samplePoint(this.length - distance);
    }
    toString() {
        return `Reverse edge of ${this.edge}`;
    }
}
