package com.github.alexandergillon.mini_metro_maps.models.core;

/** POJO to hold information about a constraint. */
public record Constraint (String constraintText, MetroLine metroLine, int textLineNumber) { }
