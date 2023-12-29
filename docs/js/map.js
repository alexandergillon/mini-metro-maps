import { drawMetroLines } from "./drawing.js";
import { setGetData, updateTrains } from "./trains.js";
import { metroNetwork, setMetroNetwork } from "./network.js";

/** Time between updates of train data, in seconds. */
const UPDATE_INTERVAL = 15;

/** JS module for the specific city being displayed. Has functionality to retrieve data from the appropriate transit API. */
let cityModule;

/**
 * Padding around the map is defined as a multiple of line width, to handle padding automatically when the scale of
 * the map changes.
 */
const PADDING_SCALE_FACTOR = 20;

let minPanningX;  // min x that the user can pan to
let minPanningY;  // min y that the user can pan to
let maxPanningX;  // max x that the user can pan to
let maxPanningY;  // max y that the user can pan to

/**
 * Note: all x and y here are in the underlying coordinate space - they do NOT refer to the x and y positions of pixels
 * on the user's screen.
 *
 * Updates maximum x and y that the user can pan to (i.e. bounds of the pannable area). Max x and y are dynamic, and
 * depend on current zoom level (which is implicitly measured through paper.view.bounds.height and paper.view.bounds.width)
 * - this means that the padding does not look too small when zoomed out very far, or too big when zoomed in too close.
 *
 * It also ensures that we can actually zoom out all the way to see the whole map, as we call this function AFTER a
 * zoom occurs, and this function sets the bounds on panning to be at least as big as the current canvas. I.e. if the
 * user was allowed to zoom out, then their screen will certainly be in bounds, as we force it to be here.
 *
 * By then controlling when we allow a zoom, we can let the user keep zooming out until the whole map is in frame - when
 * it is all in frame, we can disable zooming, and the bounds of the canvas will stay constant (until they zoom in again).
 */
function updatePannableArea() {
    const canvasHeight = paper.view.bounds.height; // canvas height, in coordinate space
    const canvasWidth = paper.view.bounds.width;   // canvas width, in coordinate space

    // 0 in the Math.max() ensures that the bound are at least as big as the underlying map, plus some.
    // canvasWidth-originalMaxX ensures that the bounds are at least as big as what the user can actually see right now, plus some.
    const horizontalPadding = (Math.max(0, canvasWidth-metroNetwork.width) + PADDING_SCALE_FACTOR * metroNetwork.lineWidth) / 2;
    const verticalPadding = (Math.max(0, canvasHeight-metroNetwork.height) + PADDING_SCALE_FACTOR * metroNetwork.lineWidth) / 2;

    minPanningX = metroNetwork.minX - horizontalPadding;
    minPanningY = metroNetwork.minY - verticalPadding;
    maxPanningX = metroNetwork.maxX + horizontalPadding;
    maxPanningY = metroNetwork.maxY + verticalPadding;
}

/** Moves the 'camera' back in bounds, if it is out of bounds. */
function restoreBounds() {
    const bounds = paper.view.bounds;

    if (bounds.x < minPanningX) {
        paper.view.translate(bounds.x - minPanningX, 0);
    } else if (bounds.x + bounds.width > maxPanningX) {
        paper.view.translate(bounds.x + bounds.width - maxPanningX, 0);
    }

    if (bounds.y < minPanningY) {
        paper.view.translate(0, bounds.y - minPanningY);
    } else if (bounds.y + bounds.height > maxPanningY) {
        paper.view.translate(0, bounds.y + bounds.height - maxPanningY);
    }
}

/**
 * Pans the canvas in response to a mouse drag event.
 * @param event A paper.js ToolEvent, supplied by paper.js when the mouse is dragged.
 */
function pan(event) {
    const delta = event.point.subtract(event.downPoint);
    paper.view.translate(delta);
    restoreBounds(maxPanningX, maxPanningY);
}

/**
 * Zooms the canvas in response to a mouse scroll event.
 * @param event A WheelEvent, supplied by the browser when the mouse wheel is scrolled.
 */
function zoom(event) { // todo: zoom in limit
    event.preventDefault();
    if (event.deltaY < 0) { // scroll up
        paper.view.scale(1.25); // todo: define constant
    } else if (event.deltaY > 0) { // scroll down
        if (paper.view.bounds.width >= maxPanningX && paper.view.bounds.height >= maxPanningY) {
            return; // everything is visible - don't allow further zoom out
        }

        paper.view.scale(0.8);
    }
    updatePannableArea();
    restoreBounds(maxPanningX, maxPanningY);
}

/** Resizes the canvas when the window is resized. */
function resizeCanvas(event) {
    paper.view.viewSize = new paper.Size(window.innerWidth, window.innerHeight);
}


/**
 * Registers event listeners with the browser/paper.js to handle user interaction.
 * @param canvas The canvas to register event listeners on.
 */
function registerEventListeners(canvas) {
    const tool = new paper.Tool();
    tool.onMouseDrag = pan;
    canvas.addEventListener("wheel", zoom);
    window.addEventListener("resize", resizeCanvas);
    setInterval(updateTrains, UPDATE_INTERVAL * 1000);
}

/**
 * Fetches the JSON file which describes the metro network. Stores the JSON, parsed as a JS object, into the
 * metroNetwork variable.
 * @param jsonPath Path to the JSON file which describes the metro network.
 */
async function fetchMetroNetwork(jsonPath) {
    const response = await fetch(jsonPath);
    setMetroNetwork(await response.json());
}

/**
 * Fetches the JS function which gets data from the public transit API. Stores the function in the getData variable.
 * @param jsPath Path to the JS module which exports the getData() function.
 */
async function fetchApiFunction(jsPath) {
    cityModule = await import(jsPath);
    setGetData(cityModule.getData);
}

/**
 * Fetches the dependencies required for the map to work. This includes the JSON file which describes the metro network,
 * and the JS file which fetches data from the appropriate transit API.
 */
async function fetchDependencies() {
    // todo: error handling
    const urlParameters = new URLSearchParams(window.location.search);
    const city = urlParameters.get("city"); // todo: validate

    const jsonPath = `data/${city}.json`;
    const jsPath = `../js/cities/${city}.js`;

    await Promise.all([fetchMetroNetwork(jsonPath), fetchApiFunction(jsPath)]);

    const metroLineNames = Object.getOwnPropertyNames(metroNetwork.metroLines)
    cityModule.setLines(metroLineNames);
}

/**
 * Sets up the canvas. Registers the canvas with the paper object, registers event listeners, and draws the metro
 * network.
 */
async function setupCanvas() {
    const canvas = document.getElementById("mapCanvas");
    paper.setup(canvas);
    resizeCanvas();

    await fetchDependencies();

    updatePannableArea();
    registerEventListeners(canvas);
    drawMetroLines();

    // center the map to start
    paper.view.translate(- metroNetwork.width / 2, - metroNetwork.height / 2);
    paper.view.draw();
}

setupCanvas();
