/** Draws a line in the metro network. */
function drawLine(metroLine) {
    metroLine.stations.forEach(station => {
        const center = new paper.Point(station.x, station.y);
        const circle = new paper.Path.Circle(center, 15);
        circle.fillColor = "black";
    })
}

/** Draws the metro network. */
function drawNetwork(metroNetwork) {
    metroNetwork.forEach(drawLine);
}

export { drawNetwork };