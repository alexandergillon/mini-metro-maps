package com.github.alexandergillon.mini_metro_maps.models.output;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/** Class for a metro line in the output file, for writing with Jackson. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OutputMetroLine {

    /** Name of the metro line. */
    private String name;

    /** Color of this line, as a hex string. E.g. #E1251B. */
    private String color;

    /** z index of this line. Value is meaningless - only differences between z indices have meaning. */
    @JsonProperty("zIndex") // Needed due to Jackson internals - getter is getZIndex, which Jackson interprets as 'zindex' (not 'zIndex')
    private int zIndex;

    /** Stations in the metro line. */
    private List<OutputStation> stations;

    /** Edges in the metro line. */
    private List<OutputEdge> edges;

    /** Line segments of endpoints on the line. */
    private List<OutputLineSegment> endpointLineSegments;

}
