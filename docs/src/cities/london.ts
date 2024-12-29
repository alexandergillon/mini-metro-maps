import {ArrivalInfo, CityApi, LocationInfo} from "./CityTypes.js";
import {GraphMetroNetwork} from "../GraphTypes";

/** Type for an item in the TFL API response, for TypeScript. */
type TflApiResponseItem = {
    vehicleId: string;
    lineId: string;
    naptanId: string;
    platformName: string;
    expectedArrival: string;
}

/** Type for an item in the TFL API response extended with a parsed arrival time. This is to avoid a bunch of duplicate time parsing. */
type ParsedTflApiResponseItem = TflApiResponseItem & {
    arrivalTime: number,
}

/** Type for the TFL API response, for TypeScript. */
type TflApiResponse = TflApiResponseItem[];

class LondonApi implements CityApi {
    /**
     * TFL API URL for train arrivals. See https://api.tfl.gov.uk/ for full response format.
     * The parts of the response that we want are defined via TflApiResponseItem and TflApiResponse
     */
    private apiUrl: string = '';

    /**
     * If a Circle line train is arriving at Edgware road, is travelling EASTBOUND, and has one of these stations as its
     * next arrival after Edgware road, then it almost certainly is arriving at the copy of the station which also
     * serves the H&C line.
     *
     * As a result, if it is travelling EASTBOUND and does NOT have one of these stations as its next arrival, then
     * it is almost certainly arriving at the copy of the station which also serves the District line.
     */
    private static readonly EDGWARE_ROAD_EASTBOUND_HC = new Set(["940GZZLUHSC", "940GZZLUGHK",
        "940GZZLUSBM", "940GZZLUWLA", "940GZZLULRD", "940GZZLULAD", "940GZZLUWSP", "940GZZLURYO", "940GZZLUPAH"]);

    /**
     * If a Circle line train is arriving at Edgware road, is travelling WESTBOUND, and has one of these stations as its
     * next arrival after Edgware road, then it almost certainly is arriving at the copy of the station which also
     * serves the H&C line.
     *
     * As a result, if it is travelling WESTBOUND and does NOT have one of these stations as its next arrival, then
     * it is almost certainly arriving at the copy of the station which also serves the District line.
     */
    private static readonly EDGWARE_ROAD_WESTBOUND_HC = new Set(["940GZZLUGPS", "940GZZLUESQ",
        "940GZZLUKSX", "940GZZLUFCN", "940GZZLUBBN", "940GZZLUMGT", "940GZZLULVT", "940GZZLUALD", "940GZZLUTWH",
        "940GZZLUMMT", "940GZZLUCST", "940GZZLUMSH", "940GZZLUBKF", "940GZZLUTMP", "940GZZLUEMB", "940GZZLUWSM",
        "940GZZLUSJP", "940GZZLUVIC", "940GZZLUSSQ", "940GZZLUSKS", "940GZZLUGTR", "940GZZLUHSK", "940GZZLUNHG",
        "940GZZLUBWT", "940GZZLUPAC", "940GZZLUERC"]);

    /**
     * Constructor.
     * @param metroLines Initial metro lines to query for arrival data.
     */
    public constructor(metroLines: string[]) {
        this.setLines(metroLines);
    }

    public setLines(metroLines: string[]) { // TODO: validate
        // See https://api.tfl.gov.uk/ for URL format.
        if (metroLines) {
            this.apiUrl = `https://api.tfl.gov.uk/line/${metroLines.join(",")}/arrivals`;
        } else {
            this.apiUrl = '';
        }
    }

    public async getArrivals(): Promise<Array<ArrivalInfo>> {
        if (!this.apiUrl) return [];

        // todo: error handling, make more async
        console.log("getData"); // todo: remove
        const response = await fetch(this.apiUrl);
        const json = await response.json();
        return this.stripData(json);
    }

