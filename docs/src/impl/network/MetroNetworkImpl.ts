/** @file Metro network implementation. */
import {JsonMetroNetwork} from "./JsonTypes.js";
import {MetroLineImpl} from "./MetroLineImpl.js";
import {MetroLine, MetroNetwork} from "../Types.js";

/** The global paper object from paper.js. */
declare const paper: paper.PaperScope;

/** Implements a metro network. */
export class MetroNetworkImpl implements MetroNetwork {
    // Graph properties
    /** Metro line name -> MetroLine mapping. */
    private readonly _metroLines: ReadonlyMap<string, MetroLine>;

    // View properties
    /** Min X coordinate in the network (in the underlying coordinate space). */
    public readonly minX: number;
    /** Min Y coordinate in the network (in the underlying coordinate space). */
    public readonly minY: number;
    /** Max X coordinate in the network (in the underlying coordinate space). */
    public readonly maxX: number;
    /** Max Y coordinate in the network (in the underlying coordinate space). */
    public readonly maxY: number;
    /** Width of the network (in the underlying coordinate space). */
    public readonly width: number;
    /** Height of the network (in the underlying coordinate space). */
    public readonly height: number;
    /** Line width of metro lines in the network (in the underlying coordinate space). */
    public readonly lineWidth: number;

    /**
     * Constructor.
     * @param metroLines Metro lines in the network.
     * @param minX Minimum X coordinate in the network.
     * @param minY Minimum Y coordinate in the network.
     * @param maxX Maximum X coordinate in the network.
     * @param maxY Maximum Y coordinate in the network.
     * @param lineWidth Line width.
     * @private
     */
    private constructor(metroLines: MetroLine[], minX: number, minY: number, maxX: number, maxY: number, lineWidth: number) {
        this._metroLines = new Map(metroLines.map(metroLine => [metroLine.name, metroLine]));
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
        this.width = this.maxX - this.minX;
        this.height = this.maxY - this.minY;
        this.lineWidth = lineWidth;
    }

    /**
     * Build a metro network from the input JSON (JsonMetroNetwork).
     * @param json Input metro network data.
     */
    public static fromJson(json: JsonMetroNetwork): MetroNetwork {
        const stationLayer = new paper.Layer();
        const metroLines = json.metroLines.sort((line1, line2) => line1.zIndex - line2.zIndex) // sorts in increasing order
            .map(line => new MetroLineImpl(line, json.lineWidth, new paper.Layer(), stationLayer));
        // Put station layer on top of all line layers
        paper.project.layers.splice(paper.project.layers.indexOf(stationLayer), 1);
        paper.project.layers.push(stationLayer);
        const minX = json.minX === undefined ? 0 : json.minX;
        const minY = json.minY === undefined ? 0 : json.minY;
        const maxX = json.maxX;
        const maxY = json.maxY;
        return new MetroNetworkImpl(metroLines, minX, minY, maxX, maxY, json.lineWidth);
    }

    // Graph methods
    /** Metro lines in the network. */
    public get metroLines() {
        return Array.from(this._metroLines.values());
    }

    /** Gets a metro line by name. Returns null if it does not exist. */
    public getMetroLine(lineName: string): MetroLine | null {
        const metroLine = this._metroLines.get(lineName);
        return metroLine ? metroLine : null;
    }

    // View methods
    /** Draws the metro network on-screen. */
    public draw() {
        this._metroLines.forEach(metroLine => metroLine.draw());
    }

    /** Hides the metro network on-screen. */
    public hide() {
        this._metroLines.forEach(metroLine => metroLine.hide());
    }

    public toString() {
        return `Metro network`;
    }
}