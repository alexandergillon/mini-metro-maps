/** POJO to store information about the next arrival for a train. */
export class ArrivalInfo {
    /**
     * Constructor.
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
/** POJO to store a train's location and next arrival. */
export class LocationInfo {
    /**
     * Constructor.
     * @param location Location of train.
     * @param nextArrival Next arrival of train.
     */
    constructor(location, nextArrival) {
        this.location = location;
        this.nextArrival = nextArrival;
    }
}
