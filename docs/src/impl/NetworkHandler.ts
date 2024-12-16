/** @file Core implementation file for running the metro map. */
import {CityApi} from "../cities/CityTypes.js";

/** Class to handle running the metro map - fetching data and moving trains. */
export class NetworkHandler {
    /** City API, for querying train data. */
    private readonly cityApi: CityApi;
    /** Time between updates of train data, in seconds. */
    private static readonly FETCH_TRAIN_DATA_INTERVAL = 15;

    /**
     * Constructor.
     * @param cityApi City API, for querying train data.
     */
    constructor(cityApi: CityApi) {
        this.cityApi = cityApi;
        setInterval(this.fetchTrainData.bind(this), NetworkHandler.FETCH_TRAIN_DATA_INTERVAL * 1000);
    }

    /** Callback function to update train data, after the timer has gone off. */
    private async fetchTrainData() {
        // todo: implement
        console.log(await this.cityApi.getArrivals());
    }
}