    public whereAre(trainIds: string[], metroNetwork: GraphMetroNetwork): Promise<Map<string, LocationInfo | null>> {
        // Max approx. 25 ids per call: https://api.tfl.gov.uk/swagger/ui/index.html?url=/swagger/docs/v1#!/Vehicle/Vehicle_Get
        const numRequests = Math.ceil(trainIds.length / 20);
        const promises = [];
        const locations = new Map();

        for (let i = 0; i < numRequests; i++) {
            const thisRequestIds = trainIds.slice(i * 20, (i+1) * 20);
            const apiUrl = `https://api.tfl.gov.uk/vehicle/${thisRequestIds.join(",")}/arrivals`;
            promises.push(
                fetch(apiUrl)
                    .then(response => response.json())
                    .then(json => this.getLocations(thisRequestIds, json, metroNetwork))
                    .then(newLocations => newLocations.forEach((locationInfo, trainId) => locations.set(trainId, locationInfo)))
            );
        }

        return Promise.all(promises).then(_ => locations);
    }

    /**
     * Strips arrival data down to what we care about. Only keeps the closest arrival for each train, and only information
     * about the arrival that we care about (train ID, line, next station, time until station).
     * @param arrivals The arrival data returned from the TFL API call. See https://api.tfl.gov.uk/ for response format.
     * @returns The next arrival of each train in the response data.
     */
    private stripData(arrivals: TflApiResponse): ArrivalInfo[] {
        // This isn't beautiful, but it avoids a bunch of needless object creation
        const parsedArrivals: ParsedTflApiResponseItem[] = arrivals.map(arrival => {
            (arrival as ParsedTflApiResponseItem).arrivalTime = Date.parse(arrival.expectedArrival);
            return (arrival as ParsedTflApiResponseItem);
        });

        const nearestArrival: Map<string, ArrivalInfo> = new Map();
        for (const arrival of parsedArrivals) {
            const vehicleId = arrival.vehicleId;
            if (!nearestArrival.has(vehicleId) || arrival.arrivalTime < nearestArrival.get(vehicleId)!.arrivalTime) {
                nearestArrival.set(vehicleId, this.toArrivalInfo(arrival, parsedArrivals));
            }
        }

        return Array.from(nearestArrival.values());
    }

    /**
     * Gets the modified NAPTAN for an arrival. NAPTANs are modified from what is given to us by TFL to distinguish
     * between the two 'stations' for Euston on the Northern line, and the two 'stations' for Edgware Road on the
     * Circle line.
     *
     * Also does some cleaning based on incorrect data returned by API.
     * @param arrival The arrival to get the NAPTAN of.
     * @param arrivals All arrivals. Sometimes needed, for disambiguating Edgware Road arrivals.
     * @returns The NAPTAN for that arrival.
     */
    private getNaptan(arrival: ParsedTflApiResponseItem, arrivals: ParsedTflApiResponseItem[]): string {
        if (arrival.naptanId === "940GZZLUEUS" && arrival.lineId === "northern") {
            return this.resolveEustonNaptan(arrival);
        } else if (arrival.naptanId === "940GZZLUERC" && arrival.lineId === "circle") {
            return this.resolveEdgwareRoadNaptan(arrival, arrivals);
        } else if (arrival.naptanId === "940GZZLUPAC" && arrival.lineId === "hammersmith-city") {
            // Paddington is a bit of a mess. See this thread: https://techforum.tfl.gov.uk/t/confused-by-tube-arrivals-at-paddington/1498/19
            return "940GZZLUPAH";
        } else {
            return arrival.naptanId;
        }
    }

