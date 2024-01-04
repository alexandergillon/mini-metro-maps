import { metroNetwork } from "./network.js";

/** Width of a train, as a multiple of line width. */
const TRAIN_WIDTH_SCALE_FACTOR = 2;

/** Length of a train, as a multiple of line width. */
const TRAIN_LENGTH_SCALE_FACTOR = 3.5;

/**
 * Creates a train and draws it on the canvas. Returns the created train for further manipulation.
 * @param x Center of the train, X coordinate.
 * @param y Center of the train, Y coordinate.
 * @param color Color of the train, as a hex string.
 * @param initialRotation Initial rotation of the train, in degrees. Measured clockwise, with 0 degrees
 * being the train facing upwards.
 * @returns The newly created train.
 */
function createTrain(x, y, color, initialRotation) {
    const halfWidth = (TRAIN_WIDTH_SCALE_FACTOR * metroNetwork.lineWidth) / 2;
    const halfLength = (TRAIN_LENGTH_SCALE_FACTOR * metroNetwork.lineWidth) / 2;

    const topLeft = new paper.Point(x - halfWidth, y - halfLength);
    const bottomRight = new paper.Point(x + halfWidth, y + halfLength);

    const train = new paper.Path.Rectangle(topLeft, bottomRight);
    train.rotate(initialRotation);
    train.fillColor = color;
    return train;
}

/** Draws a station. */
function drawStation(station, color) {
    const center = new paper.Point(station.x, station.y);
    const circle = new paper.Path.Circle(center, metroNetwork.lineWidth * 0.2);
    circle.fillColor = "black";
    circle.strokeColor = "white";
}

/** Draws a straight line segment. */
function drawStraightLineSegment(lineSegment, color) {
    // dx and dy extend all straight line segments by 1 pixel in either direction.
    // Otherwise, it will appear like there are tiny gaps between segments.
    const dx = Math.sign(lineSegment.p1.x - lineSegment.p0.x);
    const dy = Math.sign(lineSegment.p1.y - lineSegment.p0.y);

    const p0 = new paper.Point(lineSegment.p0.x - dx, lineSegment.p0.y - dy);
    const p1 = new paper.Point(lineSegment.p1.x + dx, lineSegment.p1.y + dy);

    const paperLineSegment = new paper.Path();
    paperLineSegment.add(p0);
    paperLineSegment.add(p1);

    paperLineSegment.strokeColor = color;
    paperLineSegment.strokeWidth = metroNetwork.lineWidth;
}

/** Draws a Bezier line segment. */
function drawBezierLineSegment(lineSegment, color) {
    // paper.js does not allow you to define cubic Bezier curves directly.
    // You have to instead define each endpoint as a Segment object.
    const p0 = new paper.Point(lineSegment.p0.x, lineSegment.p0.y);
    const p3 = new paper.Point(lineSegment.p3.x, lineSegment.p3.y);

    const p1OffsetFromP0 = new paper.Point(lineSegment.p1.x - p0.x, lineSegment.p1.y - p0.y);
    const p2OffsetFromP3 = new paper.Point(lineSegment.p2.x - p3.x, lineSegment.p2.y - p3.y);
    const noOffset = new paper.Point(0, 0);

    // paper.js Segments use offsets for handle points.
    const p0Segment = new paper.Segment(p0, noOffset, p1OffsetFromP0);
    const p3Segment = new paper.Segment(p3, p2OffsetFromP3, noOffset);

    const paperLineSegment = new paper.Path();
    paperLineSegment.add(p0Segment);
    paperLineSegment.add(p3Segment);

    paperLineSegment.strokeColor = color;
    paperLineSegment.strokeWidth = metroNetwork.lineWidth;

    // Covers up gaps between adjacent bezier segments of dependent curves. todo: work with R script to potentially remove
    // Also between truncated Bezier curves and other segments.
    const circ1 = new paper.Path.Circle(p0, metroNetwork.lineWidth/2);
    circ1.fillColor = color;
    const circ2 = new paper.Path.Circle(p3, metroNetwork.lineWidth/2);
    circ2.fillColor = color;
}

/** Draws a line segment. */
function drawLineSegment(lineSegment, color) {
    if (lineSegment.straightLine) {
        drawStraightLineSegment(lineSegment, color);
    } else {
        drawBezierLineSegment(lineSegment, color);
    }
}

/** Draws an edge between two stations. */
function drawEdge(edge, color) {
    edge.lineSegments.forEach(lineSegment => drawLineSegment(lineSegment, color));
}

/** Draws a line in the metro network. */
function drawMetroLine(metroLine) {
    metroLine.edges.forEach(edge => drawEdge(edge, metroLine.color));
    metroLine.endpointLineSegments.forEach(lineSegment => drawLineSegment(lineSegment, metroLine.color));
    metroLine.stations.forEach(station => drawStation(station, metroLine.color));
}

/** Draws all lines in the metro network. */
function drawMetroLines() {
    const metroLines = Array.from(metroNetwork.metroLines, ([_, metroLine]) => metroLine);
    metroLines.sort((line1, line2) => line1.zIndex - line2.zIndex);
    metroLines.forEach(line => drawMetroLine(line));
}

export { createTrain, drawMetroLines };