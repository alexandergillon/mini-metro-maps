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
}

/** Type of a Bezier line segment, for TypeScript. p0-p3 are cubic Bezier control points. */
interface BezierLineSegment {
    p0: Point;
    p1: Point;
    p2: Point;
    p3: Point;
    straightLine: false;
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

        for (const lineName in metroLines) {
            for (const edge of metroLines.get(lineName)!.edges) {
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
            if (lineSegment.straightLine) {
                edgeLength += MetroNetwork.dist(lineSegment.p0, lineSegment.p1);
            } else {
                edgeLength += new Bezier(lineSegment.p0, lineSegment.p1, lineSegment.p2, lineSegment.p3).length();
            }
        });
        edge.length = edgeLength;
    }

    /** Calculates and sets edge lengths for all metro lines. */
    static calculateEdgeLengths(metroLines: Map<string, MetroLine>) {
        for (const lineName in metroLines) {
            for (const edge of metroLines.get(lineName)!.edges) {
                MetroNetwork.calculateEdgeLength(edge);
            }
        }
    }

}

export { metroNetwork, setMetroNetwork, StraightLineSegment, BezierLineSegment, LineSegment, Station, Edge, MetroLine, MetroNetwork };