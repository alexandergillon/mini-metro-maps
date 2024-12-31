/** @file Code for a train */
import { EdgeLocationWithArrival } from "../Types.js";
import { InOutMovement } from "./InOutMovement.js";
import { ViewTrainImpl } from "./ViewTrainImpl.js";
import { Config } from "../Config.js";
import { PathImpl } from "./PathImpl.js";
/** Implements a train. */
export class TrainImpl {
    /**
     * Constructor.
     * @param id Unique identifier.
     * @param metroLine Metro line that this train is on.
     * @param initialLocation Initial location.
     * @param nextDeparture Next departure - can be null.
     * @param viewTrain The visuals of the train.
     * @private
     */
    constructor(id, metroLine, initialLocation, nextDeparture, viewTrain) {
        this.id = id;
        this.metroLine = metroLine;
        this._location = initialLocation;
        this.nextDeparture = nextDeparture;
        this.viewTrain = viewTrain;
    }
    /**
     * Creates a new train that is stopped at a station.
     * @param id Unique identifier.
     * @param metroLine Metro line to put the train on.
     * @param station Station to start the train at.
     * @param nextDeparture Next departure of the train - can be null.
     * @param layer Layer to draw the train on.
     * @param lineWidth Line width.
     * @param color Color.
     */
    static newTrainAtStation(id, metroLine, station, nextDeparture, layer, lineWidth, color) {
        // TODO: bearing
        const viewTrain = new ViewTrainImpl(station.location.x, station.location.y, 0, id, layer, lineWidth, color);
        const location = new InternalStationLocation(station, TrainImpl.dwellTime());
        return new TrainImpl(id, metroLine, location, nextDeparture, viewTrain);
    }
    /**
     * Creates a new train that is moving along a path.
     * @param id Unique identifier.
     * @param metroLine Metro line to put the train on.
     * @param nextStation Next station that the train will arrive at.
     * @param arrivalTime Time that the train will arrive at the next station.
     * @param initialPath Path that the train is currently on. Must end at nextStation.
     * @param initialDistance Initial distance along the path.
     * @param layer Layer to draw the train on.
     * @param lineWidth Line width.
     * @param color Color.
     */
    static newTrainOnPath(id, metroLine, nextStation, arrivalTime, initialPath, initialDistance, layer, lineWidth, color) {
        const initialCoord = initialPath.samplePoint();
        // TODO: bearing
        const viewTrain = new ViewTrainImpl(initialCoord.x, initialCoord.y, 0, id, layer, lineWidth, color);
        const movement = new InOutMovement(viewTrain, Date.now(), arrivalTime, initialPath, initialDistance);
        const location = new InternalMovementLocation(nextStation, arrivalTime, movement);
        return new TrainImpl(id, metroLine, location, null, viewTrain);
    }
    /**
     * Convenience wrapper around newTrainOnPath for a train starting on a path which is a single edge.
     * @param id Unique identifier.
     * @param metroLine Metro line to put the train on.
     * @param edge Edge that the train is currently on.
     * @param arrivalTime Time that the train will arrive at the second station in the edge.
     * @param initialDistance Initial distance along the edge.
     * @param layer Layer to draw the train on.
     * @param lineWidth Line width.
     * @param color Color.
     */
    static newTrainOnEdge(id, metroLine, edge, arrivalTime, initialDistance, layer, lineWidth, color) {
        return TrainImpl.newTrainOnPath(id, metroLine, edge.station2, arrivalTime, new PathImpl([edge]), initialDistance, layer, lineWidth, color);
    }
    /** Current location of the train. */
    get location() {
        if (this._location.isStation) {
            return this._location;
        }
        else {
            return new EdgeLocationWithArrival(this._location.movement.location, this._location.toStation, this._location.arrivalTime);
        }
    }
    /** Sets the next departure of this train. */
    setNextDeparture(station, arrivalTime) {
        this.nextDeparture = [station, arrivalTime];
    }
    /** Updates the position (etc.) of the train. */
    update() {
        const time = Date.now();
        if (this._location.isStation) {
            if (time > this._location.departureTime) {
                this.tryDepart();
            }
        }
        else {
            this._location.movement.update();
            if (time > this._location.arrivalTime) {
                this._location = new InternalStationLocation(this._location.toStation, TrainImpl.dwellTime());
                this.viewTrain.x = this._location.station.location.x;
                this.viewTrain.y = this._location.station.location.y;
            }
        }
    }
    /**
     * Gets a random time to dwell until, based on config parameters.
     * @private
     */
    static dwellTime() {
        return Date.now() + getRandomArbitrary(Config.MINIMUM_DWELL_TIME, Config.MAXIMUM_DWELL_TIME);
    }
    /**
     * Tries to depart from the current station. Must be stopped at a station to call this.
     * The departure may not happen yet if its not time to depart, or if the next station is not known.
     * @private
     */
    tryDepart() {
        const time = Date.now();
        if (!this._location.isStation)
            throw new Error("tryDepart() called when not at station");
        const currentStation = this._location.station;
        if (this.nextDeparture) {
            const [nextStation, arrivalTime] = this.nextDeparture;
            const path = this.metroLine.pathfind(currentStation, nextStation);
            if (!path) {
                console.error(`Train ${this.id} could not pathfind from ${currentStation} to ${nextStation} (removing)`);
                this.metroLine.removeTrain(this.id);
                return;
            }
            const movement = new InOutMovement(this.viewTrain, Date.now(), arrivalTime, path);
            this._location = new InternalMovementLocation(nextStation, arrivalTime, movement);
        }
        else {
            if (time > this._location.departureTime + Config.TRAIN_TIMEOUT_TIME * 1000) {
                console.warn(`Train ${this.id}, while stopped at ${currentStation}, timed out while waiting for next destination (removing)`);
                this.metroLine.removeTrain(this.id);
            }
        }
    }
    /** Draws this train on the screen. */
    draw() {
        this.viewTrain.draw();
    }
    /** Hides this train from the screen. */
    hide() {
        this.viewTrain.hide();
    }
}
/** Internal 'equivalent' of StationLocation. */
class InternalStationLocation {
    constructor(location, departureTime) {
        this.isStation = true;
        this.station = location;
        this.departureTime = departureTime;
    }
}
/** Internal 'equivalent' of EdgeLocationWithArrival. */
class InternalMovementLocation {
    constructor(station, arrivalTime, movement) {
        this.isStation = false;
        this.toStation = station;
        this.arrivalTime = arrivalTime;
        this.movement = movement;
    }
}
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}