    /**
     * Resolves NAPTANs for an arrival at Euston on the Northern line.
     * We can determine which of the two Euston 'stations' on the map a train is arriving at by platform.
     * Platforms 1 and 2 serve the Charing Cross branch, and platforms 3 and 6 the Bank branch.
     * @param arrival An arrival at Euston on the Northern line.
     * @returns A NAPTAN for that arrival (either Euston on the Charing Cross branch, or Euston on the Bank branch).
     */
    private resolveEustonNaptan(arrival: ParsedTflApiResponseItem): "940GZZLUEUS_CC" | "940GZZLUEUS_B" {
        const platform = arrival.platformName;
        if (/platform 1/i.test(platform) || /platform 2/i.test(platform)) {
            return "940GZZLUEUS_CC";
        } else if (/platform 3/i.test(platform) || /platform 6/i.test(platform)) {
            return "940GZZLUEUS_B";
        } else {
            console.log(`Could not resolve NAPTAN for Euston (${platform}).`);
            return "940GZZLUEUS_CC"; // need to return something - right half the time
        }
    }

    /**
     * Resolves NAPTANs for an arrival at Edgware Road on the Circle line.
     * We can't simply use platforms to determine which copy of the station is correct, as a platform number doesn't
     * always correspond to the same route. Instead, we find the next destination that the train is going to, and figure
     * out which copy is appropriate from that.
     * @param arrival An arrival at Edgware Road on the Circle line.
     * @param arrivals All arrivals. Needed to find the next destination of the train.
     * @returns A NAPTAN for that arrival (either Edgware Road which also serves H&C, or Edgware Road which also serves District).
     */
    private resolveEdgwareRoadNaptan(arrival: ParsedTflApiResponseItem, arrivals: ParsedTflApiResponseItem[]): "940GZZLUERC_D" | "940GZZLUERC_HC" {
        const vehicleId = arrival.vehicleId;
        const arrivalTime = arrival.arrivalTime;

        // Gets all arrivals for the same vehicle which are after this arrival.
        const laterArrivals = arrivals.filter(a => a.vehicleId === vehicleId && a.arrivalTime > arrivalTime);

        if (laterArrivals.length === 0) {
            // Train is likely terminating at Edgware Road, and then going out of service. Almost certainly is the
            // Edgware Road which also serves the District line.
            return "940GZZLUERC_D";
        }

        // Gets the next (soonest) arrival after this arrival for the same vehicle.
        const nextArrival = laterArrivals.reduce((a1, a2) => a1.arrivalTime < a2.arrivalTime ? a1 : a2);

        if (/eastbound/i.test(nextArrival.platformName)) {
            return LondonApi.EDGWARE_ROAD_EASTBOUND_HC.has(nextArrival.naptanId) ? "940GZZLUERC_HC" : "940GZZLUERC_D";
        } else if (/westbound/i.test(nextArrival.platformName)) {
            return LondonApi.EDGWARE_ROAD_WESTBOUND_HC.has(nextArrival.naptanId) ? "940GZZLUERC_HC" : "940GZZLUERC_D";
        } else {
            console.log(`Could not resolve NAPTAN for Edgware Road (${nextArrival.platformName}).`);
            return "940GZZLUERC_D"; // need to return something - right half the time
        }
    }

    /**
     * Gets locations for specified trains in a TFL API response.
     * @param trainIds The trains to get locations of.
     * @param arrivals The API response that contains arrivals for those trains.
     * @param metroNetwork The metro network.
     * @private
     */
    private getLocations(trainIds: string[], arrivals: TflApiResponse, metroNetwork: GraphMetroNetwork): Map<string, LocationInfo | null> {
        // This isn't beautiful, but it avoids a bunch of needless object creation
        const parsedArrivals: ParsedTflApiResponseItem[] = arrivals.map(arrival => {
            (arrival as ParsedTflApiResponseItem).arrivalTime = Date.parse(arrival.expectedArrival);
            return (arrival as ParsedTflApiResponseItem);
        });

        const locations: Map<string, LocationInfo | null> = new Map();
        const nearestArrivals: Map<string, [ArrivalInfo?, ArrivalInfo?]> = new Map();

        // Get nearest 2 arrivals for each specified train
        for (const arrival of parsedArrivals) {
            const vehicleId = arrival.vehicleId;
            const arrivalTime = arrival.arrivalTime;

            if (!nearestArrivals.has(vehicleId)) {
                nearestArrivals.set(vehicleId, [undefined, undefined]);
            }

            const thisNearestArrivals = nearestArrivals.get(vehicleId)!;
            if (!thisNearestArrivals[0] || arrivalTime < thisNearestArrivals[0].arrivalTime) {
                nearestArrivals.set(vehicleId, [this.toArrivalInfo(arrival, parsedArrivals), thisNearestArrivals[0]]);
            } else if (!thisNearestArrivals[1] || arrivalTime < thisNearestArrivals[1].arrivalTime) {
                nearestArrivals.set(vehicleId, [thisNearestArrivals[0], this.toArrivalInfo(arrival, parsedArrivals)]);
            }
        }

        // Get locations based on nearest arrivals
        for (const trainId of trainIds) {
            const nearestArrivalsForTrain = nearestArrivals.get(trainId);
            if (!nearestArrivalsForTrain) {
                locations.set(trainId, null);
            } else {
                const [nextArrival, nextNextArrival] = nearestArrivalsForTrain;
                // If nearestArrivalsForTrain is not undefined, then at least the next arrival is set
                locations.set(trainId, this.getLocation(nextArrival!, nextNextArrival, metroNetwork));
            }
        }

        return locations;
    }

