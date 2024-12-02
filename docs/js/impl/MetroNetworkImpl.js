import { MetroLineImpl } from "./MetroLineImpl.js";
/** Implements a metro network. */
export class MetroNetworkImpl {
    /**
     * Constructor: build a metro network from the input JSON (JsonMetroNetwork).
     * @param json Input metro network data.
     */
    constructor(json) {
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
}
