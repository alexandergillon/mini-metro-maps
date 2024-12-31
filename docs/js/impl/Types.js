/** POJO class for an immutable point. */
export class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    toString() {
        return `(${this.x}, ${this.y})`;
    }
}
/** POJO to represent a train being at a station. */
export class StationLocation {
    constructor(location) {
        this.isStation = true;
        this.station = location;
    }
}
/** POJO to represent a train being along an edge. */
export class EdgeLocation {
    constructor(edge, distanceAlongEdge) {
        this.isStation = false;
        this.edge = edge;
        this.distanceAlongEdge = distanceAlongEdge;
    }
}
/** POJO to represent a train edge location, with a next arrival. */
export class EdgeLocationWithArrival {
    constructor(edgeLocation, station, arrivalTime) {
        this.isStation = false;
        this.edgeLocation = edgeLocation;
        this.arrivalStation = station;
        this.arrivalTime = arrivalTime;
    }
}
