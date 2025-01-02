/**
 * @file Functionality relating to the paper.js canvas.
 *
 * Note that the view is made up of three layers, from back to front:
 *   1. The map canvas
 *   2. The UI layer
 *   3. The interaction canvas
 *
 * The interaction canvas is the canvas which has all the event listeners attached. This is done so that the UI can
 * sit on top of the map without preventing the user from panning / zooming.
 *
 * Note: all x and y here are in the underlying coordinate space - they do NOT refer to the x and y positions of pixels
 * on the user's screen.
 */

import {MetroNetwork} from "./Types";

/** The global paper object from paper.js. */
declare const paper: paper.PaperScope;

/** Class to manage the paper.js canvas. */
export class PaperCanvas {
    /** The metro network, for width and height information. */
    private readonly metroNetwork: MetroNetwork;
    /** Min X that the user can pan to. */
    private minPanningX: number = 0;
    /** Min Y that the user can pan to. */
    private minPanningY: number = 0;
    /** Max X that the user can pan to. */
    private maxPanningX: number = 0;
    /** Max Y that the user can pan to. */
    private maxPanningY: number = 0;
    /** Zoom amount is determined by ZOOM_FACTOR ** zoomLevel .*/
    private zoomLevel: number = 0;
    /** Paper scope for the interaction layer. See file header for more info. */
    private readonly interactionScope: paper.PaperScope;
    /** Zoom factor - each zoom in multiplies the scale by this. */
    private static readonly ZOOM_FACTOR = 1.25;
    /** Padding around the map is defined as a multiple of line width, to handle padding automatically when the scale of the map changes. */
    private static readonly PADDING_SCALE_FACTOR = 20;
    /** Maximum zoom in proportion. E.g. 0.1 ~= can't zoom in to more than 1/10 of the width/height on screen
     * (not exact due to discrete zoom levels, also may allow zooming in one more level than this boundary). */
    private static readonly MAX_ZOOM_FACTOR = 0.1;

    /**
     * Constructor. Registers event listeners with the browser/paper.js to handle user interaction.
     * @param metroNetwork The metro network, for width and height information.
     */
    public constructor(metroNetwork: MetroNetwork) {
        this.metroNetwork = metroNetwork;

        // set up the interaction canvas
        const mapScope = paper; // save to reactivate later as interactionScope gets activated on creation
        const interactionCanvas = <HTMLCanvasElement>document.getElementById("interactionCanvas")!;
        this.interactionScope = new paper.PaperScope();
        this.interactionScope.setup(interactionCanvas);

        // register event listeners
        const tool = new paper.Tool();
        tool.onMouseDrag = this.pan.bind(this);
        interactionCanvas.addEventListener("wheel", this.zoom.bind(this));
        window.addEventListener("resize", this.resizeCanvas.bind(this));

        // reactivate map canvas for drawing
        mapScope.activate();

        this.updateZoom();
        this.resizeCanvas();
        this.updatePannableArea();

        // center the map to start
        paper.view.translate({x: - metroNetwork.width / 2, y: - metroNetwork.height / 2});
    }

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
    private updatePannableArea() {
        const canvasHeight = paper.view.bounds.height; // canvas height, in coordinate space
        const canvasWidth = paper.view.bounds.width;   // canvas width, in coordinate space

        // 0 in the Math.max() ensures that the bound are at least as big as the underlying map, plus some.
        // canvasWidth-originalMaxX ensures that the bounds are at least as big as what the user can actually see right now, plus some.
        const horizontalPadding = (Math.max(0, canvasWidth-this.metroNetwork.width)
            + PaperCanvas.PADDING_SCALE_FACTOR * this.metroNetwork.lineWidth) / 2;
        const verticalPadding = (Math.max(0, canvasHeight-this.metroNetwork.height)
            + PaperCanvas.PADDING_SCALE_FACTOR * this.metroNetwork.lineWidth) / 2;

        this.minPanningX = this.metroNetwork.minX - horizontalPadding;
        this.minPanningY = this.metroNetwork.minY - verticalPadding;
        this.maxPanningX = this.metroNetwork.maxX + horizontalPadding;
        this.maxPanningY = this.metroNetwork.maxY + verticalPadding;
    }

    /** Moves the 'camera' back in bounds, if it is out of bounds. */
    private restoreBounds() {
        const bounds = paper.view.bounds;

        let x = 0;
        if (bounds.x < this.minPanningX) {
            x = bounds.x - this.minPanningX;
        } else if (bounds.x + bounds.width > this.maxPanningX) {
            x = bounds.x + bounds.width - this.maxPanningX;
        }

        let y = 0;
        if (bounds.y < this.minPanningY) {
            y = bounds.y - this.minPanningY;
        } else if (bounds.y + bounds.height > this.maxPanningY) {
            y = bounds.y + bounds.height - this.maxPanningY;
        }

        paper.view.translate({x: x, y: y});
        this.interactionScope.view.translate({x: x, y: y});
    }

    /**
     * Pans the canvas in response to a mouse drag event.
     * @param event A paper.js ToolEvent, supplied by paper.js when the mouse is dragged.
     */
    private pan(event: paper.ToolEvent) {
        const delta = event.point.subtract(event.downPoint);
        paper.view.translate(delta);
        this.interactionScope.view.translate(delta);
        this.restoreBounds();
    }

    /**
     * Zooms the canvas in response to a mouse scroll event.
     * @param event A WheelEvent, supplied by the browser when the mouse wheel is scrolled.
     */
    private zoom(event: WheelEvent) { // todo: zoom in limit
        event.preventDefault();

        const metroNetworkWidth = this.metroNetwork.width;
        const metroNetworkHeight = this.metroNetwork.height;
        // These are more like 'if we are already zoomed in beyond this, don't allow further zoom' rather than 'you can never zoom in closer than this'
        const minWidth = PaperCanvas.MAX_ZOOM_FACTOR * metroNetworkWidth;
        const minHeight = PaperCanvas.MAX_ZOOM_FACTOR * metroNetworkHeight;
        const currentWidth = paper.view.bounds.width;
        const currentHeight = paper.view.bounds.height;

        // Scroll up - zoom in. Block zoom if too little is visible.
        if (event.deltaY < 0 && !(currentWidth <= minWidth && currentHeight <= minHeight)) {
            this.zoomLevel++;
        }
        // Scroll down - zoom out. Block zoom if everything is already visible.
        else if (event.deltaY > 0 && !(currentWidth >= metroNetworkWidth && currentHeight >= metroNetworkHeight)) {
            this.zoomLevel--;
        }

        this.updateZoom();
        this.updatePannableArea();
        this.restoreBounds();
    }

    /** Updates zoom based on the current zoom level. */
    private updateZoom() {
        const zoom = PaperCanvas.ZOOM_FACTOR ** this.zoomLevel;
        const zoomPoint = new paper.Point(zoom, zoom);
        paper.view.scaling = zoomPoint;
        this.interactionScope.view.scaling = zoomPoint; // keeps the interaction canvas' scale synced, so panning still works
    }

    /** Resizes the canvas when the window is resized. */
    private resizeCanvas() {
        paper.view.viewSize = new paper.Size(window.innerWidth, window.innerHeight);
        this.interactionScope.view.viewSize = paper.view.viewSize;
    }

    public toString() {
        return `PaperCanvas`;
    }
}