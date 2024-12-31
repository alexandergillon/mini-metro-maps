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

    public toString() {
        return `(${this.x}, ${this.y})`;
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

/** A metro line in the network. */
export interface MetroLine extends GraphMetroLine {
    // Re-declarations
    readonly stations: ReadonlyArray<Station>;
    getStation(stationId: string) : Station | null;
    getEdges(station: GraphStation): Edge[];

    // Extensions
    readonly color: paper.Color;
    hasTrain(trainId: string): boolean;
    getTrain(trainId: string): Train | null;
    updateTrains(): void;
    addTrain(train: Train): void;
    removeTrain(trainId: string): void;
    pathfind(station1: Station, station2: Station): Path | null;
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

/** POJO to represent a train being at a station. */
export class StationLocation {
    public readonly isStation: true;
    public readonly station: Station;

    constructor(location: Station) {
        this.isStation = true;
        this.station = location;
    }
}

/** POJO to represent a train being along an edge. */
export class EdgeLocation {
    public readonly isStation: false;
    public readonly edge: Edge;
    public readonly distanceAlongEdge: number;

    constructor(edge: Edge, distanceAlongEdge: number) {
        this.isStation = false;
        this.edge = edge;
        this.distanceAlongEdge = distanceAlongEdge;
    }
}

/** POJO to represent a train edge location, with a next arrival. */
export class EdgeLocationWithArrival {
    public readonly isStation: false;
    public readonly edgeLocation: EdgeLocation;
    public readonly arrivalStation: Station;
    public readonly arrivalTime: number;

    constructor(edgeLocation: EdgeLocation, station: Station, arrivalTime: number) {
        this.isStation = false;
        this.edgeLocation = edgeLocation;
        this.arrivalStation = station;
        this.arrivalTime = arrivalTime;
    }
}

/** The visuals of a train. */
export interface ViewTrain {
    x: number;
    y: number;
    bearing: number;
    draw(): void;
    hide(): void;
}

/** A path between two stations on a metro line, and a position on it. */
export interface Path {
    readonly length: number;
    readonly location: EdgeLocation;
    samplePoint(): Point;
    move(distance: number): [boolean, Point];
}

/** A train movement animation. */
export interface TrainMovement {
    readonly location: EdgeLocation;
    update(): void;
}

/** A train. */
export interface Train {
    readonly id: string;
    readonly metroLine: MetroLine;
    readonly location: StationLocation | EdgeLocationWithArrival;
    setNextDeparture(station: Station, arrivalTime: number): void;
    update(): void;
    draw(): void;
    hide(): void;
}