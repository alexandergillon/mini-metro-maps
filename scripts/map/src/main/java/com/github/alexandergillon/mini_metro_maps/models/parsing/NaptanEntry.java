package com.github.alexandergillon.mini_metro_maps.models.parsing;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Class for a NAPTAN entry in naptan.json, for parsing with Jackson. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NaptanEntry {
    /** Name of the station. */
    private String name;

    /** NAPTAN ID of that station. */
    private String naptanId;
}
