package com.github.alexandergillon.mini_metro_maps.models.bezier;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Class for a straight line with endpoints p0, p1, for writing with Jackson. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StraightLine {
    private Point p0;
    private Point p1;
}
