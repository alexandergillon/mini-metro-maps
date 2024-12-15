/**
 * @file Functionality relating to the paper.js canvas.
 *
 * Note: all x and y here are in the underlying coordinate space - they do NOT refer to the x and y positions of pixels
 * on the user's screen.
 */
/** Class to manage the paper.js canvas. */
export class Canvas {
    /**
     * Constructor. Registers event listeners with the browser/paper.js to handle user interaction.
     * @param metroNetwork The metro network, for width and height information.
     * @param canvas The canvas to register event listeners on.
     */
    constructor(metroNetwork, canvas) {
        const tool = new paper.Tool();
        tool.onMouseDrag = this.pan;
        canvas.addEventListener("wheel", this.zoom);
        window.addEventListener("resize", this.resizeCanvas);
        this.minPanningX = this.minPanningY = this.maxPanningX = this.maxPanningY = 0; // will be re-assigned by updatePannableArea()
        this.resizeCanvas();
        this.updatePannableArea();
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
    updatePannableArea() {
        const canvasHeight = paper.view.bounds.height; // canvas height, in coordinate space
        const canvasWidth = paper.view.bounds.width; // canvas width, in coordinate space
        // 0 in the Math.max() ensures that the bound are at least as big as the underlying map, plus some.
        // canvasWidth-originalMaxX ensures that the bounds are at least as big as what the user can actually see right now, plus some.
        const horizontalPadding = (Math.max(0, canvasWidth - this.metroNetwork.width)
            + Canvas.PADDING_SCALE_FACTOR * this.metroNetwork.lineWidth) / 2;
        const verticalPadding = (Math.max(0, canvasHeight - this.metroNetwork.height)
            + Canvas.PADDING_SCALE_FACTOR * this.metroNetwork.lineWidth) / 2;
        this.minPanningX = this.metroNetwork.minX - horizontalPadding;
        this.minPanningY = this.metroNetwork.minY - verticalPadding;
        this.maxPanningX = this.metroNetwork.maxX + horizontalPadding;
        this.maxPanningY = this.metroNetwork.maxY + verticalPadding;
    }
    /** Moves the 'camera' back in bounds, if it is out of bounds. */
    restoreBounds() {
        const bounds = paper.view.bounds;
        if (bounds.x < this.minPanningX) {
            paper.view.translate(bounds.x - this.minPanningX, 0);
        }
        else if (bounds.x + bounds.width > this.maxPanningX) {
            paper.view.translate(bounds.x + bounds.width - this.maxPanningX, 0);
        }
        if (bounds.y < this.minPanningY) {
            paper.view.translate(0, bounds.y - this.minPanningY);
        }
        else if (bounds.y + bounds.height > this.maxPanningY) {
            paper.view.translate(0, bounds.y + bounds.height - this.maxPanningY);
        }
    }
    /**
     * Pans the canvas in response to a mouse drag event.
     * @param event A paper.js ToolEvent, supplied by paper.js when the mouse is dragged.
     */
    pan(event) {
        const delta = event.point.subtract(event.downPoint);
        paper.view.translate(delta);
        this.restoreBounds();
    }
    /**
     * Zooms the canvas in response to a mouse scroll event.
     * @param event A WheelEvent, supplied by the browser when the mouse wheel is scrolled.
     */
    zoom(event) {
        event.preventDefault();
        if (event.deltaY < 0) { // scroll up
            paper.view.scale(1.25); // todo: define constant
        }
        else if (event.deltaY > 0) { // scroll down
            if (paper.view.bounds.width >= this.maxPanningX && paper.view.bounds.height >= this.maxPanningY) {
                return; // everything is visible - don't allow further zoom out
            }
            paper.view.scale(0.8);
        }
        this.updatePannableArea();
        this.restoreBounds();
    }
    /** Resizes the canvas when the window is resized. */
    resizeCanvas() {
        paper.view.viewSize = new paper.Size(window.innerWidth, window.innerHeight);
    }
}
/** Padding around the map is defined as a multiple of line width, to handle padding automatically when the scale of the map changes. */
Canvas.PADDING_SCALE_FACTOR = 20;
