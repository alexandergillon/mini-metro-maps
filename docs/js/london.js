import { drawStations } from "./drawing.js";

/**
 * Pans the canvas in response to a mouse drag event.
 * @param event A paper.js ToolEvent, supplied by paper.js when the mouse is dragged.
 */
function pan(event) {
    const delta = event.point.subtract(event.downPoint);
    paper.view.translate(delta);
}

/**
 * Zooms the canvas in response to a mouse scroll event.
 * @param event A WheelEvent, supplied by the browser when the mouse wheel is scrolled.
 */
function zoom(event) {
    event.preventDefault();
    if (event.deltaY < 0) { // scroll up
        paper.view.scale(1.25); // todo: define constant
    } else if (event.deltaY > 0) { // scroll down
        paper.view.scale(0.8);
    }
}

/**
 * Registers event listeners with the browser/paper.js to handle user interaction.
 * @param canvas The canvas to register event listeners on.
 */
function registerEventListeners(canvas) {
    const tool = new paper.Tool();
    tool.onMouseDrag = pan;
    canvas.addEventListener("wheel", zoom);
}

/**
 * Fetches the JSON file which describes the metro network.
 * @return {Promise<any>} The JSON file, parsed as a JS object.
 */
async function fetchMetroNetwork() {
    const json = await fetch("stations.json"); // todo: rename
    return await json.json();
}

/**
 * Sets up the canvas. Registers the canvas with the paper object, registers event listeners, and draws the metro
 * network.
 */
async function setupCanvas() {
    const canvas = document.getElementById("mapCanvas");
    paper.setup(canvas);

    registerEventListeners(canvas);

    const metroNetwork = await fetchMetroNetwork();
    drawStations(metroNetwork);
    paper.view.draw();
}

setupCanvas();
