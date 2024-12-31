/** @file Code for a train */
import {Edge, EdgeLocationWithArrival, MetroLine, Path, Station, StationLocation, Train, TrainMovement, ViewTrain} from "../Types.js";
import {InOutMovement} from "./InOutMovement.js";
import {ViewTrainImpl} from "./ViewTrainImpl.js";
import {Config} from "../Config.js";
import {PathImpl} from "./PathImpl.js";

/** Implements a train. */
export class TrainImpl implements Train {
    /** Unique identifier of this train in the network. */
    public readonly id: string;
    /** The metro line that this train is on. */
    public readonly metroLine: MetroLine;
    /** Where this train is - either at a station, or moving somewhere. */
    private _location: InternalTrainLocation;
    /** The next station that this train will depart to, after leaving its next arrival. */
    private nextDeparture: [Station, number] | null;
    /** The visuals of the train. */
    private readonly viewTrain: ViewTrain;

    /**
     * Constructor.
     * @param id Unique identifier.
     * @param metroLine Metro line that this train is on.
     * @param initialLocation Initial location.
     * @param nextDeparture Next departure - can be null.
     * @param viewTrain The visuals of the train.
     * @private
     */
    private constructor(id: string, metroLine: MetroLine, initialLocation: InternalTrainLocation, nextDeparture: [Station, number] | null, viewTrain: ViewTrain) {
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
    public static newTrainAtStation(id: string, metroLine: MetroLine, station: Station, nextDeparture: [Station, number] | null,
                             layer: paper.Layer, lineWidth: number, color: paper.Color): Train {
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
    public static newTrainOnPath(id: string, metroLine: MetroLine, nextStation: Station, arrivalTime: number, initialPath: Path,
                          initialDistance: number, layer: paper.Layer, lineWidth: number, color: paper.Color): Train {
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
    public static newTrainOnEdge(id: string, metroLine: MetroLine, edge: Edge, arrivalTime: number, initialDistance: number,
                          layer: paper.Layer, lineWidth: number, color: paper.Color): Train {
        return TrainImpl.newTrainOnPath(id, metroLine, edge.station2, arrivalTime, new PathImpl([edge]),
            initialDistance, layer, lineWidth, color);
    }

    /** Current location of the train. */
    public get location(): StationLocation | EdgeLocationWithArrival {
        if (this._location.isStation) {
            return this._location;
        } else {
            return new EdgeLocationWithArrival(this._location.movement.location, this._location.toStation, this._location.arrivalTime);
        }
    }

    /** Sets the next departure of this train. */
    public setNextDeparture(station: Station, arrivalTime: number) {
        this.nextDeparture = [station, arrivalTime];
    }

    /** Updates the position (etc.) of the train. */
    public update(): void {
        const time = Date.now();
        if (this._location.isStation) {
            if (time > this._location.departureTime) {
                this.tryDepart();
            }
        } else {
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
    private static dwellTime() {
        return Date.now() + getRandomArbitrary(Config.MINIMUM_DWELL_TIME, Config.MAXIMUM_DWELL_TIME);
    }

    /**
     * Tries to depart from the current station. Must be stopped at a station to call this.
     * The departure may not happen yet if its not time to depart, or if the next station is not known.
     * @private
     */
    private tryDepart(): void {
        const time = Date.now();
        if (!this._location.isStation) throw new Error("tryDepart() called when not at station");
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
        } else {
            if (time > this._location.departureTime + Config.TRAIN_TIMEOUT_TIME * 1000) {
                console.warn(`Train ${this.id}, while stopped at ${currentStation}, timed out while waiting for next destination (removing)`);
                this.metroLine.removeTrain(this.id);
            }
        }
    }

    /** Draws this train on the screen. */
    public draw() {
        this.viewTrain.draw();
    }

    /** Hides this train from the screen. */
    public hide() {
        this.viewTrain.hide();
    }
}

/** Internal 'equivalent' of StationLocation. */
class InternalStationLocation {
    public readonly isStation: true;
    public readonly station: Station;
    public readonly departureTime: number;

    constructor(location: Station, departureTime: number) {
        this.isStation = true;
        this.station = location;
        this.departureTime = departureTime;
    }
}

/** Internal 'equivalent' of EdgeLocationWithArrival. */
class InternalMovementLocation {
    public readonly isStation: false;
    public readonly toStation: Station;
    public readonly arrivalTime: number;
    public readonly movement: TrainMovement;

    constructor(station: Station, arrivalTime: number, movement: TrainMovement) {
        this.isStation = false;
        this.toStation = station;
        this.arrivalTime = arrivalTime;
        this.movement = movement;
    }
}

type InternalTrainLocation = InternalStationLocation | InternalMovementLocation;

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomArbitrary(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}