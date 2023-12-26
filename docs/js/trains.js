/** POJO to store information about the next arrival for a train. */
class NextArrivalInfo {
    /**
     * @param id ID of the train.
     * @param line Line name of the train.
     * @param nextStation Next station ID of the train.
     * @param timeToStation Time until this train will reach this station, in milliseconds.
     */
    constructor(id, line, nextStation, timeToStation) {
        this.id = id;
        this.line = line;
        this.nextStation = nextStation;
        this.timeToStation = timeToStation;
    }
}

/** Function to get train data. Dynamically imported during setup. */
let getData;

/** Sets the getData function. */
function setGetData(getDataIn) {
    getData = getDataIn;
}

/** Callback function to update train data. */
async function updateTrains(event) {
    // todo: implement
    console.log(await getData());
}

export { NextArrivalInfo, setGetData, updateTrains };