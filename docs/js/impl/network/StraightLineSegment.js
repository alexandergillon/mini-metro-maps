/** Implements a line segment which is a straight line. */
export class StraightLineSegment {
    /**
     * Constructor: builds a StraightLineSegment from a JsonStraightLineSegment.
     * @param json Input endpoint data.
     * @param layer Layer to draw this line segment on.
     * @param lineWidth Line width.
     * @param color Color.
     */
    constructor(json, layer, lineWidth, color) {
        this.p0 = json.p0;
        this.p1 = json.p1;
        const dx = json.p1.x - json.p0.x;
        const dy = json.p1.y - json.p0.y;
        this.length = Math.sqrt(dx * dx + dy * dy);
        this.layer = layer;
        this.paperPath = this.initializePaperPath(lineWidth, color);
    }
    /** Draws this segment on-screen. */
    draw() {
        this.layer.addChild(this.paperPath);
    }
    /** Hides this segment from the screen. */
    hide() {
        this.paperPath.remove();
    }
    /**
     * Initializes the Paper Path which makes up this line segment on-screen.
     * @param lineWidth Line width.
     * @param color Color.
     * @private
     */
    initializePaperPath(lineWidth, color) {
        // dx and dy extend all straight line segments by 1 pixel in either direction.
        // Otherwise, it will appear like there are tiny gaps between segments.
        const dx = Math.sign(this.p1.x - this.p0.x);
        const dy = Math.sign(this.p1.y - this.p0.y);
        const p0 = new paper.Point(this.p0.x - dx, this.p0.y - dy);
        const p1 = new paper.Point(this.p1.x + dx, this.p1.y + dy);
        const paperPath = new paper.Path();
        paperPath.add(p0);
        paperPath.add(p1);
        paperPath.strokeWidth = lineWidth;
        paperPath.strokeColor = color;
        paperPath.remove();
        return paperPath;
    }
}
