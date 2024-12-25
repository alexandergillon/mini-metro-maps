import { Point } from "../Types.js";
/** Implements a station. */
export class StationImpl {
    /**
     * Constructor.
     * @param id Unique identifier.
     * @param name Human-readable name.
     * @param location Location.
     * @param metroLine Metro line of this station.
     * @param layer Layer to draw this station on.
     * @param lineWidth Line width of metro lines in the network.
     * @private
     */
    constructor(id, name, location, metroLine, layer, lineWidth) {
        this.id = id;
        this.name = name;
        this.location = location;
        this.metroLine = metroLine;
        this.layer = layer;
        this.paperCircle = this.initializePaperCircle(lineWidth);
    }
    /**
     * Builds a station from a JsonStation.
     * @param json Input station data.
     * @param metroLine Metro line that this station is a part of.
     * @param layer Layer to draw this station on.
     * @param lineWidth Line width of metro lines in the network.
     */
    static fromJson(json, metroLine, layer, lineWidth) {
        return new StationImpl(json.id, json.name, new Point(json.x, json.y), metroLine, layer, lineWidth);
    }
    // Graph methods
    /** Gets neighbors of this station. */
    neighbors() {
        const neighbors = new Map();
        this.metroLine.getEdges(this).forEach(edge => edge.station1 === this
            ? neighbors.set(edge.station2, edge) : neighbors.set(edge.station1, edge));
        return neighbors;
    }
    // View methods
    /** Draws this station on-screen. */
    draw() {
        this.layer.addChild(this.paperCircle);
    }
    /** Hides this station from the screen. */
    hide() {
        this.paperCircle.remove();
    }
    /**
     * Initializes the paper circle that makes up this station on-screen.
     * @param lineWidth Line width of metro lines in the network.
     * @private
     */
    initializePaperCircle(lineWidth) {
        const center = new paper.Point(this.location.x, this.location.y);
        const circle = new paper.Path.Circle(center, lineWidth * 0.2);
        circle.fillColor = new paper.Color("black");
        circle.strokeColor = new paper.Color("white");
        circle.remove();
        return circle;
    }
}
