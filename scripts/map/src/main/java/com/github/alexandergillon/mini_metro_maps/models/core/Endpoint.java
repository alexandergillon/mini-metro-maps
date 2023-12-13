package com.github.alexandergillon.mini_metro_maps.models.core;

import com.github.alexandergillon.mini_metro_maps.GenerateMap;
import com.github.alexandergillon.mini_metro_maps.MathUtil;
import com.github.alexandergillon.mini_metro_maps.models.bezier.Point;
import com.github.alexandergillon.mini_metro_maps.models.bezier.StraightLine;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputLineSegment;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.tuple.Pair;

/** Represents the little 'bar' at the end of a metro line. */
public class Endpoint {

    /** Scale factor: the width of an endpoint is ENDPOINT_SCALE_FACTOR * the width of a metro line. */
    private static final double ENDPOINT_SCALE_FACTOR = 3;

    /** Station that this endpoint is situated at. */
    private final Station station;

    /** Direction of the endpoint. One of "horizontal", "vertical", "up-right", "down-right", "up-left", "down-left". */
    private final String direction;

    /**
     * A modification to an endpoint (may be null). If not null, the endpoint is a half endpoint which extends in the
     * direction given by the modification. If not null, one of: "left", "right", "up", "down", "up-right", "down-right",
     * "up-left", "down-left".
     */
    private final String modification;

    /**
     * @param station Station that this endpoint is situated at.
     * @param type Type of the endpoint.
     * @param textLineNumber Line number of the input which declared this endpoint.
     */
    public Endpoint(Station station, String type, int textLineNumber) {
        this.station = station;
        Pair<String, String> directionAndModification = getType(type, textLineNumber);

        this.direction = directionAndModification.getLeft();
        this.modification = directionAndModification.getRight();
    }

    /** Converts this endpoint to an OutputLineSegment, to be drawn on the frontend. Do not call before solving AMPL model. */
    public OutputLineSegment toLineSegment() {
        if (station.getSolvedX() == -1 && station.getSolvedY() == -1) {
            throw new IllegalStateException("Endpoint.toLineSegment() called before AMPL model has been solved.");
        }

        Point p0 = new Point(station.getSolvedX(), station.getSolvedY());
        Point p1 = new Point(station.getSolvedX(), station.getSolvedY());

        switch (direction) {
            case "horizontal" -> {

                if (modification == null || modification.equals("left")) {
                    int dx = (int)MathUtil.symmetricRound(GenerateMap.METRO_LINE_WIDTH * (ENDPOINT_SCALE_FACTOR/2));
                    p0 = new Point(station.getSolvedX() - dx, station.getSolvedY());
                }

                if (modification == null || modification.equals("right")) {
                    int dx = (int)MathUtil.symmetricRound(GenerateMap.METRO_LINE_WIDTH * (ENDPOINT_SCALE_FACTOR/2));
                    p1 = new Point(station.getSolvedX() + dx, station.getSolvedY());
                }

            } case "vertical" -> {

                if (modification == null || modification.equals("up")) {
                    int dy = (int)MathUtil.symmetricRound(GenerateMap.METRO_LINE_WIDTH * (ENDPOINT_SCALE_FACTOR/2));
                    p0 = new Point(station.getSolvedX(), station.getSolvedY() - dy);
                }

                if (modification == null || modification.equals("down")) {
                    int dy = (int)MathUtil.symmetricRound(GenerateMap.METRO_LINE_WIDTH * (ENDPOINT_SCALE_FACTOR/2));
                    p1 = new Point(station.getSolvedX(), station.getSolvedY() + dy);
                }

            } case "up-right", "down-left" -> {

                int dxy = (int)MathUtil.symmetricRound(GenerateMap.METRO_LINE_WIDTH * (ENDPOINT_SCALE_FACTOR/2) / Math.sqrt(2));

                if (modification == null || modification.equals("down-left")) {
                    p0 = new Point(station.getSolvedX() - dxy, station.getSolvedY() + dxy);
                }

                if (modification == null || modification.equals("up-right")) {
                    p1 = new Point(station.getSolvedX() + dxy, station.getSolvedY() - dxy);
                }

            } case "down-right", "up-left" -> {

                int dxy = (int)MathUtil.symmetricRound(GenerateMap.METRO_LINE_WIDTH * (ENDPOINT_SCALE_FACTOR/2) / Math.sqrt(2));

                if (modification == null || modification.equals("up-left")) {
                    p0 = new Point(station.getSolvedX() - dxy, station.getSolvedY() - dxy);
                }

                if (modification == null || modification.equals("down-right")) {
                    p1 = new Point(station.getSolvedX() + dxy, station.getSolvedY() + dxy);
                }

            } default -> throw new IllegalStateException(String.format(
                            "Invalid endpoint direction/modification \"%s\"/\"%s\", but this should have been validated earlier.",
                            direction, modification));
        }

        return OutputLineSegment.fromStraightLine(new StraightLine(p0, p1));
    }

    /**
     * Parses and returns the direction and modification from an input endpoint type.
     * @param textInput The input text which declares the type of an endpoint.
     * @param textLineNumber Line number of the input which declared the endpoint.
     * @return The direction and modification for the given input type.
     */
    private static Pair<String, String> getType(String textInput, int textLineNumber) {
        IllegalArgumentException badEndpoint = new IllegalArgumentException(String.format("(line %d) Invalid endpoint type \"%s\".", textLineNumber, textInput));
        String[] tokens = textInput.split("\\s+");

        if (tokens.length != 1) throw badEndpoint;

        String endpointType = tokens[0].strip();
        if (!endpointType.contains(":")) {

            String[] validTokens = {"horizontal", "vertical", "up-right", "down-right", "up-left", "down-left"};
            if (!ArrayUtils.contains(validTokens, endpointType)) throw badEndpoint;
            return Pair.of(endpointType, null);

        } else {

            String[] typeTokens = endpointType.split(":");
            if (typeTokens.length != 2) throw badEndpoint;

            String direction = typeTokens[0].strip();
            String modification = typeTokens[1].strip();

            switch (direction) {
                case "horizontal" -> {
                    if (!ArrayUtils.contains(new String[]{"left", "right"}, modification)) throw badEndpoint;
                }
                case "vertical" -> {
                    if (!ArrayUtils.contains(new String[]{"up", "down"}, modification)) throw badEndpoint;
                }
                case "up-right", "down-left" -> {
                    if (!ArrayUtils.contains(new String[]{"up-right", "down-left"}, modification)) throw badEndpoint;
                }
                case "down-right", "up-left" -> {
                    if (!ArrayUtils.contains(new String[]{"down-right", "up-left"}, modification)) throw badEndpoint;
                }
                default ->
                    throw new IllegalArgumentException(String.format("(line %d) Invalid endpoint type \"%s\".", textLineNumber, textInput));
            }
            return Pair.of(direction, modification);
        }
    }

}
