/**
 * @file Types for processing input metro network data.
 */
// TODO: validate against schema?

/** Point, in input JSON metro network data. */
export interface JsonPoint {
    x: number;
    y: number;
}

/** Straight line segment, in input JSON metro network data. */
export interface JsonStraightLineSegment {
    straightLine: true;
    p0: JsonPoint;
    p1: JsonPoint;
}

/** Bezier line segment, in input JSON metro network data. */
export interface JsonBezierLineSegment {
    straightLine: false;
    p0: JsonPoint;
    p1: JsonPoint;
    p2: JsonPoint;
    p3: JsonPoint;
}

/** Line segment, in input JSON metro network data. */
export type JsonLineSegment = JsonStraightLineSegment | JsonBezierLineSegment;

/** Station, in input JSON metro network data. */
export interface JsonStation {
    id: string;
    name: string;
    x: number;
    y: number;
}

/** Edge, in input JSON metro network data. */
export interface JsonEdge {
    station1Id: string;
    station2Id: string;
    lineSegments: JsonLineSegment[];
}

/** Metro line, in input JSON metro network data. */
export interface JsonMetroLine {
    name: string;
    color: string;
    zIndex: number;

    stations: JsonStation[];
    edges: JsonEdge[];
    endpointLineSegments: JsonLineSegment[];
}

/** Metro network data (aka entire JSON input describing the network). */
export interface JsonMetroNetwork {
    lineWidth: number;
    minX?: number;
    minY?: number;
    maxX: number;
    maxY: number;
    metroLines: JsonMetroLine[];
}