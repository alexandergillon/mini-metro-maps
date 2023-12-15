import { drawMetroLines } from "./drawing.js";

/**
 * Padding around the map is defined as a multiple of line width, to handle padding automatically when the scale of
 * the map changes.
 */
const PADDING_SCALE_FACTOR = 20;

let lineWidth;    // line width, in pixels (actually, +1 is used, but this
let maxStationX;  // x coordinate of the furthest right station
let maxStationY;  // y coordinate of the furthest down station

let minPanningX;         // min x that the user can pan to
let minPanningY;         // min y that the user can pan to
let maxPanningX;         // max x that the user can pan to
let maxPanningY;         // max y that the user can pan to

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
    const horizontalPadding = (Math.max(0, canvasWidth-maxStationX) + PADDING_SCALE_FACTOR * lineWidth) / 2;
    const verticalPadding = (Math.max(0, canvasHeight-maxStationY) + PADDING_SCALE_FACTOR * lineWidth) / 2;

    // minStationX = minStationY = 0, which we take as given about the station locations passed to us.
    minPanningX = -horizontalPadding;
    minPanningY = -verticalPadding;
    maxPanningX = maxStationX + horizontalPadding;
    maxPanningY = maxStationY + verticalPadding;
}

/** Moves the 'camera' back in bounds, if it is out of bounds. */
function restoreBounds() {
    const bounds = paper.view.bounds;

    if (bounds.x < minPanningX) {
        paper.view.translate(new paper.Point(bounds.x - minPanningX, 0));
    } else if (bounds.x + bounds.width > maxPanningX) {
        paper.view.translate(new paper.Point(bounds.x + bounds.width - maxPanningX, 0));
    }

    if (bounds.y < minPanningY) {
        paper.view.translate(new paper.Point(0, bounds.y - minPanningY));
    } else if (bounds.y + bounds.height > maxPanningY) {
        paper.view.translate(new paper.Point(0, bounds.y + bounds.height - maxPanningY));
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
function zoom(event) {
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
    const json = await fetch("london.json");
    return await json.json();
}

/**
 * Sets up the canvas. Registers the canvas with the paper object, registers event listeners, and draws the metro
 * network.
 */
async function setupCanvas() {
    const canvas = document.getElementById("mapCanvas");
    paper.setup(canvas);

    const metroNetwork = await fetchMetroNetwork();

    // We add 1 to the line width given to us, or otherwise there are small gaps between parallel lines (as paper.js
    // doesn't know what to do in the middle of two parallel but non-overlapping lines). This means that every parallel
    // set of lines is now slightly overlapping, but with only 1 pixel this is unnoticeable for fairly large line width.
    lineWidth = metroNetwork.lineWidth + 1;
    maxStationX = metroNetwork.maxX;
    maxStationY = metroNetwork.maxY;

    updatePannableArea();
    registerEventListeners(canvas);
    drawMetroLines(metroNetwork.metroLines, lineWidth);

    paper.view.translate(new paper.Point(-maxStationX / 2, -maxStationY / 2)); // center the map to start
    paper.view.draw();
}

setupCanvas();
