import { ArrivalInfo, LocationInfo } from "./CityTypes.js";
class LondonApi {
    /**
     * Constructor.
     * @param metroLines Initial metro lines to query for arrival data.
     */
    constructor(metroLines) {
        /**
         * TFL API URL for train arrivals. See https://api.tfl.gov.uk/ for full response format.
         * The parts of the response that we want are defined via TflApiResponseItem and TflApiResponse
         */
        this.apiUrl = '';
        this.setLines(metroLines);
    }
    setLines(metroLines) {
        // See https://api.tfl.gov.uk/ for URL format.
        if (metroLines) {
            this.apiUrl = `https://api.tfl.gov.uk/line/${metroLines.join(",")}/arrivals`;
        }
        else {
            this.apiUrl = '';
        }
    }
    async getArrivals(metroNetwork) {
        if (!this.apiUrl)
            return [];
        // todo: error handling, make more async
        const response = await fetch(this.apiUrl, { cache: "no-store" });
        const json = await response.json();
        return this.stripData(json, metroNetwork);
    }
    whereAre(trainIds, metroNetwork) {
        // Max approx. 25 ids per call: https://api.tfl.gov.uk/swagger/ui/index.html?url=/swagger/docs/v1#!/Vehicle/Vehicle_Get
        const numRequests = Math.ceil(trainIds.length / 20);
        const promises = [];
        const locations = new Map();
        for (let i = 0; i < numRequests; i++) {
            const thisRequestIds = trainIds.slice(i * 20, (i + 1) * 20);
            const apiUrl = `https://api.tfl.gov.uk/vehicle/${thisRequestIds.join(",")}/arrivals`;
            promises.push(fetch(apiUrl, { cache: "no-store" })
                .then(response => response.json())
                .then(json => this.getLocations(thisRequestIds, json, metroNetwork))
                .then(newLocations => newLocations.forEach((locationInfo, trainId) => locations.set(trainId, locationInfo))));
        }
        return Promise.all(promises).then(_ => locations);
    }
    /**
     * Strips arrival data down to what we care about. Only keeps the closest arrival for each train, and only information
     * about the arrival that we care about (train ID, line, next station, time until station).
     * @param apiArrivals The arrival data returned from the TFL API call. See https://api.tfl.gov.uk/ for response format.
     * @param metroNetwork The metro network.
     * @returns The next arrival of each train in the response data.
     */
    stripData(apiArrivals, metroNetwork) {
        // This isn't beautiful, but it avoids a bunch of needless object creation
        const parsedArrivals = apiArrivals.map(arrival => {
            arrival.arrivalTime = Date.parse(arrival.expectedArrival);
            return arrival;
        });
        const cutoff = LondonApi.cutoffTime();
        const nearestArrival = new Map();
        for (const arrival of parsedArrivals.filter(arrival => arrival.arrivalTime > cutoff)) {
            const vehicleId = arrival.vehicleId;
            if (!nearestArrival.has(vehicleId) || arrival.arrivalTime < nearestArrival.get(vehicleId).arrivalTime) {
                nearestArrival.set(vehicleId, this.toArrivalInfo(arrival, parsedArrivals));
            }
        }
        const arrivals = Array.from(nearestArrival.values());
        for (const arrival of arrivals) {
            if (LondonApi.SUBSURFACE_LINES.includes(arrival.line)) {
                this.checkSubsurfaceArrival(arrival, parsedArrivals, metroNetwork);
            }
        }
        return arrivals;
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
    getNaptan(arrival, arrivals) {
        if (arrival.naptanId === "940GZZLUEUS" && arrival.lineId === "northern") {
            return this.resolveEustonNaptan(arrival);
        }
        else if (arrival.naptanId === "940GZZLUERC" && arrival.lineId === "circle") {
            return this.resolveEdgwareRoadNaptan(arrival, arrivals);
        }
        else if (arrival.naptanId === "940GZZLUPAC" && arrival.lineId === "hammersmith-city") {
            // Paddington is a bit of a mess. See this thread: https://techforum.tfl.gov.uk/t/confused-by-tube-arrivals-at-paddington/1498/19
            return "940GZZLUPAH";
        }
        else {
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
    resolveEustonNaptan(arrival) {
        const platform = arrival.platformName;
        if (/platform 1/i.test(platform) || /platform 2/i.test(platform)) {
            return "940GZZLUEUS_CC";
        }
        else if (/platform 3/i.test(platform) || /platform 6/i.test(platform)) {
            return "940GZZLUEUS_B";
        }
        else {
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
    resolveEdgwareRoadNaptan(arrival, arrivals) {
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
        }
        else if (/westbound/i.test(nextArrival.platformName)) {
            return LondonApi.EDGWARE_ROAD_WESTBOUND_HC.has(nextArrival.naptanId) ? "940GZZLUERC_HC" : "940GZZLUERC_D";
        }
        else {
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
    getLocations(trainIds, arrivals, metroNetwork) {
        // This isn't beautiful, but it avoids a bunch of needless object creation
        const parsedArrivals = arrivals.map(arrival => {
            arrival.arrivalTime = Date.parse(arrival.expectedArrival);
            return arrival;
        });
        const locations = new Map();
        const nearestArrivals = new Map();
        // Get nearest 2 arrivals for each specified train
        const cutoff = LondonApi.cutoffTime();
        for (const arrival of parsedArrivals.filter(arrival => arrival.arrivalTime > cutoff)) {
            const vehicleId = arrival.vehicleId;
            const arrivalTime = arrival.arrivalTime;
            if (!nearestArrivals.has(vehicleId)) {
                nearestArrivals.set(vehicleId, [undefined, undefined]);
            }
            const thisNearestArrivals = nearestArrivals.get(vehicleId);
            if (!thisNearestArrivals[0] || arrivalTime < thisNearestArrivals[0].arrivalTime) {
                nearestArrivals.set(vehicleId, [this.toArrivalInfo(arrival, parsedArrivals), thisNearestArrivals[0]]);
            }
            else if (!thisNearestArrivals[1] || arrivalTime < thisNearestArrivals[1].arrivalTime) {
                nearestArrivals.set(vehicleId, [thisNearestArrivals[0], this.toArrivalInfo(arrival, parsedArrivals)]);
            }
        }
        // Get locations based on nearest arrivals
        for (const trainId of trainIds) {
            const nearestArrivalsForTrain = nearestArrivals.get(trainId);
            if (!nearestArrivalsForTrain) {
                locations.set(trainId, null);
            }
            else {
                const [nextArrival, nextNextArrival] = nearestArrivalsForTrain;
                // If nearestArrivalsForTrain is not undefined, then at least the next arrival is set
                locations.set(trainId, this.getLocation(nextArrival, nextNextArrival, parsedArrivals, metroNetwork));
            }
        }
        return locations;
    }
    /**
     * Attemps to determine the location of a train given its next 1-2 arrivals.
     * @param nextArrival The next arrival of the train.
     * @param nextNextArrival The next next arrival of the train (can be null).
     * @param arrivals All arrivals for the current API request.
     * @param metroNetwork The metro network.
     * @private
     */
    getLocation(nextArrival, nextNextArrival, arrivals, metroNetwork) {
        if (LondonApi.SUBSURFACE_LINES.includes(nextArrival.line))
            this.checkSubsurfaceArrival(nextArrival, arrivals, metroNetwork);
        if (nextNextArrival && nextNextArrival.line != nextArrival.line) {
            // @ts-ignore one of the few times we want to update this in-place
            nextNextArrival.line = nextArrival.line;
        }
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
            edge = nextArrivalNeighborsMap.get(nextArrivalNeighbors[0]);
        }
        else {
            // Otherwise, we'll just guess.
            const toGuessFrom = nextNextArrival
                // If the train is going to a station after it's next arrival, it probably isn't at that station right now
                ? nextArrivalNeighbors.filter(station => station.id !== nextNextArrival.stationId)
                : nextArrivalNeighbors;
            const randomIndex = Math.floor(Math.random() * toGuessFrom.length);
            edge = nextArrivalNeighborsMap.get(toGuessFrom[randomIndex]);
        }
        // Random distance because we can't actually tell - TODO: make random, then reimplement / make smarter
        return new LocationInfo([edge.station1.id, edge.station2.id, 0], nextArrival);
    }
    /**
     * Due to interlining between the Circle, District, Hammersmith & City, and Metropolitan lines (the subsurface tube
     * lines), there are sometimes trains on the network which "don't make sense". These are trains which claim to be
     * one of the above lines, but stop at stations which are only regularly served by a different one of those lines
     * (for example, a H&C train which goes to Upminster). This happens at the beginning/end of days, as some H&C line
     * trains are stored at depots only accessible via the District line, and also during extenuating circumstances
     * (e.g. maintenance or incidents).
     *
     * These arrivals break our map, so we make a best-effort attempt to 'correct' them (in some sense). Meaning showing
     * them as the line that they are visually travelling on (rather than the line that actually are). E.g. the H&C train
     * mentioned above would show as a District line train on our map after these 'corrections'.
     *
     * For any train on a subsurface line, which has an arrival that does not match its line, we try and change it
     * to one of the other ones in a way that makes sense. Specifically, of the lines which stop at its next station,
     * we see which line makes the 'most sense' considering all the future arrivals of that train.
     *
     * @param arrival The subsurface arrival to check. Must be on one of the subsurface lines. Will be modified in-place
     *                if needed.
     * @param arrivals All arrivals for the current API request.
     * @param metroNetwork The metro network.
     * @private
     */
    checkSubsurfaceArrival(arrival, arrivals, metroNetwork) {
        if (!LondonApi.SUBSURFACE_LINES.includes(arrival.line))
            throw new Error(`checkSubsurfaceArrival called on non-subsurface arrival ${arrival}`);
        const metroLine = metroNetwork.getMetroLine(arrival.line);
        if (!metroLine)
            return; // will cause problems somewhere else, to be handled there
        const station = metroLine.getStation(arrival.stationId);
        if (station)
            return; // arrival is fine
        // The line we change the arrival to must be one that the current arrival actually has
        const allowableLines = LondonApi.SUBSURFACE_LINES.filter(line => metroNetwork.getMetroLine(line).getStation(arrival.stationId) != null);
        if (allowableLines.length == 0)
            return; // will cause problems somewhere else, to be handled there
        // Only one such line - return early
        if (allowableLines.length == 1) {
            // @ts-ignore one of the few times we want to update this in-place
            arrival.line = allowableLines[0];
            return;
        }
        // Otherwise, see which line agrees most with all future arrivals of the train
        const arrivalsForTrain = arrivals.filter(a => a.vehicleId === arrival.trainId);
        const lineCounts = new Map(allowableLines.map(line => [line, 0]));
        for (const arrivalForTrain of arrivalsForTrain) {
            if (allowableLines.includes(arrivalForTrain.lineId)) {
                lineCounts.set(arrivalForTrain.lineId, lineCounts.get(arrivalForTrain.lineId) + 1);
            }
        }
        const maxCount = Array.from(lineCounts.values()).reduce((c1, c2) => Math.max(c1, c2));
        const maxCountLines = Array.from(lineCounts.keys()).filter(line => lineCounts.get(line) === maxCount);
        const randomIndex = Math.floor(Math.random() * maxCountLines.length);
        // @ts-ignore one of the few times we want to update this in-place
        arrival.line = maxCountLines[randomIndex];
    }
    /**
     * Converts a ParsedTflApiResponseItem into an ArrivalInfo.
     * @param arrival The ParsedTflApiResponseItem to be converted.
     * @param arrivals All arrivals. Sometimes needed, for disambiguating Edgware Road arrivals.
     */
    toArrivalInfo(arrival, arrivals) {
        const naptan = this.getNaptan(arrival, arrivals);
        const nextStationId = `${arrival.lineId}_${naptan}`;
        return new ArrivalInfo(arrival.vehicleId, arrival.lineId, nextStationId, arrival.arrivalTime);
    }
    /** Gets the current cutoff time. */
    static cutoffTime() {
        return Date.now() + LondonApi.CUTOFF_TIME * 1000;
    }
}
/** Arrivals within the next CUTTOFF_TIME seconds will be dropped. */
LondonApi.CUTOFF_TIME = 5;
/**
 * If a Circle line train is arriving at Edgware road, is travelling EASTBOUND, and has one of these stations as its
 * next arrival after Edgware road, then it almost certainly is arriving at the copy of the station which also
 * serves the H&C line.
 *
 * As a result, if it is travelling EASTBOUND and does NOT have one of these stations as its next arrival, then
 * it is almost certainly arriving at the copy of the station which also serves the District line.
 */
LondonApi.EDGWARE_ROAD_EASTBOUND_HC = new Set(["940GZZLUHSC", "940GZZLUGHK",
    "940GZZLUSBM", "940GZZLUWLA", "940GZZLULRD", "940GZZLULAD", "940GZZLUWSP", "940GZZLURYO", "940GZZLUPAH"]);
/**
 * If a Circle line train is arriving at Edgware road, is travelling WESTBOUND, and has one of these stations as its
 * next arrival after Edgware road, then it almost certainly is arriving at the copy of the station which also
 * serves the H&C line.
 *
 * As a result, if it is travelling WESTBOUND and does NOT have one of these stations as its next arrival, then
 * it is almost certainly arriving at the copy of the station which also serves the District line.
 */
LondonApi.EDGWARE_ROAD_WESTBOUND_HC = new Set(["940GZZLUGPS", "940GZZLUESQ",
    "940GZZLUKSX", "940GZZLUFCN", "940GZZLUBBN", "940GZZLUMGT", "940GZZLULVT", "940GZZLUALD", "940GZZLUTWH",
    "940GZZLUMMT", "940GZZLUCST", "940GZZLUMSH", "940GZZLUBKF", "940GZZLUTMP", "940GZZLUEMB", "940GZZLUWSM",
    "940GZZLUSJP", "940GZZLUVIC", "940GZZLUSSQ", "940GZZLUSKS", "940GZZLUGTR", "940GZZLUHSK", "940GZZLUNHG",
    "940GZZLUBWT", "940GZZLUPAC", "940GZZLUERC"]);
LondonApi.SUBSURFACE_LINES = ["circle", "district", "hammersmith-city", "metropolitan"];
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}
export function initialize(initialMetroLines) {
    return new LondonApi(initialMetroLines);
}
