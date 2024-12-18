/**
 * @file Types for City API modules.
 *
 * The way in which these APIs will be used are as follows:
 *
 *   1. A CityModule is imported, and used to get a CityApi.
 *   2. The CityApi is polled regularly to determine the position of trains in the network.
 *   3. The polling function (CityApi.getArrivals()) may return trains that the caller is not yet aware of (for example,
 *      when the map initially loads, or when a train goes into service). In that case, the CityApi will be queried
 *      as to the location of these trains with CityApi.whereAre() to determine starting position.
 */
import {GraphEdge, GraphMetroNetwork, GraphStation} from "../GraphTypes";

/** POJO to store information about the next arrival for a train. */
export class ArrivalInfo {
    /** ID of the train. */
    readonly trainId: string;
    /** Line name of the train. */
    readonly line: string;
    /** Next station ID of the train. */
    readonly stationId: string;
    /** Arrival time of the train, in milliseconds from the epoch. */
    readonly arrivalTime: number;

    /**
     * Constructor.
     * @param trainId ID of the train.
     * @param line Line name of the train.
     * @param stationId Next station ID of the train.
     * @param arrivalTime Arrival time of the train, in milliseconds from the epoch.
     */
    public constructor(trainId: string, line: string, stationId: string, arrivalTime: number) {
        this.trainId = trainId;
        this.line = line;
        this.stationId = stationId;
        this.arrivalTime = arrivalTime;
    }
}

/** POJO to store a train's location and next arrival. */
export class LocationInfo {
    /** Location of train. Either a station, or an edge and a proportion along the edge (between 0 and 1). */
    readonly location: GraphStation | [GraphEdge, number];
    /** Next arrival of train. */
    readonly nextArrival: ArrivalInfo;

    /**
     * Constructor.
     * @param location Location of train.
     * @param nextArrival Next arrival of train.
     */
    public constructor(location: GraphStation | [GraphEdge, number], nextArrival: ArrivalInfo) {
        this.location = location;
        this.nextArrival = nextArrival;
    }
}

/** Interface which allows access to underlying transit APIs in a uniform way. */
export interface CityApi {
    /**
     * Sets the metro lines which arrivals should be fetched for.
     * @param metroLines Names of the metro lines, as an array of strings.
     */
    setLines(metroLines: string[]): void;

    /**
     * Gets the next arrival for all trains on previously specified lines.
     * Each train has only 1 ArrivalInfo in the return value.
     * @returns The next arrival of each train on the previously configured lines.
     */
    getArrivals(): Promise<Array<ArrivalInfo>>;

    /**
     * Gets the current location of a number of trains, and their next arrival. Next arrival is returned to avoid
     * race conditions between calls to getArrivals() and whereAre().
     * @param trainIds Train IDs to get current locations of.
     * @param metroNetwork The metro network, for use in determining train positions.
     * @returns Current locations of the trains, and their next arrivals. Map contains one entry for each input train
     * ID. If the entry is null, then the API is not aware of where the train is.
     */
    whereAre(trainIds: string[], metroNetwork: GraphMetroNetwork): Promise<Map<string, LocationInfo | null>>;
}

/** Interface for a module which provides a CityApi implementation. */
export interface CityModule {
    /**
     * Initializes the city API for use.
     * @param initialMetroLines Metro lines to fetch arrivals for. This can be changed later with CityApi.setLines().
     */
    initialize(initialMetroLines: string[]): CityApi;
}