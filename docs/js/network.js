/**
 * Class to hold the metro network. Takes in information about the network from the JSON file,
 * and extends it with additional functionality.
 */
class MetroNetwork {
    constructor(json) {
        this.lineWidth = json.lineWidth;
        this.maxX = json.maxX;
        this.maxY = json.maxY;
        this.metroLines = json.metroLines;
        this.edgeMapping = MetroNetwork.buildEdgeMapping(json.metroLines);
    }

    /** Builds a 2D mapping of edges. I.e. edgeMapping[station1][station2] is the edge between the two stations. */
    static buildEdgeMapping(metroLines) {
        const edgeMapping = new Map();

        for (const lineName in metroLines) {
            for (const edge of metroLines[lineName].edges) {
                for (const [station, otherStation] of [[edge.station1Id, edge.station2Id],
                                                       [edge.station2Id, edge.station1Id]]) {

                    if (edgeMapping.get(station) === undefined) {
                        edgeMapping.set(station, new Map());
                    }
                    edgeMapping.get(station).set(otherStation, edge);

                }
            }
        }

        return edgeMapping;
    }
}

export { MetroNetwork };