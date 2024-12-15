/**
 * @file Functionality relating to the paper.js canvas.
 *
 * Note: all x and y here are in the underlying coordinate space - they do NOT refer to the x and y positions of pixels
 * on the user's screen.
 */

import {MetroNetwork} from "./Types";

declare const paper: paper.PaperScope;

/** Class to manage the paper.js canvas. */
export class PaperCanvas {
    /** The metro network, for width and height information. */
    private readonly metroNetwork: MetroNetwork;
    /** Min X that the user can pan to. */
    private minPanningX: number;
    /** Min Y that the user can pan to. */
    private minPanningY: number;
    /** Max X that the user can pan to. */
    private maxPanningX: number;
    /** Max Y that the user can pan to. */
    private maxPanningY: number;
    /** Padding around the map is defined as a multiple of line width, to handle padding automatically when the scale of the map changes. */
    private static readonly PADDING_SCALE_FACTOR = 20;
    /** Factor to zoom in the map by on mouse scroll. */
    private static readonly ZOOM_IN_FACTOR = 1.25;
    /** Factor to zoom out the map by on mouse scroll. */
    private static readonly ZOOM_OUT_FACTOR = 0.8;
    /** Maximum zoom in proportion. E.g. 0.1 ~= can't zoom in to more than 1/10 of the width/height on screen
     * (not exact due to discrete zoom levels, also may allow zooming in one more level than this boundary). */
    private static readonly MAX_ZOOM_FACTOR = 0.1;

    /**
     * Constructor. Registers event listeners with the browser/paper.js to handle user interaction.
     * @param metroNetwork The metro network, for width and height information.
     * @param canvas The canvas to register event listeners on.
     */
    public constructor(metroNetwork: MetroNetwork, canvas: HTMLCanvasElement) {
        this.metroNetwork = metroNetwork;
        this.minPanningX = this.minPanningY = this.maxPanningX = this.maxPanningY = 0; // will be re-assigned by updatePannableArea()

        // register event listeners
        const tool = new paper.Tool();
        tool.onMouseDrag = this.pan.bind(this);
        canvas.addEventListener("wheel", this.zoom.bind(this));
        window.addEventListener("resize", this.resizeCanvas.bind(this));

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

        if (bounds.x < this.minPanningX) {
            paper.view.translate({x: bounds.x - this.minPanningX, y: 0});
        } else if (bounds.x + bounds.width > this.maxPanningX) {
            paper.view.translate({x: bounds.x + bounds.width - this.maxPanningX, y: 0});
        }

        if (bounds.y < this.minPanningY) {
            paper.view.translate({x: 0, y: bounds.y - this.minPanningY});
        } else if (bounds.y + bounds.height > this.maxPanningY) {
            paper.view.translate({x: 0, y: bounds.y + bounds.height - this.maxPanningY});
        }
    }

    /**
     * Pans the canvas in response to a mouse drag event.
     * @param event A paper.js ToolEvent, supplied by paper.js when the mouse is dragged.
     */
    private pan(event: paper.ToolEvent) {
        const delta = event.point.subtract(event.downPoint);
        paper.view.translate(delta);
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
            paper.view.scale(PaperCanvas.ZOOM_IN_FACTOR);
        }
        // Scroll down - zoom out. Block zoom if everything is already visible.
        else if (event.deltaY > 0 && !(currentWidth >= metroNetworkWidth && currentHeight >= metroNetworkHeight)) {
            paper.view.scale(PaperCanvas.ZOOM_OUT_FACTOR);
        }

        this.updatePannableArea();
        this.restoreBounds();
    }

    /** Resizes the canvas when the window is resized. */
    private resizeCanvas() {
        paper.view.viewSize = new paper.Size(window.innerWidth, window.innerHeight);
    }
}