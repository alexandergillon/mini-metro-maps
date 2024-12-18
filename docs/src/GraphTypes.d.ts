/**
 * @file Types which provide a graph view of the metro network.
 *
 * Some code may be concerned about the metro network at a logical level, without worrying about
 * its on-screen representation. These interfaces provide a way for such code to interact with
 * the metro network in a clean way.
 */

/** A station in the network. */
export interface GraphStation {
    readonly id: string;
    readonly name: string;
    neighbors(): Map<GraphStation, GraphEdge>; // map from neighbor -> edge that connects the station and its neighbor
}

/** An edge in the network: i.e. two stations that are connected. */
export interface GraphEdge {
    readonly station1: GraphStation;
    readonly station2: GraphStation;
}

/** A metro line in the network. */
export interface GraphMetroLine {
    readonly name: string;
    readonly stations: ReadonlyArray<GraphStation>;
    getStation(stationId: string) : GraphStation | null;
    hasEdge(station1: GraphStation, station2: GraphStation): boolean;
    getEdges(station: GraphStation): GraphEdge[];
}

/** The entire metro network. */
export interface GraphMetroNetwork {
    readonly metroLines: ReadonlyArray<GraphMetroLine>;
    getMetroLine(lineName: string) : GraphMetroLine | null;
}