    /**
     * Attemps to determine the location of a train given its next 1-2 arrivals.
     * @param nextArrival The next arrival of the train.
     * @param nextNextArrival The next next arrival of the train (can be null).
     * @param metroNetwork The metro network.
     * @private
     */
    private getLocation(nextArrival: ArrivalInfo, nextNextArrival: ArrivalInfo | undefined, metroNetwork: GraphMetroNetwork): LocationInfo | null {
        const line = nextArrival.line;
        const metroLine = metroNetwork.getMetroLine(line);
        if (!metroLine) {
            console.error(`Can't determine location of train ${nextArrival.trainId} on non-existent line ${line}`);
            console.trace();
            return null;
        }

        const nextStation = metroLine.getStation(nextArrival.stationId);
        if (!nextStation) {
            console.error(`Can't determine location of train ${nextArrival.trainId} arriving at non-existent next station ${nextArrival.stationId}`);
            console.trace();
            return null;
        }

        const nextArrivalNeighborsMap = nextStation.neighbors();
        const nextArrivalNeighbors = Array.from(nextArrivalNeighborsMap.keys());

        let edge;
        if (nextArrivalNeighbors.length === 1) {
            // Station is an endpoint. Train is either going into service there, or arriving from the one connection.
            // For now, we will just guess it's arriving. TODO: improve
            edge = nextArrivalNeighborsMap.get(nextArrivalNeighbors[0])!;
        } else {
            // Otherwise, we'll just guess.
            const toGuessFrom = nextNextArrival
                // If the train is going to a station after it's next arrival, it probably isn't at that station right now
                ? nextArrivalNeighbors.filter(station => station.id !== nextNextArrival.stationId)
                : nextArrivalNeighbors;
            const randomIndex = Math.floor(Math.random() * toGuessFrom.length);
            edge = nextArrivalNeighborsMap.get(toGuessFrom[randomIndex])!;
        }

        // Random distance because we can't actually tell - TODO: reimplement / make smarter
        return new LocationInfo([edge, 0], nextArrival);
    }

    /**
     * Converts a ParsedTflApiResponseItem into an ArrivalInfo.
     * @param arrival The ParsedTflApiResponseItem to be converted.
     * @param arrivals All arrivals. Sometimes needed, for disambiguating Edgware Road arrivals.
     */
    private toArrivalInfo(arrival: ParsedTflApiResponseItem, arrivals: ParsedTflApiResponseItem[]): ArrivalInfo {
        const naptan = this.getNaptan(arrival, arrivals);
        const nextStationId = `${arrival.lineId}_${naptan}`;
        return new ArrivalInfo(arrival.vehicleId, arrival.lineId, nextStationId, arrival.arrivalTime);
    }
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomArbitrary(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export function initialize(initialMetroLines: string[]): CityApi {
    return new LondonApi(initialMetroLines);
}