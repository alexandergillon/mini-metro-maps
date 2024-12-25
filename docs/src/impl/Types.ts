/**
 * @file Types of object in the metro network.
 *
 * Further to GraphTypes.d.ts, this file represents the 'actual' types of objects in the metro network.
 * Properties / methods are redefined to have more expansive types (e.g. MetroLines have Edges, not GraphEdges).
 * Additionally, the graph interfaces are extended with view-related properties.
 */
import {GraphEdge, GraphMetroLine, GraphMetroNetwork, GraphStation} from "../GraphTypes.js";

/** POJO class for an immutable point. */
export class Point {
    public readonly x: number;
    public readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

/** A station in the network. */
export interface Station extends GraphStation {
    // Re-declarations
    neighbors(): Map<Station, Edge>;

    // Extensions
    readonly location: Point;
    draw(): void;
    hide(): void;
}

/** Line segments, which make up the visual part of an edge. */
export interface LineSegment {
    readonly length: number;
    readonly reverse: LineSegment;
    draw(): void;
    hide(): void;
    samplePoint(distance: number): Point;
}

/** An edge in the network: two stations that are connected, and the physical representation on-screen. */
export interface Edge extends GraphEdge {
    // Re-declarations
    readonly station1: Station;
    readonly station2: Station;

    // Extensions
    readonly length: number;
    readonly reverse: Edge;
    draw(): void;
    hide(): void;
    samplePoint(distance: number): Point;
}

/** A path between two stations on a metro line, and a position on it. */
export interface Path {
    samplePoint(): Point;
    move(distance: number): [boolean, Point];
}

/** A metro line in the network. */
export interface MetroLine extends GraphMetroLine {
    // Re-declarations
    readonly stations: ReadonlyArray<Station>;
    getStation(stationId: string) : Station | null;
    getEdges(station: GraphStation): Edge[];

    // Extensions
    draw(): void;
    hide(): void;
}

/** The entire metro network. */
export interface MetroNetwork extends GraphMetroNetwork {
    // Re-declarations
    readonly metroLines: ReadonlyArray<MetroLine>;
    getMetroLine(lineName: string): MetroLine | null;

    // Extensions
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
    readonly width: number;
    readonly height: number;
    readonly lineWidth: number;
    draw(): void;
    hide(): void;
}