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
    toString() {
        const date = new Date(this.arrivalTime);
        return `'${this.trainId} on line ${this.line} will arrive at ${this.stationId} at ${date.toTimeString()}'`;
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
    toString() {
        const nextArrivalString = `(next arrival ${this.nextArrival.stationId} at ${new Date(this.nextArrival.arrivalTime).toTimeString()})`;
        if (Array.isArray(this.location)) {
            const [station1Id, station2Id, proportion] = this.location;
            return `'${this.nextArrival.trainId} is ${proportion.toFixed(2)} between ${station1Id} and ${station2Id} ${nextArrivalString}'`;
        }
        else {
            return `'${this.nextArrival.trainId} is at ${this.location} ${nextArrivalString}'`;
        }
    }
}
