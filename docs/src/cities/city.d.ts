/** This file is an interface for cities to implement. */
import { ArrivalInfo } from "../trains.ts";

declare module CityModule {
    /**
     * Sets the metro lines which arrivals should be fetched for. This function must be called before
     * any calls are made to getData().
     * @param metroLines Names of the metro lines, as an array of strings.
     */
    export function setLines(metroLines: string[]): void;

    /**
     * Gets the next arrival for all trains on lines previously specified by setLines().
     * Each train has only 1 NextArrivalInfo in the return value.
     * @returns The next arrival of each train on the previously configured lines.
     */
    export function getData(): Promise<Array<ArrivalInfo>>;

    /** Type of getData(), for TypeScript annotations. */
    export type GetDataFunction = typeof getData;
}