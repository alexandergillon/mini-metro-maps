/** @file Station implementation. */
import {JsonStation} from "./JsonTypes.js";
import {Edge, MetroLine, Point, Station} from "../Types.js";

/** Implements a station. */
export class StationImpl implements Station {
    // Graph properties
    /** Unique identifier. */
    public readonly id: string;
    /** Name. */
    public readonly name: string;
    /** Metro line that this station is a part of. */
    private readonly metroLine: MetroLine;

    // View properties
    /** Location in underlying coordinate space. */
    public readonly location: Point;
    /** Paper layer that this station is drawn on. */
    private readonly layer: paper.Layer;
    /** Paper circle, which is the station on-screen. */
    private readonly paperCircle: paper.Path.Circle;

    /**
     * Constructor: builds a station from a JsonStation.
     * @param json Input station data.
     * @param metroLine Metro line that this station is a part of.
     * @param layer Layer to draw this station on.
     * @param lineWidth Line width of metro lines in the network.
     */
    public constructor(json: JsonStation, metroLine: MetroLine, layer: paper.Layer, lineWidth: number) {
        this.id = json.id;
        this.name = json.name;
        this.location = new Point(json.x, json.y);
        this.metroLine = metroLine;

        this.layer = layer;
        this.paperCircle = this.initializePaperCircle(lineWidth);
    }

    // Graph methods
    /** Gets neighbors of this station. */
    public neighbors(): Map<Station, Edge> {
        const neighbors: Map<Station, Edge> = new Map();
        this.metroLine.getEdges(this).forEach(edge => edge.station1 === this
            ? neighbors.set(edge.station2, edge) : neighbors.set(edge.station1, edge));
        return neighbors;
    }

    // View methods
    /** Draws this station on-screen. */
    public draw() {
        this.layer.addChild(this.paperCircle);
    }

    /** Hides this station from the screen. */
    public hide() {
        this.paperCircle.remove();
    }

    /**
     * Initializes the paper circle that makes up this station on-screen.
     * @param lineWidth Line width of metro lines in the network.
     * @private
     */
    private initializePaperCircle(lineWidth: number) : paper.Path.Circle {
        const center = new paper.Point(this.location.x, this.location.y);
        const circle = new paper.Path.Circle(center, lineWidth * 0.2);
        circle.fillColor = new paper.Color("black");
        circle.strokeColor = new paper.Color("white");
        circle.remove();
        return circle;
    }
}