package com.github.alexandergillon.mini_metro_maps.models.output;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/** Class for an edge between two stations in the output file, for writing with Jackson. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OutputEdge {

    /** Identifier of the first station in the edge. */
    private String station1Id;

    /** Identifier of the second station in the edge. */
    private String station2Id;

    /** Line segments which make up the edge. */
    private List<OutputLineSegment> lineSegments;

}
