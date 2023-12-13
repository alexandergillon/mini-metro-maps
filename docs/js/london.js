import { drawStations } from "./drawing.js";

function pan(event) {
    const delta = event.downPoint.subtract(event.point);
    paper.view.translate(delta.multiply(-1));
}

function zoom(event) {
    event.preventDefault();
    if (event.deltaY < 0) {
        // up
        paper.view.scale(1.25);
    } else if (event.deltaY > 0) {
        // down
        paper.view.scale(0.8);
    }
}

async function registerEventHandlers(canvas) {
    const tool = new paper.Tool();
    tool.onMouseDrag = pan;

    canvas.addEventListener("wheel", zoom);
}


async function fetchJson() {
    const json_response = await fetch("stations.json");
    return await json_response.json();
}



async function setupCanvas() {
    const canvas = document.getElementById("mapCanvas");
    paper.setup(canvas);

    registerEventHandlers(canvas);

    const json = await fetchJson();
    drawStations(json);
    paper.view.draw();
}


setupCanvas();
