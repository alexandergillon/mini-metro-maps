/** Class to handle running the metro map - fetching data and moving trains. */
export class NetworkHandler {
    /**
     * Constructor.
     * @param cityApi City API, for querying train data.
     */
    constructor(cityApi) {
        this.cityApi = cityApi;
        setInterval(this.fetchTrainData.bind(this), NetworkHandler.FETCH_TRAIN_DATA_INTERVAL * 1000);
    }
    /** Callback function to update train data, after the timer has gone off. */
    async fetchTrainData() {
        // todo: implement
        console.log(await this.cityApi.getArrivals());
    }
}
/** Time between updates of train data, in seconds. */
NetworkHandler.FETCH_TRAIN_DATA_INTERVAL = 15;
