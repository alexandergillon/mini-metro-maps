/**
 * Class for a path between two stations. A path consists of multiple adjacent edges, and a position somewhere among
 * these edges. The position is determined by an edge index, a segment index, and a parameter value. For example,
 * if the following are the edges in a path (where 'O' is a station):
 *
 *     edge 0          edge 1
 *   segment 0    |--segment 0--|  |---------\
 * O ---------- O -----------------------\    \   edge 1
 *                                        \    \    segment 1
 *                                         \    \
 *                                          \    ==
 *                                           \    \
 *                                            \    \   edge 1
 *                                             \    \   segment 2
 *                                              \    \
 *                                               \    \
 *                                                \   --
 *                                                 O
 *                                                  \    edge 2
 *                                                   \    segment 0
 *                                                    \
 *                                                     \
 *                                                      O
 *
 * Then with edge index = 1, segment index = 2, parameter value = 0.5, the position on the path would be roughly at the X:
 *
 *    edge 0          edge 1
 *   segment 0    |--segment 0--|  |---------\
 * O ---------- O -----------------------\    \   edge 1
 *                                        \    \    segment 1
 *                                         \    \
 *                                          \    ==
 *                                           \    \
 *                                            \    \   edge 1
 *                                             X    \   segment 2
 *                                              \    \
 *                                               \    \
 *                                                \   --
 *                                                 O
 *                                                  \    edge 2
 *                                                   \    segment 0
 *                                                    \
 *                                                     \
 *                                                      O
 *
 * See comments below for more info on parameter value.
 *
 * We need paths as some trains may skip stations, hence traversing multiple edges when going from one station to another.
 */
export class PathImpl {
    /**
     * Constructor. Creates a Path, with position initialized to the beginning.
     * @param edges Edges to be included within the path.
     */
    constructor(edges) {
        // Validate that the edges make sense
        for (let i = 0; i < edges.length - 1; i++) {
            const edge = edges[i];
            const nextEdge = edges[i + 1];
            if (edge.station2 !== nextEdge.station1) {
                const edgesStr = edges.map((e, index) => `    ${index}\t${e}`).join("\n");
                throw new Error(`Path initialized with edges ${i} and ${i + 1} that do not connect:\n${edgesStr}`);
            }
        }
        this.edges = edges;
        this.edgeIndex = 0;
        this.edgeDistance = 0;
        this.length = edges.map(edge => edge.length).reduce((l1, l2) => l1 + l2);
        this.finished = false;
    }
    /** Samples a point at the current position in the path. */
    samplePoint() {
        return this.edges[this.edgeIndex].samplePoint(this.edgeDistance);
    }
    /**
     * Moves the position on this Path by a non-negative distance. If the end of the path is exceeded, the position
     * returned will be the endpoint.
     * @param distance Distance to move along the path. Must be non-negative.
     * @return Whether the path is finished after the move, and the new position on the path.
     */
    move(distance) {
        if (distance < 0) {
            throw new Error(`Tried to move path by negative distance ${distance}`);
        }
        if (this.finished) {
            return [true, this.samplePoint()];
        }
        const currentEdge = this.edges[this.edgeIndex];
        if (this.edgeDistance + distance > currentEdge.length) {
            // Moves into next edge, or is finished
            const edgeDistanceRemaining = currentEdge.length - this.edgeDistance;
            this.edgeDistance = distance - edgeDistanceRemaining; // The new edge distance is the excess remaining after finishing the current edge
            this.edgeIndex++;
            if (this.edgeIndex >= this.edges.length) {
                // Finished - move back to the last edge
                this.edgeIndex--;
                this.edgeDistance = this.edges[this.edgeIndex].length;
                this.finished = true;
                return [true, this.samplePoint()];
            }
            else {
                return [false, this.samplePoint()];
            }
        }
        else {
            // Moving stays within current edge - move and return sample point
            this.edgeDistance += distance;
            return [false, this.samplePoint()];
        }
    }
}
