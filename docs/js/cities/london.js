import { NextArrivalInfo } from "../trains.js";

/** TFL API URL for train arrivals. See https://api.tfl.gov.uk/ for response format. */
let apiUrl;

/**
 * Sets the metro lines which arrivals should be fetched for.
 * @param metroLines Names of the metro lines, as an array of strings.
 */
function setLines(metroLines) {
    // See https://api.tfl.gov.uk/ for URL format.
    apiUrl = `https://api.tfl.gov.uk/line/${metroLines.join(",")}/arrivals`;
}

/**
 * Gets the next arrival for all trains on lines previously specified by setLines().
 * Each train has only 1 NextArrivalInfo in the return value.
 * @returns {Array<NextArrivalInfo>} The next arrival of each train on the previously configured lines.
 */
async function getData() {
    // todo: error handling
    console.log("getData"); // todo: remove
    const response = await fetch(apiUrl);
    const json = await response.json();
    return stripData(json);
}

/**
 * Strips arrival data down to what we care about. Only keeps the closest arrival for each train, and only information
 * about the arrival that we care about (train ID, line, next station, time until station).
 * @param arrivals The arrival data returned from the TFL API call. See https://api.tfl.gov.uk/ for response format.
 * @returns {Array<NextArrivalInfo>} The next arrival of each train in the response data.
 */
function stripData(arrivals) {
    const nearestArrival = new Map();

    arrivals.forEach(
        arrival => {
            const vehicleId = arrival.vehicleId;
            const timeToStation = arrival.timeToStation;

            if (!nearestArrival.has(vehicleId) || nearestArrival.get(vehicleId).timeToStation > timeToStation) {
                const naptan = getNaptan(arrival, arrivals);
                const nextStationId = `${arrival.lineId}_${naptan}`;
                const arrivalInfo = new NextArrivalInfo(vehicleId, arrival.lineId, nextStationId, timeToStation);
                nearestArrival.set(vehicleId, arrivalInfo);
            }
        }
    )

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
function getNaptan(arrival, arrivals) {
    if (arrival.naptanId === "940GZZLUEUS" && arrival.lineId === "northern") {
        return resolveEustonNaptan(arrival);
    } else if (arrival.naptanId === "940GZZLUERC" && arrival.lineId === "circle") {
        return resolveEdgwareRoadNaptan(arrival, arrivals);
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
function resolveEustonNaptan(arrival) {
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
 * If a Circle line train is arriving at Edgware road, is travelling EASTBOUND, and has one of these stations as its
 * next arrival after Edgware road, then it almost certainly is arriving at the copy of the station which also
 * serves the H&C line.
 *
 * As a result, if it is travelling EASTBOUND and does NOT have one of these stations as its next arrival, then
 * it is almost certainly arriving at the copy of the station which also serves the District line.
 */
const EDGWARE_ROAD_EASTBOUND_HC = new Set(["940GZZLUHSC", "940GZZLUGHK", "940GZZLUSBM", "940GZZLUWLA",
    "940GZZLULRD", "940GZZLULAD", "940GZZLUWSP", "940GZZLURYO", "940GZZLUPAH"]);

/**
 * If a Circle line train is arriving at Edgware road, is travelling WESTBOUND, and has one of these stations as its
 * next arrival after Edgware road, then it almost certainly is arriving at the copy of the station which also
 * serves the H&C line.
 *
 * As a result, if it is travelling WESTBOUND and does NOT have one of these stations as its next arrival, then
 * it is almost certainly arriving at the copy of the station which also serves the District line.
 */
const EDGWARE_ROAD_WESTBOUND_HC = new Set(["940GZZLUGPS", "940GZZLUESQ", "940GZZLUKSX", "940GZZLUFCN",
    "940GZZLUBBN", "940GZZLUMGT", "940GZZLULVT", "940GZZLUALD", "940GZZLUTWH", "940GZZLUMMT", "940GZZLUCST",
    "940GZZLUMSH", "940GZZLUBKF", "940GZZLUTMP", "940GZZLUEMB", "940GZZLUWSM", "940GZZLUSJP", "940GZZLUVIC",
    "940GZZLUSSQ", "940GZZLUSKS", "940GZZLUGTR", "940GZZLUHSK", "940GZZLUNHG", "940GZZLUBWT", "940GZZLUPAC",
    "940GZZLUERC"]);

/**
 * Resolves NAPTANs for an arrival at Edgware Road on the Circle line.
 * We can't simply use platforms to determine which copy of the station is correct, as a platform number doesn't
 * always correspond to the same route. Instead, we find the next destination that the train is going to, and figure
 * out which copy is appropriate from that.
 * @param arrival An arrival at Edgware Road on the Circle line.
 * @param arrivals All arrivals. Needed to find the next destination of the train.
 * @returns A NAPTAN for that arrival (either Edgware Road which also serves H&C, or Edgware Road which also serves District).
 */
function resolveEdgwareRoadNaptan(arrival, arrivals) {
    const vehicleId = arrival.vehicleId;
    const timeToStation = arrival.timeToStation

    // Gets all arrivals for the same vehicle which are after this arrival.
    const laterArrivals = arrivals.filter(a => a.vehicleId === vehicleId && a.timeToStation > timeToStation);

    if (laterArrivals.length === 0) {
        // Train is likely terminating at Edgware Road, and then going out of service. Almost certainly is the
        // Edgware Road which also serves the District line.
        return "940GZZLUERC_D";
    }

    // Gets the next (soonest) arrival after this arrival for the same vehicle.
    const nextArrival = laterArrivals.reduce((a1, a2) => a1.timeToStation < a2.timeToStation ? a1 : a2);

    if (/eastbound/i.test(nextArrival.platformName)) {
        return EDGWARE_ROAD_EASTBOUND_HC.has(nextArrival.naptanId) ? "940GZZLUERC_HC" : "940GZZLUERC_D";
    } else if (/westbound/i.test(nextArrival.platformName)) {
        return EDGWARE_ROAD_WESTBOUND_HC.has(nextArrival.naptanId) ? "940GZZLUERC_HC" : "940GZZLUERC_D";
    } else {
        console.log(`Could not resolve NAPTAN for Edgware Road (${nextArrival.platformName}).`);
        return "940GZZLUERC_D"; // need to return something - right half the time
    }
}

export { setLines, getData };