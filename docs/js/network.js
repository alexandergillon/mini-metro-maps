import {Bezier} from "./lib/bezierjs/bezier.js";

/** The metro network. This object is populated by map.js via setMetroNetwork. */
let metroNetwork;

/** Constructs the MetroNetwork with the supplied JSON. */
function setMetroNetwork(json) {
    metroNetwork = new MetroNetwork(json);
}

/**
 * Class to hold the metro network. Takes in information about the network from the JSON file,
 * and extends it with additional functionality.
 */
class MetroNetwork {
    constructor(json) {
        // We add 1 to the line width given to us, or otherwise there are small gaps between parallel lines (as
        // paper.js doesn't know what to do in the middle of two parallel but non-overlapping lines). This means that
        // every parallel set of lines is now slightly overlapping, but with only 1 pixel this is unnoticeable for
        // a reasonably large line width.
        this.lineWidth = json.lineWidth + 1;

        // minX and minY default to 0
        this.minX = json.minX === undefined ? 0 : json.minX;
        this.minY = json.minY === undefined ? 0 : json.minY;
        this.maxX = json.maxX;
        this.maxY = json.maxY;

        this.width = this.maxX - this.minX;
        this.height = this.maxY - this.minY;

        this.metroLines = json.metroLines;
        this.edgeMapping = MetroNetwork.buildEdgeMapping(this.metroLines);
        MetroNetwork.calculateEdgeLengths(this.metroLines);
    }

    /** Builds a 2D mapping of edges. I.e. edgeMapping[station1][station2] is the edge between the two stations. */
    static buildEdgeMapping(metroLines) {
        const edgeMapping = new Map();

        for (const lineName in metroLines) {
            for (const edge of metroLines[lineName].edges) {
                for (const [station, otherStation] of [[edge.station1Id, edge.station2Id],
                                                       [edge.station2Id, edge.station1Id]]) {

                    if (edgeMapping.get(station) === undefined) {
                        edgeMapping.set(station, new Map());
                    }
                    edgeMapping.get(station).set(otherStation, edge);

                }
            }
        }

        return edgeMapping;
    }

    /** Calculates the Euclidean distance between two points. */
    static dist(p0, p1) {
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /** Calculates the length of an edge, and sets the edge's `length` property to the value. */
    static calculateEdgeLength(edge) {
        let edgeLength = 0;
        edge.lineSegments.forEach(lineSegment => {
            if (lineSegment.straightLine) {
                edgeLength += MetroNetwork.dist(lineSegment.p0, lineSegment.p1);
            } else {
                edgeLength += new Bezier(lineSegment.p0, lineSegment.p1, lineSegment.p2, lineSegment.p3).length();
            }
        });
        edge.length = edgeLength;
    }

    /** Calculates and sets edge lengths for all metro lines. */
    static calculateEdgeLengths(metroLines) {
        for (const lineName in metroLines) {
            for (const edge of metroLines[lineName].edges) {
                MetroNetwork.calculateEdgeLength(edge);
            }
        }
    }

}

export { metroNetwork, setMetroNetwork, MetroNetwork };