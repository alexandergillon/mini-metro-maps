/** POJO to store information about the next arrival for a train. */
class ArrivalInfo {
    /**
     * @param trainId ID of the train.
     * @param line Line name of the train.
     * @param stationId Next station ID of the train.
     * @param arrivalTime Arrival time of the train, in milliseconds from the epoch.
     */
    constructor(trainId, line, stationId, arrivalTime) {
        this.trainId = trainId;
        this.line = line;
        this.stationId = stationId;
        this.arrivalTime = arrivalTime;
    }
}
/** Function to get train data. Dynamically imported during setup. */
let getData;
/** Sets the getData function. */
function setGetData(getDataIn) {
    getData = getDataIn;
}
/** Callback function to update train data. */
async function fetchTrainData() {
    // todo: implement
    console.log(await getData());
}
export { ArrivalInfo, setGetData, fetchTrainData };
