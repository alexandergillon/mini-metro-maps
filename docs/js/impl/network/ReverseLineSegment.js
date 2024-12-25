/** Class that provides a reversed 'view' of a line segment. */
export class ReverseLineSegment {
    constructor(lineSegment) {
        this.lineSegment = lineSegment;
    }
    get length() {
        return this.lineSegment.length;
    }
    get reverse() {
        return this.lineSegment;
    }
    draw() {
        this.lineSegment.draw();
    }
    hide() {
        this.lineSegment.hide();
    }
    samplePoint(distance) {
        return this.lineSegment.samplePoint(this.length - distance);
    }
    toString() {
        return `Reverse line segment of ${this.lineSegment}`;
    }
}
