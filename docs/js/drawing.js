/** Draws a station. */
function drawStation(station, lineWidth, color) {
    const center = new paper.Point(station.x, station.y);
    const circle = new paper.Path.Circle(center, lineWidth * 0.2);
    circle.fillColor = "black";
    circle.strokeColor = "white";
}

/** Draws a straight line segment. */
function drawStraightLineSegment(lineSegment, lineWidth, color) {
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
    paperLineSegment.strokeWidth = lineWidth;
}

/** Draws a Bezier line segment. */
function drawBezierLineSegment(lineSegment, lineWidth, color) {
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
    paperLineSegment.strokeWidth = lineWidth;

    // Covers up gaps between adjacent bezier segments of dependent curves. todo: work with R script to potentially remove
    const circ = new paper.Path.Circle(new paper.Point(lineSegment.p3.x, lineSegment.p3.y), lineWidth/2);
    circ.fillColor = color;
}

/** Draws a line segment. */
function drawLineSegment(lineSegment, lineWidth, color) {
    if (lineSegment.straightLine) {
        drawStraightLineSegment(lineSegment, lineWidth, color);
    } else {
        drawBezierLineSegment(lineSegment, lineWidth, color);
    }
}

/** Draws an edge between two stations. */
function drawEdge(edge, lineWidth, color) {
    edge.lineSegments.forEach(lineSegment => drawLineSegment(lineSegment, lineWidth, color));
}

/** Draws a line in the metro network. */
function drawMetroLine(metroLine, lineWidth) {
    metroLine.edges.forEach(edge => drawEdge(edge, lineWidth, metroLine.color));
    metroLine.endpointLineSegments.forEach(lineSegment => drawLineSegment(lineSegment, lineWidth, metroLine.color));
    metroLine.stations.forEach(station => drawStation(station, lineWidth, metroLine.color));
}

/** Draws all lines in the metro network. */
function drawMetroLines(metroLines, lineWidth) {
    metroLines.sort((line1, line2) => line1.zIndex - line2.zIndex);
    metroLines.forEach(line => drawMetroLine(line, lineWidth));
}

export { drawMetroLines };