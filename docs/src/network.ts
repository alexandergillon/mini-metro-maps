import { Bezier } from "./lib/bezierjs/bezier.js";

/** Type of a station, for TypeScript. */
interface Station {
    id: string;
    name: string;
    x: number;
    y: number;
}

/** Type of a point, for TypeScript. */
interface Point {
    x: number;
    y: number;
}

/** Type of a straight line segment, for TypeScript. p0 and p1 are endpoints of the straight line. */
interface StraightLineSegment {
    p0: Point;
    p1: Point;
    straightLine: true;
    length: number; // Not present on input JSON - added after.
}

/** Type of a Bezier line segment, for TypeScript. p0-p3 are cubic Bezier control points. */
interface BezierLineSegment {
    p0: Point;
    p1: Point;
    p2: Point;
    p3: Point;
    straightLine: false;
    length: number; // Not present on input JSON - added after.
}

/** Type of a line segment, for TypeScript. */
type LineSegment = StraightLineSegment | BezierLineSegment;

/** Type of an edge, for TypeScript. */
interface Edge {
    station1Id: string;
    station2Id: string;
    lineSegments: LineSegment[];
    length: number; // Not present on input JSON - added after.
}

/** Type of a metro line in the input JSON that defines the network, for TypeScript. */
interface JsonMetroLine {
    name: string;
    color: string;
    zIndex: number;

    stations: Station[];
    edges: Edge[];
    endpointLineSegments: LineSegment[];
}

/** Type of a metro network in the input JSON that defines the network, for TypeScript. */
interface JsonMetroNetwork {
    lineWidth: number;
    minX?: number;
    minY?: number;
    maxX: number;
    maxY: number;
    metroLines: JsonMetroLine[];
}

/** The metro network. This object is populated by map.js via setMetroNetwork. */
let metroNetwork: MetroNetwork;

/** Constructs the MetroNetwork with the supplied JSON. */
function setMetroNetwork(json: JsonMetroNetwork) {
    metroNetwork = new MetroNetwork(json);
}

/**
 * Class for a path between two stations. A path consists of multiple adjacent edges, and a position somewhere among
 * these edges. The position is determined by an edge index, a segment index, and a parameter value. For example,
 * if the following are the edges in a path (where 'O' is a station):
 *
 *     edge 0          edge 1
 *   segment 0    |--segment 0--|  |---------\
 * O ---------- O -----------------------\    \   edge 1
 *                                        \    \    segment 1
 *                                         \    \
 *                                          \    ==
 *                                           \    \
 *                                            \    \   edge 1
 *                                             \    \   segment 2
 *                                              \    \
 *                                               \    \
 *                                                \   --
 *                                                 O
 *                                                  \    edge 2
 *                                                   \    segment 0
 *                                                    \
 *                                                     \
 *                                                      O
 *
 * Then with edge index = 1, segment index = 2, parameter value = 0.5, the position on the path would be roughly at the X:
 *
 *    edge 0          edge 1
 *   segment 0    |--segment 0--|  |---------\
 * O ---------- O -----------------------\    \   edge 1
 *                                        \    \    segment 1
 *                                         \    \
 *                                          \    ==
 *                                           \    \
 *                                            \    \   edge 1
 *                                             X    \   segment 2
 *                                              \    \
 *                                               \    \
 *                                                \   --
 *                                                 O
 *                                                  \    edge 2
 *                                                   \    segment 0
 *                                                    \
 *                                                     \
 *                                                      O
 *
 * See comments below for more info on parameter value.
 *
 * We need paths as some trains may skip stations, hence traversing multiple edges when going from one station to another.
 */
class Path {
    /** Edges in this path. */
    edges: Edge[];

    /** Index of the current edge that a train is at in the path. */
    edgeIndex: number;

    /** Index of the current segment in the current edge. */
    segmentIndex: number;

