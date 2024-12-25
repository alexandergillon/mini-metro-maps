import { MetroLineImpl } from "./MetroLineImpl.js";
/** Implements a metro network. */
export class MetroNetworkImpl {
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
    constructor(metroLines, minX, minY, maxX, maxY, lineWidth) {
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
    static fromJson(json) {
        const metroLines = json.metroLines.sort((line1, line2) => line1.zIndex - line2.zIndex) // sorts in increasing order
            .map(line => new MetroLineImpl(line, json.lineWidth));
        const minX = json.minX === undefined ? 0 : json.minX;
        const minY = json.minY === undefined ? 0 : json.minY;
        const maxX = json.maxX;
        const maxY = json.maxY;
        return new MetroNetworkImpl(metroLines, minX, minY, maxX, maxY, json.lineWidth);
    }
    // Graph methods
    /** Metro lines in the network. */
    get metroLines() {
        return Array.from(this._metroLines.values());
    }
    /** Gets a metro line by name. Returns null if it does not exist. */
    getMetroLine(lineName) {
        const metroLine = this._metroLines.get(lineName);
        return metroLine ? metroLine : null;
    }
    // View methods
    /** Draws the metro network on-screen. */
    draw() {
        this._metroLines.forEach(metroLine => metroLine.draw());
    }
    /** Hides the metro network on-screen. */
    hide() {
        this._metroLines.forEach(metroLine => metroLine.hide());
    }
    toString() {
        return `Metro network`;
    }
}
