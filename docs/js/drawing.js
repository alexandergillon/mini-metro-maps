function drawStations(json) {
    json.forEach(station => {
        const center = new paper.Point(station.x, station.y);
        const circle = new paper.Path.Circle(center, 5);
        circle.fillColor = "black";
    });
}

export { drawStations };