// import { Bezier } from "./lib/bezierjs/bezier.js";
//
// /**
//  * Class for a path between two stations. A path consists of multiple adjacent edges, and a position somewhere among
//  * these edges. The position is determined by an edge index, a segment index, and a parameter value. For example,
//  * if the following are the edges in a path (where 'O' is a station):
//  *
//  *     edge 0          edge 1
//  *   segment 0    |--segment 0--|  |---------\
//  * O ---------- O -----------------------\    \   edge 1
//  *                                        \    \    segment 1
//  *                                         \    \
//  *                                          \    ==
//  *                                           \    \
//  *                                            \    \   edge 1
//  *                                             \    \   segment 2
//  *                                              \    \
//  *                                               \    \
//  *                                                \   --
//  *                                                 O
//  *                                                  \    edge 2
//  *                                                   \    segment 0
//  *                                                    \
//  *                                                     \
//  *                                                      O
//  *
//  * Then with edge index = 1, segment index = 2, parameter value = 0.5, the position on the path would be roughly at the X:
//  *
//  *    edge 0          edge 1
//  *   segment 0    |--segment 0--|  |---------\
//  * O ---------- O -----------------------\    \   edge 1
//  *                                        \    \    segment 1
//  *                                         \    \
//  *                                          \    ==
//  *                                           \    \
//  *                                            \    \   edge 1
//  *                                             X    \   segment 2
//  *                                              \    \
//  *                                               \    \
//  *                                                \   --
//  *                                                 O
//  *                                                  \    edge 2
//  *                                                   \    segment 0
//  *                                                    \
//  *                                                     \
//  *                                                      O
//  *
//  * See comments below for more info on parameter value.
//  *
//  * We need paths as some trains may skip stations, hence traversing multiple edges when going from one station to another.
//  */
// class Path {
//     /** Edges in this path. */
//     edges: Edge[];
//
//     /** Index of the current edge that a train is at in the path. */
//     edgeIndex: number;
//
//     /** Index of the current segment in the current edge. */
//     segmentIndex: number;
//
//     /**
//      * Parameter value of the current segment. For straight line segments, this is how far the train is along the
//      * segment, as a proportion. For Bezier line segments, this is the t value for the Bezier curve.
//      */
//     parameterValue: number;
//
//     /** Length of the entire path. */
//     length: number;
//
//     /** Whether this path is finished. */
//     finished: boolean;
//
//     /** Creates a Path, with position initialized to the beginning of the edges. */
//     constructor(edges: Edge[]) {
//         this.edges = edges;
//         this.edgeIndex = 0;
//         this.segmentIndex = 0;
//         this.parameterValue = 0;
//         this.length = edges.map(edge => edge.length).reduce((l1, l2) => l1 + l2);
//         this.finished = false;
//     }
//
//     /** Samples a point at the current position in the Path. Behavior is unspecified if edge/segment indices are out of bounds. */
//     samplePoint(): Point {
//         const segment = this.edges[this.edgeIndex].lineSegments[this.segmentIndex];
//         if (segment.straightLine) {
//             // Linear interpolation of a straight line.
//             return {
//                 x: segment.p0.x + this.parameterValue * (segment.p1.x - segment.p0.x),
//                 y: segment.p0.y + this.parameterValue * (segment.p1.y - segment.p0.y)
//             };
//         } else {
//             // Sampling Bezier curve at parameter t = this.parameterValue.
//             const t = this.parameterValue;
//             return {
//                 x: Math.pow(1-t, 3) * segment.p0.x
//                     + 3 * Math.pow(1-t, 2) * t * segment.p1.x
//                     + 3 * (1-t) * Math.pow(t, 2) * segment.p2.x
//                     + Math.pow(t, 3) * segment.p3.x,
//
//                 y: Math.pow(1-t, 3) * segment.p0.y
//                     + 3 * Math.pow(1-t, 2) * t * segment.p1.y
//                     + 3 * (1-t) * Math.pow(t, 2) * segment.p2.y
//                     + Math.pow(t, 3) * segment.p3.y
//             };
//         }
//     }
//
//     /**
//      * Advances the position on this Path to the beginning of the next edge.
//      * @return Whether the end of this path was reached by advancing edges. I.e. if this function is called while
//      * the position on the path is in the last edge, and hence there are no more edges.
//      */
//     advanceEdge(): boolean {
//         this.edgeIndex++;
//         this.segmentIndex = 0;
//         return this.edgeIndex >= this.edges.length;
//
//     }
//
//     /**
//      * Advances the position on this Path to the beginning of the next segment.
//      * @return Whether the end of this path was reached by advancing segments. I.e. if this function is called while
//      * the position on the path is in the last edge, on the last segment, and hence there are no more segments.
//      */
//     advanceSegment(): boolean {
//         this.segmentIndex++;
//         this.parameterValue = 0;
//         if (this.segmentIndex >= this.edges[this.edgeIndex].lineSegments.length) {
//             return this.advanceEdge();
//         } else {
//             return false;
//         }
//     }
//
//     /**
//      * Moves the position on this Path by a non-negative distance.
//      * Todo: if this function becomes a bottleneck, consider caching segment and parameter value increment?
//      * Right now, this isn't exact for Bezier segments. This may introduce inaccuracies in animations. TODO: investigate and change
//      * @param distance Distance to move along the path. Must be non-negative.
//      * @return The new position on this path. If the end of the path is exceeded, continues to return the endpoint.
//      */
//     move(distance: number): Point {
//         if (this.finished) return this.samplePoint(); // Finished, do not increment.
//
//         const segment = this.edges[this.edgeIndex].lineSegments[this.segmentIndex];
//         const dParameterValue = distance / segment.length;
//         this.parameterValue += dParameterValue;
//
//         if (this.parameterValue > 1) {
//             // We have advanced past the end of the current segment.
//             this.finished = this.advanceSegment();
//             if (this.finished) {
//                 // Entire path is finished. Set position to endpoint.
//                 this.edgeIndex = this.edges.length - 1;
//                 this.segmentIndex = this.edges[this.edgeIndex].lineSegments.length - 1;
//                 this.parameterValue = 1;
//                 return this.samplePoint();
//             } else {
//                 // Path is not finished - move along the next segment by however much we moved past the end of the current segment.
//                 const excess = (this.parameterValue - 1) * segment.length;
//                 return this.move(excess);
//             }
//         } else {
//             // Still in current segment - return new position.
//             return this.samplePoint();
//         }
//     }
// }
//
// export { metroNetwork, setMetroNetwork, StraightLineSegment, BezierLineSegment, LineSegment, Station, Edge, Path, MetroLine, MetroNetwork };