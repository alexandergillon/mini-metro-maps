/** @file Metro line implementation. */
import { BezierLineSegment } from "./BezierLineSegment.js";
import { EdgeImpl } from "./EdgeImpl.js";
import { StationImpl } from "./StationImpl.js";
import { StraightLineSegment } from "./StraightLineSegment.js";
import CircArrayQueue from "../../lib/queue/CircArrayQueue.js";
import { PathImpl } from "./PathImpl.js";
/** Implements a metro line. */
export class MetroLineImpl {
    /**
     * Constructor: builds a metro line from a JsonMetroLine. This class has no fromJson due to the need to pass
     * 'this' to StationImpl.fromJson().
     * @param json Input metro line data.
     * @param lineWidth Line width.
     */
    constructor(json, lineWidth) {
        const lineLayer = new paper.Layer();
        const stationLayer = new paper.Layer();
        const color = new paper.Color(json.color);
        this.name = json.name;
        const stations = json.stations.map(station => StationImpl.fromJson(station, this, stationLayer, lineWidth));
        this._stations = new Map(stations.map(station => [station.id, station]));
        const edges = json.edges.map(edge => {
            const station1 = this._stations.get(edge.station1Id);
            if (!station1)
                throw new Error(`Unknown station ${edge.station1Id} in edge (${edge.station1Id}, ${edge.station2Id}) on line ${json.name}`);
            const station2 = this._stations.get(edge.station2Id);
            if (!station2)
                throw new Error(`Unknown station ${edge.station2Id} in edge (${edge.station1Id}, ${edge.station2Id}) on line ${json.name}`);
            return EdgeImpl.fromJson(edge, station1, station2, lineLayer, lineWidth, color);
        });
        this.edges = edges;
        this._edges = MetroLineImpl.buildEdgeMapping(edges);
        this.endpointLineSegments = json.endpointLineSegments.map(lineSegment => lineSegment.straightLine ? StraightLineSegment.fromJson(lineSegment, lineLayer, lineWidth, color)
            : BezierLineSegment.fromJson(lineSegment, lineLayer, lineWidth, color));
    }
    // Graph methods
    /** Stations on the line. */
    get stations() {
        return Array.from(this._stations.values());
    }
    /** Gets a station on the line by ID. Returns null if it does not exist. */
    getStation(stationId) {
        const station = this._stations.get(stationId);
        return station ? station : null;
    }
    /** Whether this line has an edge between two stations. Throws an exception if either station does not exist on the line, or does not have any edges. */
    hasEdge(station1, station2) {
        if (!this._stations.has(station1.id))
            throw new Error(`Station ${station1.id} (${station1.name}) does not exist on line ${this.name}`);
        if (!this._stations.has(station2.id))
            throw new Error(`Station ${station2.id} (${station2.name}) does not exist on line ${this.name}`);
        if (!this._edges.has(station1.id))
            throw new Error(`Station ${station1.id} (${station1.name}) does not have any edges on line ${this.name}`);
        if (!this._edges.has(station2.id))
            throw new Error(`Station ${station2.id} (${station2.name}) does not have any edges on line ${this.name}`);
        const station1Edges = this._edges.get(station1.id);
        if (!station1Edges) {
            console.warn("TODO");
            return false;
        }
        return station1Edges.has(station2.id);
    }
    /** Gets edges of a station. Throws an exception if the station does not exist on this line, or has no edges. */
    getEdges(station) {
        if (!this._stations.has(station.id))
            throw new Error(`Station ${station.id} (${station.name}) does not exist on line ${this.name}`);
        if (!this._edges.has(station.id))
            throw new Error(`Station ${station.id} (${station.name}) does not have any edges on line ${this.name}`);
        return Array.from(this._edges.get(station.id).values());
    }
    // View methods
    /** Draws this metro line on-screen. */
    draw() {
        for (const station of this.stations)
            station.draw();
        this.edges.forEach(edge => edge.draw());
        this.endpointLineSegments.forEach(lineSegment => lineSegment.draw());
    }
    /** Hides this metro line from the screen. */
    hide() {
        for (const station of this.stations)
            station.hide();
        this.edges.forEach(edge => edge.hide());
        this.endpointLineSegments.forEach(lineSegment => lineSegment.hide());
    }
    /** Builds the station ID -> station ID -> Edge mapping. */
    static buildEdgeMapping(edges) {
        const result = new Map();
        for (const edge of edges) {
            if (!result.has(edge.station1.id))
                result.set(edge.station1.id, new Map());
            if (!result.has(edge.station2.id))
                result.set(edge.station2.id, new Map());
            result.get(edge.station1.id).set(edge.station2.id, edge);
            result.get(edge.station2.id).set(edge.station1.id, edge);
        }
        return result;
    }
    /**
     * Finds a path between two stations on this metro line. This path is found through breadth-first search, which
     * is likely correct in almost all cases.
     * @param station1 First station.
     * @param station2 Second station.
     * @return A path between station1 and station2, if one exists, or null otherwise.
     */
    pathfind(station1, station2) {
        if (!this._stations.has(station1.id))
            throw new Error(`pathfind called with station ${station1} which is not on this line (${this})`);
        if (!this._stations.has(station2.id))
            throw new Error(`pathfind called with station ${station2} which is not on this line (${this})`);
        const queue = new CircArrayQueue(8);
        const parents = new Map();
        const visited = new Set([station1]);
        let found = false;
        queue.enqueue(station1);
        outerLoop: while (queue.front()) {
            const current = queue.front();
            queue.dequeue();
            const unvisitedNeighbors = Array.from(current.neighbors().keys()).filter(station => !visited.has(station));
            for (const neighbor of unvisitedNeighbors) {
                queue.enqueue(neighbor);
                parents.set(neighbor, current);
                visited.add(neighbor);
                if (neighbor === station2) {
                    found = true;
                    break outerLoop;
                }
            }
        }
        if (!found)
            return null;
        const edges = [];
        for (let station = station2; station !== station1; station = parents.get(station)) {
            const parent = parents.get(station);
            const edge = parent.neighbors().get(station);
            edges.push(edge.station1 === station ? edge : edge.reverse);
        }
        return new PathImpl(edges);
    }
}
