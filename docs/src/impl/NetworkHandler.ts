/** @file Core implementation file for running the metro map. */
import {CityApi} from "../cities/CityTypes.js";
import {Config} from "./Config.js";

/** Class to handle running the metro map - fetching data and moving trains. */
export class NetworkHandler {
    /** City API, for querying train data. */
    private readonly cityApi: CityApi;

    /**
     * Constructor.
     * @param cityApi City API, for querying train data.
     */
    constructor(cityApi: CityApi) {
        this.cityApi = cityApi;
        setInterval(this.fetchTrainData.bind(this), Config.FETCH_TRAIN_DATA_INTERVAL * 1000);
    }

    /** Callback function to update train data, after the timer has gone off. */
    private async fetchTrainData() {
        // todo: implement
        console.log(await this.cityApi.getArrivals());
    }

    public toString() {
        return `NetworkHandler`;
    }
}