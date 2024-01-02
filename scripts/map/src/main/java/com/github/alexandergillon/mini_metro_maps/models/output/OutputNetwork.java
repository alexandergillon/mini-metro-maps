package com.github.alexandergillon.mini_metro_maps.models.output;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/** Class for the entire metro network, with some parameters, for writing with Jackson. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OutputNetwork {

    /** Line width of a metro line, in pixels. */
    private int lineWidth;

    /** Maximum X value, for drawing purposes (essentially edge of the bounding box). */
    private int maxX;

    /** Maximum Y value, for drawing purposes (essentially edge of the bounding box). */
    private int maxY;

    /** Metro lines in the network. */
    private List<OutputMetroLine> metroLines;

}
