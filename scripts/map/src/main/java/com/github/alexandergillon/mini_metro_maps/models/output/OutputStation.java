package com.github.alexandergillon.mini_metro_maps.models.output;

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

    /** Unique identifier for the station. */
    private String id;

    /** Name of the station. */
    private String name;

    /** X coordinate of the station. */
    private int x;

    /** Y coordinate of the station. */
    private int y;

}
