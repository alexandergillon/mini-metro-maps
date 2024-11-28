import { ArrivalInfo } from "../trains.js";

/**
 * Sets the metro lines which arrivals should be fetched for.
 * @param metroLines Names of the metro lines, as an array of strings.
 */
function setLines(metroLines: string[]) {
    // TODO
}

/**
 * Gets the next arrival for all trains on lines previously specified by setLines().
 * Each train has only 1 NextArrivalInfo in the return value.
 * @returns The next arrival of each train on the previously configured lines.
 */
async function getData(): Promise<Array<ArrivalInfo>> {
    // todo: error handling
    console.log("getData"); // todo: remove
    throw new Error("unimplemented");
}

export { setLines, getData };