    /**
     * Parameter value of the current segment. For straight line segments, this is how far the train is along the
     * segment, as a proportion. For Bezier line segments, this is the t value for the Bezier curve.
     */
    parameterValue: number;

    /** Length of the entire path. */
    length: number;

    /** Creates a Path, with position initialized to the beginning of the edges. */
    constructor(edges: Edge[]) {
        this.edges = edges;
        this.edgeIndex = 0;
        this.segmentIndex = 0;
        this.parameterValue = 0;
        this.length = edges.map(edge => edge.length).reduce((l1, l2) => l1 + l2);
    }

    /** Samples a point at the current position in the Path. Behavior is unspecified if edge/segment indices are out of bounds. */
    samplePoint(): Point {
        const segment = this.edges[this.edgeIndex].lineSegments[this.segmentIndex];
        if (segment.straightLine) {
            // Linear interpolation of a straight line.
            return {
                x: segment.p0.x + this.parameterValue * (segment.p1.x - segment.p0.x),
                y: segment.p0.y + this.parameterValue * (segment.p1.y - segment.p0.y)
            };
        } else {
            // Sampling Bezier curve at parameter t = this.parameterValue.
            const t = this.parameterValue;
            return {
                x: Math.pow(1-t, 3) * segment.p0.x
                    + 3 * Math.pow(1-t, 2) * t * segment.p1.x
                    + 3 * (1-t) * Math.pow(t, 2) * segment.p2.x
                    + Math.pow(t, 3) * segment.p3.x,

                y: Math.pow(1-t, 3) * segment.p0.y
                    + 3 * Math.pow(1-t, 2) * t * segment.p1.y
                    + 3 * (1-t) * Math.pow(t, 2) * segment.p2.y
                    + Math.pow(t, 3) * segment.p3.y
            };
        }
    }

    /**
     * Advances the position on this Path to the beginning of the next edge.
     * @return Whether the end of this path was reached by advancing edges. I.e. if this function is called while
     * the position on the path is in the last edge, and hence there are no more edges.
     */
    advanceEdge(): boolean {
        this.edgeIndex++;
        this.segmentIndex = 0;
        return this.edgeIndex >= this.edges.length;

    }

    /**
     * Advances the position on this Path to the beginning of the next segment.
     * @return Whether the end of this path was reached by advancing segments. I.e. if this function is called while
     * the position on the path is in the last edge, on the last segment, and hence there are no more segments.
     */
    advanceSegment(): boolean {
        this.segmentIndex++;
        this.parameterValue = 0;
        if (this.segmentIndex >= this.edges[this.edgeIndex].lineSegments.length) {
            return this.advanceEdge();
        } else {
            return false;
        }
    }

    /**
     * Moves the position on this Path by a distance.
     * Todo: if this function becomes a bottleneck, consider caching segment and parameter value increment?
     * @param distance Distance to move along the path.
     * @return The new position on this path, or null if the end of the path has been reached.
     */
    move(distance: number): Point | null {
        // Right now, this isn't exact for Bezier segments. TODO: change
        const segment = this.edges[this.edgeIndex].lineSegments[this.segmentIndex];
        const dParameterValue = distance / segment.length;
        this.parameterValue += dParameterValue;

        if (this.parameterValue > 1) {
            // We have advanced past the end of the current segment.
            const finished = this.advanceSegment();
            if (finished) {
                // Path is finished - return null.
                return null;
            } else {
                // Path is not finished - move along the next segment by however much we moved past the end of the current segment.
                const excess = (this.parameterValue - 1) * segment.length;
                return this.move(excess);
            }
        } else {
            // Still in current segment - return new position.
            return this.samplePoint();
        }
    }
}

/** Class for a metro line. */
class MetroLine {
    name: string;
    color: string;
    zIndex: number;

    stations: Map<string, Station>; // Mapping from station ID --> Station
    edges: Edge[];
    endpointLineSegments: LineSegment[];

