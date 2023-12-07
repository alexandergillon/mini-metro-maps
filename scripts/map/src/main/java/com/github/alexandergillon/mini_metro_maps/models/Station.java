package com.github.alexandergillon.mini_metro_maps.models;

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

    /** Unique identifier for this station, for AMPL. */
    private final String amplUniqueId;

    /** Original x coordinate of this station, from the input file. */
    private final int originalX;

    /** Original y coordinate of this station, from the input file. */
    private final int originalY;

    /** X coordinate of this station, as solved by AMPL. -1 until solved. */
    @Setter
    private int solvedX;

    /** Y coordinate of this station, as solved by AMPL. -1 until solved. */
    @Setter
    private int solvedY;

    public Station(String metroLineName, String name, String naptan, int x, int y) {
        this.metroLineName = metroLineName;
        this.name = name;
        this.amplUniqueId = metroLineName.replace('-', '_') + "_" + naptan;

        this.originalX = x;
        this.originalY = y;

        this.solvedX = -1;
        this.solvedY = -1;
    }

    @Override
    public String toString() {
        return String.format("%s line station %s (%s)", metroLineName, name, amplUniqueId);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Station station = (Station) o;
        return originalX == station.originalX && originalY == station.originalY && Objects.equals(metroLineName, station.metroLineName) && Objects.equals(amplUniqueId, station.amplUniqueId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(metroLineName, amplUniqueId, originalX, originalY);
    }
}
