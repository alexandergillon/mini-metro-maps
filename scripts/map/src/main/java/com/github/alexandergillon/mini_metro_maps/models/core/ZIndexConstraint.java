package com.github.alexandergillon.mini_metro_maps.models.core;

/** POJO for a z-index constraint between two lines. Means that line `above` must be drawn above line `below`. */
public record ZIndexConstraint (String above, String below) { }
