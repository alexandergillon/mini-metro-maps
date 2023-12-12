package com.github.alexandergillon.mini_metro_maps.models;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Class for a color entry in colors.json, for parsing with Jackson. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ColorEntry {
    /** Name of the line. */
    private String name;

    /** Color of the line, as a hex string (e.g. #E1251B). */
    private String color;
}
