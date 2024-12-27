/** @file Code for train visuals. */
/** Class for train visuals. */
export class ViewTrainImpl {
    /**
     * Constructor.
     * @param x Center of the train, X coordinate.
     * @param y Center of the train, Y coordinate.
     * @param bearing Initial bearing of the train, in degrees.
     * @param layer Layer to draw the train on.
     * @param lineWidth Line width.
     * @param color Train color.
     */
    constructor(x, y, bearing, layer, lineWidth, color) {
        const halfWidth = (ViewTrainImpl.TRAIN_WIDTH_SCALE_FACTOR * lineWidth) / 2;
        const halfLength = (ViewTrainImpl.TRAIN_LENGTH_SCALE_FACTOR * lineWidth) / 2;
        const topLeft = new paper.Point(x - halfWidth, y - halfLength);
        const bottomRight = new paper.Point(x + halfWidth, y + halfLength);
        const train = new paper.Path.Rectangle(topLeft, bottomRight);
        train.rotate(bearing);
        train.fillColor = color;
        train.remove();
        this.train = train;
        this.layer = layer;
    }
    get x() {
        return this.train.position.x;
    }
    set x(val) {
        this.train.position.x = val;
    }
    get y() {
        return this.train.position.y;
    }
    set y(val) {
        this.train.position.y = val;
    }
    get bearing() {
        return this.train.rotation;
    }
    set bearing(val) {
        this.train.rotation = val;
    }
    /** Draws this train on-screen. */
    draw() {
        this.layer.addChild(this.train);
    }
    /** Hides this train from the screen. */
    hide() {
        this.train.remove();
    }
}
/** Width of a train, as a multiple of line width. */
ViewTrainImpl.TRAIN_WIDTH_SCALE_FACTOR = 2;
/** Length of a train, as a multiple of line width. */
ViewTrainImpl.TRAIN_LENGTH_SCALE_FACTOR = 3.5;
