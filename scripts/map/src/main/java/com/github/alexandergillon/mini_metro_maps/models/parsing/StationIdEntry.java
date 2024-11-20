package com.github.alexandergillon.mini_metro_maps.models.parsing;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Class for a station ID entry in the station ID JSON file, for parsing with Jackson. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StationIdEntry {

    /** Name of the station. */
    private String name;

    /** Name of the station's metro line. */
    private String metroLine;

    /** ID of that station. */
    private String id;
}
