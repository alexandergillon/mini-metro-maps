/** @file Code for train visuals. */

import {ViewTrain} from "../Types";

/** Class for train visuals. */
export class ViewTrainImpl implements ViewTrain {
    /** paper.js object for the train. */
    private readonly train: paper.Path.Rectangle;
    /** Paper layer that this train is drawn on. */
    private readonly layer: paper.Layer;
    /** Width of a train, as a multiple of line width. */
    private static readonly TRAIN_WIDTH_SCALE_FACTOR = 2;
    /** Length of a train, as a multiple of line width. */
    private static readonly TRAIN_LENGTH_SCALE_FACTOR = 3.5;

    /**
     * Constructor.
     * @param x Center of the train, X coordinate.
     * @param y Center of the train, Y coordinate.
     * @param bearing Initial bearing of the train, in degrees.
     * @param layer Layer to draw the train on.
     * @param lineWidth Line width.
     * @param color Train color.
     */
    constructor(x: number, y: number, bearing: number, layer: paper.Layer, lineWidth: number, color: paper.Color) {
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

    public get x() {
        return this.train.position.x;
    }

    public set x(val: number) {
        this.train.position.x = val;
    }

    public get y() {
        return this.train.position.y;
    }

    public set y(val: number) {
        this.train.position.y = val;
    }

    public get bearing() {
        return this.train.rotation;
    }

    public set bearing(val: number) {
        this.train.rotation = val;
    }

    /** Draws this train on-screen. */
    public draw() {
        this.layer.addChild(this.train);
    }

    /** Hides this train from the screen. */
    public hide() {
        this.train.remove();
    }
}
