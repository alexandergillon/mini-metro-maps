package com.github.alexandergillon.mini_metro_maps.models.core;

import com.github.alexandergillon.mini_metro_maps.models.bezier.Point;
import lombok.Getter;
import lombok.Setter;

import java.util.Objects;

/** Represents a station. */
@Getter
public class Station {

    /** The name of the metro line that this station is a part of. */
    private final String metroLineName;

    /** The name of this station. */
    private final String name;

    /** Unique identifier for this station. */
    private final String id;

    /** Original x coordinate of this station, from the input file. */
    private final int originalX;

    /** Original y coordinate of this station, from the input file. */
    private final int originalY;

    /** X coordinate of this station, as solved by AMPL. -1 until solved. */
    @Setter
    private int solvedX = -1;

    /** Y coordinate of this station, as solved by AMPL. -1 until solved. */
    @Setter
    private int solvedY = -1;

    /** Whether this station is real, or is an alignment point for special curves. */
    private final boolean alignmentPoint;

    public Station(String metroLineName, String name, String naptan, int x, int y, boolean alignmentPoint) {
        this.metroLineName = metroLineName;
        this.name = name;

        this.id = String.format("%s_%s", metroLineName, naptan);

        this.originalX = x;
        this.originalY = y;

        this.alignmentPoint = alignmentPoint;
    }

    /** Converts the solved coordinates in this Station to a Point. */
    public Point toPoint() {
        if (solvedX == -1 && solvedY == -1) {
            throw new IllegalStateException("Station.toPoint() called before coordinates have been solved.");
        }

        return new Point(solvedX, solvedY);
    }

    @Override
    public String toString() {
        return String.format("%s line station %s (%s)", metroLineName, name, id);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Station station = (Station) o;
        return originalX == station.originalX
                && originalY == station.originalY
                && solvedX == station.solvedX
                && solvedY == station.solvedY
                && Objects.equals(metroLineName, station.metroLineName)
                && Objects.equals(name, station.name)
                && Objects.equals(id, station.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(metroLineName, name, id, originalX, originalY, solvedX, solvedY);
    }
}
