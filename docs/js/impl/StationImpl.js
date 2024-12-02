import { Point } from "./Types.js";
/** Implements a station. */
export class StationImpl {
    /**
     * Constructor: builds a station from a JsonStation.
     * @param json Input station data.
     * @param metroLine Metro line that this station is a part of.
     * @param layer Layer to draw this station on.
     * @param lineWidth Line width of metro lines in the network.
     */
    constructor(json, metroLine, layer, lineWidth) {
        this.id = json.id;
        this.name = json.name;
        this.location = new Point(json.x, json.y);
        this.metroLine = metroLine;
        this.layer = layer;
        this.paperCircle = this.initializePaperCircle(lineWidth);
    }
    // Graph methods
    /** Gets neighbors of this station. */
    neighbors() {
        return this.metroLine.getEdges(this).map(edge => edge.station1 === this ? edge.station2 : edge.station1);
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
