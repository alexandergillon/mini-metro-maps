/** @file Station implementation. */
import {JsonStation} from "./JsonTypes.js";
import {Edge, MetroLine, Point, Station} from "../Types.js";
import {Config} from "../Config.js";

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
    private readonly paperItems: paper.Item[];

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
    private constructor(id: string, name: string, location: Point, metroLine: MetroLine, layer: paper.Layer, lineWidth: number) {
        this.id = id;
        this.name = name;
        this.location = location;
        this.metroLine = metroLine;
        this.layer = layer;
        this.paperItems = this.initializePaperItems(lineWidth);
    }

    /**
     * Builds a station from a JsonStation.
     * @param json Input station data.
     * @param metroLine Metro line that this station is a part of.
     * @param layer Layer to draw this station on.
     * @param lineWidth Line width of metro lines in the network.
     */
    public static fromJson(json: JsonStation, metroLine: MetroLine, layer: paper.Layer, lineWidth: number): Station {
        return new StationImpl(json.id, json.name, new Point(json.x, json.y), metroLine, layer, lineWidth);
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
        this.paperItems.forEach(item => this.layer.addChild(item));
    }

    /** Hides this station from the screen. */
    public hide() {
        this.paperItems.forEach(item => item.remove());
    }

    /**
     * Initializes the paper items that makes up this station on-screen. Stations are only shown when developer
     * mode is enabled.
     * @param lineWidth Line width of metro lines in the network.
     * @private
     */
    private initializePaperItems(lineWidth: number) : paper.Item[] {
        if (Config.DEV_MODE_ENABLED) {
            const center = new paper.Point(this.location.x, this.location.y);
            const circle = new paper.Path.Circle(center, lineWidth * 0.2);
            circle.fillColor = new paper.Color("black");
            circle.strokeColor = new paper.Color("white");
            circle.remove();

            const textOffset = lineWidth;
            const label = new paper.PointText(new paper.Point(center.x + textOffset, center.y + textOffset));
            label.fillColor = new paper.Color('black');
            label.content = this.id;
            label.fontSize = lineWidth / 3;
            label.fontFamily = 'monospace';
            label.remove();

            // Texts can overlap in an unpleasant way for stations that overlap. Give them a background so that
            // it's not too crazy (as a result, you will only be able to read one of the labels).
            const labelBackground = new paper.Path.Rectangle(label.bounds.scale(1.1));
            labelBackground.fillColor = new paper.Color('white');
            labelBackground.strokeColor = new paper.Color('black');
            labelBackground.remove();

            return [circle, labelBackground, label];
        } else {
            return [];
        }
    }

    public toString() {
        return `${this.metroLine.name} station ${this.name} (${this.id})`;
    }
}