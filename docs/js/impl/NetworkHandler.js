import { Config } from "./Config.js";
import { TrainImpl } from "./trains/TrainImpl.js";
/** Class to handle running the metro map - fetching data and moving trains. */
export class NetworkHandler {
    /**
     * Constructor. Note: fetches train data upon construction.
     * @param metroNetwork The metro network.
     * @param cityApi City API, for querying train data.
     */
    constructor(metroNetwork, cityApi) {
        /** paper.js layer to draw trains on. */
        this.trainLayer = new paper.Layer();
        this.metroNetwork = metroNetwork;
        this.cityApi = cityApi;
        setInterval(this.fetchTrainData.bind(this), Config.FETCH_TRAIN_DATA_INTERVAL * 1000);
        paper.view.onFrame = this.updateTrains.bind(this);
        this.fetchTrainData();
    }
    /** Callback function to update train data, after the timer has gone off. */
    async fetchTrainData() {
        const arrivals = await this.cityApi.getArrivals();
        // Arrivals of trains that we do not know about
        const newTrainArrivals = [];
        for (const arrival of arrivals) {
            if (!this.validateArrival(arrival))
                continue;
            const metroLine = this.metroNetwork.getMetroLine(arrival.line);
            const train = metroLine.getTrain(arrival.trainId);
            if (train) {
                this.handleExistingArrival(train, arrival);
            }
            else {
                newTrainArrivals.push(arrival);
            }
        }
        // Handle all arrivals with new trains at once, as the CityApi function may be able to bulk retrieve train locations
        if (newTrainArrivals)
            await this.handleNewTrainArrivals(newTrainArrivals);
    }
    /**
     * Validates that a train arrival is well-formed. Namely, that it refers to a metro line and station that exist,
     * and that it is in the future.
     * @param arrival Arrival to validate.
     * @return Whether the arrival is valid.
     * @private
     */
    validateArrival(arrival) {
        const metroLine = this.metroNetwork.getMetroLine(arrival.line);
        if (!metroLine) {
            console.error(`Can't find metro line ${arrival.line} for arrival ${arrival}`);
            return false;
        }
        const station = metroLine.getStation(arrival.stationId);
        if (!station) {
            console.error(`Can't find station ${arrival.stationId} on metro line ${arrival.line} for arrival ${arrival}`);
            return false;
        }
        if (arrival.arrivalTime < Date.now()) {
            const now = new Date(Date.now());
            const arrivalTime = new Date(arrival.arrivalTime);
            console.warn(`Arrival time ${arrivalTime.toTimeString()} has passed (now: ${now.toTimeString()}) for arrival ${arrival}`);
            return false;
        }
        return true;
    }
    /**
     * Handles an arrival for a train that already exists. This may involve re-routing the train, or setting its next
     * departure.
     * @param train An existing train.
     * @param arrival An arrival for that train.
     * @private
     */
    handleExistingArrival(train, arrival) {
        const location = train.location;
        const station = train.metroLine.getStation(arrival.stationId);
        if (location.isStation) {
            // Already at that station - don't set next departure
            if (location.station.id === arrival.stationId)
                return;
            train.setNextDeparture(station, arrival.arrivalTime);
        }
        else {
            // Already going to that station - ignore new arrival. TODO: use the new arrival
            if (location.arrivalStation.id === arrival.stationId)
                return;
            if (location.arrivalTime < Config.FETCH_TRAIN_DATA_INTERVAL) {
                // By the time we next fetch data, this train will have arrived. Let's set the departure now.
                train.setNextDeparture(station, arrival.arrivalTime);
            }
            // For now, we are dropping re-routing of trains while they are moving. TODO: fix
        }
    }
    /**
     * Handles arrivals for trains that we do not know about. I.e. trains that we need to create.
     * @param arrivals Arrivals to handle. The trains of these arrivals must not already exist.
     * @private
     */
    async handleNewTrainArrivals(arrivals) {
        const locations = await this.cityApi.whereAre(arrivals.map(arrival => arrival.trainId), this.metroNetwork);
        for (let arrival of arrivals) {
            const locationInfo = locations.get(arrival.trainId);
            if (locationInfo === undefined) {
                console.error(`CityApi whereAre() did not return position for train ${arrival.trainId}`);
            }
            else if (locationInfo === null) {
                console.warn(`CityApi whereAre() does not know where train ${arrival.trainId} is, skipping`);
            }
            else {
                this.handleNewTrainArrival(locationInfo);
            }
        }
    }
    /**
     * Handles an arrival for a train that we do not know about. Creates the train and sets it on its way.
     * @param locationInfo Location and arrival information of the new train.
     * @private
     */
    handleNewTrainArrival(locationInfo) {
        const arrival = locationInfo.nextArrival;
        const location = locationInfo.location;
        if (!this.validateArrival(arrival))
            return;
        const metroLine = this.metroNetwork.getMetroLine(arrival.line);
        const arrivalStation = metroLine.getStation(arrival.stationId);
        if (Array.isArray(location)) {
            // Train is on an edge
            const [station1Id, station2Id, proportion] = location;
            const station1 = metroLine.getStation(station1Id);
            const station2 = metroLine.getStation(station2Id);
            if (!station1) {
                console.error(`Can't find station ${station1Id} on metro line ${arrival.line} for location ${locationInfo}`);
                return;
            }
            if (!station2) {
                console.error(`Can't find station ${station1Id} on metro line ${arrival.line} for location ${locationInfo}`);
                return;
            }
            const edge = station1.neighbors().get(station2);
            if (!edge) {
                console.error(`Can't find edge between ${station1Id} and ${station2Id} on metro line ${arrival.line} for location ${locationInfo}`);
                return;
            }
            if (edge.station2.id !== station2Id) {
                console.error(`Trains which start on an edge, with their next destination not the end of that edge, are not supported (location ${locationInfo})`);
                return;
            }
            const train = TrainImpl.newTrainOnEdge(arrival.trainId, metroLine, edge, arrival.arrivalTime, proportion * edge.length, this.trainLayer, this.metroNetwork.lineWidth, metroLine.color);
            metroLine.addTrain(train);
        }
        else {
            // Train is at a station
            const currentStation = metroLine.getStation(location); // location = stationId
            if (!currentStation) {
                console.error(`Can't find station ${arrival.stationId} on metro line ${arrival.line} for location ${locationInfo}`);
                return;
            }
            const train = TrainImpl.newTrainAtStation(arrival.trainId, metroLine, currentStation, [arrivalStation, arrival.arrivalTime], this.trainLayer, this.metroNetwork.lineWidth, metroLine.color);
            metroLine.addTrain(train);
        }
    }
    /** Callback for paper.js onFrame() - updates all trains in the network. */
    updateTrains() {
        this.metroNetwork.metroLines.forEach(metroLine => metroLine.updateTrains());
    }
    toString() {
        return `NetworkHandler`;
    }
}
