package com.github.alexandergillon.mini_metro_maps.cities.london;

import com.github.alexandergillon.mini_metro_maps.StationIdReader;

import java.io.IOException;
import java.util.Optional;

/** Class for London-specific station ID overrides. */
public class NaptanReader extends StationIdReader {

    public NaptanReader(String path) throws IOException {
        super(path);
    }

    @Override
    public Optional<String> overrideMapping(String metroLineName, String stationName) {
        switch (stationName) {
            case "Euston (Charing Cross branch)": return Optional.of(lineToNameToId.get("northern").get("Euston") + "_CC");
            case "Euston (Bank branch)": return Optional.of(lineToNameToId.get("northern").get("Euston") + "_B");
            case "Edgware Road (Circle Line) w/ H&C": return Optional.of(lineToNameToId.get("circle").get("Edgware Road (Circle Line)") + "_HC");
            case "Edgware Road (Circle Line) w/ District": return Optional.of(lineToNameToId.get("circle").get("Edgware Road (Circle Line)") + "_D");
            case "Paddington":
                // Paddington is a bit of a mess. TFL StopPoints API returns that the Paddington stop on the Bakerloo
                // line has NAPTAN 940GZZLUPAC, but the TFL Arrivals API gives arrivals at NAPTAN 940GZZLUPAH.
                // See this thread: https://techforum.tfl.gov.uk/t/confused-by-tube-arrivals-at-paddington/1498/19
                if (metroLineName.equals("bakerloo")) {
                    return Optional.of("940GZZLUPAH");
                }
                break; // Else exit switch and don't override.
            case "Neasden":
                // TFL stop data does not give Neasden as a stop, but arrival data has Neasden not infrequently. Easiest to add a stop.
                if (metroLineName.equals("metropolitan")) {
                    return Optional.of(lineToNameToId.get("jubilee").get("Neasden"));
                }
                break; // Else exit switch and don't override.
        }

        return Optional.empty();
    }
}
