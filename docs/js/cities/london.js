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
 * @param data The data returned from the TFL API call. See https://api.tfl.gov.uk/ for response format.
 * @returns {Array<NextArrivalInfo>} The next arrival of each train in the response data.
 */
function stripData(data) {
    const nearestArrival = new Map();

    data.forEach(
        arrival => {
            const vehicleId = arrival.vehicleId;
            const timeToStation = arrival.timeToStation;

            if (!nearestArrival.has(vehicleId) || nearestArrival.get(vehicleId).timeToStation > timeToStation) {
                const arrivalInfo = new NextArrivalInfo(vehicleId, arrival.lineId,
                    `${arrival.lineId}_${arrival.naptanId}`, timeToStation);
                nearestArrival.set(vehicleId, arrivalInfo);
            }
        }
    )

    return Array.from(nearestArrival.values());
}

export { setLines, getData };