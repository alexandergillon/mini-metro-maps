package com.github.alexandergillon.mini_metro_maps.models;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Class for a station in the output file, for writing with Jackson. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OutputStation {

    /** Name of the station's metro line. */
    private String metroLine;

    /** Name of the station. */
    private String name;

    /** Unique identifier for the station. */
    private String id;

    /** X coordinate of the station. */
    private int x;

    /** Y coordinate of the station. */
    private int y;

}
