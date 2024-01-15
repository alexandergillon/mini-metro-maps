import { CityModule } from "./cities/city.js";

/** POJO to store information about the next arrival for a train. */
class NextArrivalInfo {
    id: string;
    line: string;
    nextStation: string;
    arrivalTime: number;

    /**
     * @param id ID of the train.
     * @param line Line name of the train.
     * @param nextStation Next station ID of the train.
     * @param arrivalTime Time that this train will arrive at the station, in milliseconds from the epoch.
     */
    constructor(id: string, line: string, nextStation: string, arrivalTime: number) {
        this.id = id;
        this.line = line;
        this.nextStation = nextStation;
        this.arrivalTime = arrivalTime;
    }
}

/** Function to get train data. Dynamically imported during setup. */
let getData: CityModule.GetDataFunction;

/** Sets the getData function. */
function setGetData(getDataIn: CityModule.GetDataFunction) {
    getData = getDataIn;
}

/** Callback function to update train data. */
async function updateTrains() {
    // todo: implement
    console.log(await getData());
}

export { NextArrivalInfo, setGetData, updateTrains };