package com.github.alexandergillon.mini_metro_maps.models.core;

/** POJO to hold information about an alignment constraint. */
public record AlignmentConstraint(String constraintText, MetroLine metroLine, int textLineNumber) { }