    constructor(json: JsonMetroLine) {
        this.name = json.name;
        this.color = json.color;
        this.zIndex = json.zIndex;

        this.stations = new Map();
        json.stations.forEach(station => this.stations.set(station.id, station));

        this.edges = json.edges;
        this.endpointLineSegments = json.endpointLineSegments;
    }
}

/**
 * Class to hold the metro network. Takes in information about the network from the JSON file,
 * and extends it with additional functionality.
 */
class MetroNetwork {
    lineWidth: number;

    minX: number;
    minY: number;
    maxX: number;
    maxY: number;

    width: number;
    height: number;

    metroLines: Map<string, MetroLine>; // Mapping from line name --> MetroLine
    edgeMapping: Map<string, Map<string, Edge>>; // Mapping from station ID --> station ID --> Edge

    constructor(json: JsonMetroNetwork) {
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

        this.metroLines = new Map();
        json.metroLines.forEach(metroLine => this.metroLines.set(metroLine.name, new MetroLine(metroLine)));

        this.edgeMapping = MetroNetwork.buildEdgeMapping(this.metroLines);
        MetroNetwork.calculateEdgeLengths(this.metroLines);
    }

    /** Builds a 2D mapping of edges. I.e. edgeMapping[station1][station2] is the edge between the two stations. */
    static buildEdgeMapping(metroLines: Map<string, MetroLine>): Map<string, Map<string, Edge>> {
        const edgeMapping: Map<string, Map<string, Edge>> = new Map();

        for (const [_, metroLine] of metroLines.entries()) {
            for (const edge of metroLine.edges) {
                for (const [station, otherStation] of [[edge.station1Id, edge.station2Id],
                                                       [edge.station2Id, edge.station1Id]]) {

                    if (edgeMapping.get(station) === undefined) {
                        edgeMapping.set(station, new Map());
                    }
                    edgeMapping.get(station)!.set(otherStation, edge);

                }
            }
        }

        return edgeMapping;
    }

    /** Calculates the Euclidean distance between two points. */
    static dist(p0: Point, p1: Point) {
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /** Calculates the length of an edge, and sets the edge's `length` property to the value. */
    static calculateEdgeLength(edge: Edge) {
        let edgeLength = 0;
        edge.lineSegments.forEach(lineSegment => {
            const segmentLength = lineSegment.straightLine ? MetroNetwork.dist(lineSegment.p0, lineSegment.p1)
                : new Bezier(lineSegment.p0, lineSegment.p1, lineSegment.p2, lineSegment.p3).length();
            lineSegment.length = segmentLength;
            edgeLength += segmentLength;
        });
        edge.length = edgeLength;
    }

    /** Calculates and sets edge lengths for all metro lines. */
    static calculateEdgeLengths(metroLines: Map<string, MetroLine>) {
        for (const [_, metroLine] of metroLines) {
            for (const edge of metroLine.edges) {
                MetroNetwork.calculateEdgeLength(edge);
            }
        }
    }

    /**
     * Gets an edge between two stations. Note: the edge may be in the opposite order
     * (i.e. from station 2 to station 1). Returns null if the edge does not exist.
     * @param station1Id ID of the first station in the edge.
     * @param station2Id ID of the second station in the edge.
     * @returns The edge between those two stations, or null if no such edge exists.
     */
    getEdge(station1Id: string, station2Id: string): Edge | null {
        const station1Edges = this.edgeMapping.get(station1Id);
        if (station1Edges === undefined) {
            console.log(`${station1Id} not present in edges mapping.`)
            return null;
        }

        const edge = station1Edges.get(station2Id);
        if (edge === undefined) {
            console.log(`${station2Id} not present in edges of ${station1Id}.`)
            return null;
        }

        return edge;
    }
}

export { metroNetwork, setMetroNetwork, StraightLineSegment, BezierLineSegment, LineSegment, Station, Edge, MetroLine, MetroNetwork };