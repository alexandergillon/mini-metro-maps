/** @file Metro line implementation. */
import {BezierLineSegment} from "./BezierLineSegment.js";
import {EdgeImpl} from "./EdgeImpl.js";
import {GraphStation} from "../GraphTypes.js";
import {JsonMetroLine} from "./JsonTypes.js";
import {StationImpl} from "./StationImpl.js";
import {StraightLineSegment} from "./StraightLineSegment.js";
import {Edge, LineSegment, MetroLine, Station} from "./Types.js";

/** Implements a metro line. */
export class MetroLineImpl implements MetroLine {
    // Graph properties
    /** Line name (also a unique identifier. */
    public readonly name: string;
    /** Station ID -> Station mapping. */
    private readonly _stations: ReadonlyMap<string, Station>;
    /** Station ID -> station ID -> Edge mapping. */
    private readonly _edges: ReadonlyMap<string, ReadonlyMap<string, Edge>>;
    /** All edges: used for drawing/hiding. */
    private readonly edges: Edge[];

    // View properties
    /** Endpoint line segments (the little bars that can terminate lines). */
    private readonly endpointLineSegments: LineSegment[];

    /**
     * Constructor: builds a metro line from a JsonMetroLine.
     * @param json Input metro line data.
     * @param lineWidth Line width.
     */
    public constructor(json: JsonMetroLine, lineWidth: number) {
        const lineLayer = new paper.Layer();
        const stationLayer = new paper.Layer();
        const color = new paper.Color(json.color);

        this.name = json.name;

        const stations = json.stations.map(station => new StationImpl(station, this, stationLayer, lineWidth));
        this._stations = new Map(stations.map(station => [station.id, station]));

        const edges = json.edges.map(edge => {
            const station1 = this._stations.get(edge.station1Id);
            if (!station1) throw new Error(`Unknown station ${edge.station1Id} in edge (${edge.station1Id}, ${edge.station2Id}) on line ${json.name}`);
            const station2 = this._stations.get(edge.station2Id);
            if (!station2) throw new Error(`Unknown station ${edge.station2Id} in edge (${edge.station1Id}, ${edge.station2Id}) on line ${json.name}`);
            return new EdgeImpl(edge, station1, station2, lineLayer, lineWidth, color);
        });
        this.edges = edges;
        this._edges = MetroLineImpl.buildEdgeMapping(edges);

        this.endpointLineSegments = json.endpointLineSegments.map(lineSegment =>
            lineSegment.straightLine ? new StraightLineSegment(lineSegment, lineLayer, lineWidth, color)
                : new BezierLineSegment(lineSegment, lineLayer, lineWidth, color));
    }

    // Graph methods
    /** Stations on the line. */
    public get stations() {
        return Array.from(this._stations.values());
    }

    /** Gets a station on the line by ID. Returns null if it does not exist. */
    public getStation(stationId: string): Station | null {
        const station = this._stations.get(stationId);
        return station ? station : null;
    }

    /** Whether this line has an edge between two stations. Throws an exception if either station does not exist on the line, or does not have any edges. */
    public hasEdge(station1: GraphStation, station2: GraphStation): boolean {
        if (!this._stations.has(station1.id)) throw new Error(`Station ${station1.id} (${station1.name}) does not exist on line ${this.name}`);
        if (!this._stations.has(station2.id)) throw new Error(`Station ${station2.id} (${station2.name}) does not exist on line ${this.name}`);
        if (!this._edges.has(station1.id)) throw new Error(`Station ${station1.id} (${station1.name}) does not have any edges on line ${this.name}`);
        if (!this._edges.has(station2.id)) throw new Error(`Station ${station2.id} (${station2.name}) does not have any edges on line ${this.name}`);

        const station1Edges = this._edges.get(station1.id);
        if (!station1Edges) {
            console.warn("TODO");
            return false;
        }
        return station1Edges.has(station2.id);
    }

    /** Gets edges of a station. Throws an exception if the station does not exist on this line, or has no edges. */
    public getEdges(station: GraphStation): Edge[] {
        if (!this._stations.has(station.id)) throw new Error(`Station ${station.id} (${station.name}) does not exist on line ${this.name}`);
        if (!this._edges.has(station.id)) throw new Error(`Station ${station.id} (${station.name}) does not have any edges on line ${this.name}`);
        return Array.from(this._edges.get(station.id)!.values());
    }

    // View methods
    /** Draws this metro line on-screen. */
    public draw() {
        for (const station of this.stations) station.draw();
        this.edges.forEach(edge => edge.draw());
        this.endpointLineSegments.forEach(lineSegment => lineSegment.draw());
    }

    /** Hides this metro line from the screen. */
    public hide() {
        for (const station of this.stations) station.hide();
        this.edges.forEach(edge => edge.hide());
        this.endpointLineSegments.forEach(lineSegment => lineSegment.hide());
    }

    /** Builds the station ID -> station ID -> Edge mapping. */
    private static buildEdgeMapping(edges: Edge[]): Map<string, Map<string, Edge>> {
        const result: Map<string, Map<string, Edge>> = new Map();
        for (const edge of edges) {
            if (!result.has(edge.station1.id)) result.set(edge.station1.id, new Map());
            if (!result.has(edge.station2.id)) result.set(edge.station2.id, new Map());

            result.get(edge.station1.id)!.set(edge.station2.id, edge);
            result.get(edge.station2.id)!.set(edge.station1.id, edge);
        }
        return result;
    }
}