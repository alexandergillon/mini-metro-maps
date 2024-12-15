/** @file Metro network implementation. */
import {JsonMetroNetwork} from "./JsonTypes.js";
import {MetroLineImpl} from "./MetroLineImpl.js";
import {MetroLine, MetroNetwork} from "../Types.js";

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
     * Constructor: build a metro network from the input JSON (JsonMetroNetwork).
     * @param json Input metro network data.
     */
    public constructor(json: JsonMetroNetwork) {
        const metroLines = json.metroLines.sort((line1, line2) => line1.zIndex - line2.zIndex) // sorts in increasing order
            .map(line => new MetroLineImpl(line, json.lineWidth));
        this._metroLines = new Map(metroLines.map(metroLine => [metroLine.name, metroLine]));

        this.minX = json.minX === undefined ? 0 : json.minX;
        this.minY = json.minY === undefined ? 0 : json.minY;
        this.maxX = json.maxX;
        this.maxY = json.maxY;
        this.width = this.maxX - this.minX;
        this.height = this.maxY - this.minY;
        this.lineWidth = json.lineWidth;
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
}