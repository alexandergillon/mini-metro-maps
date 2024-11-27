package com.github.alexandergillon.mini_metro_maps;

import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.DefaultParser;
import org.apache.commons.cli.Option;
import org.apache.commons.cli.Options;
import org.apache.commons.cli.ParseException;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.nio.file.Path;
import java.util.Optional;

public class GenerateMap {

    /** Scale factor for the map. If adjusted, line width should be adjusted too. */
    public static final int SCALE_FACTOR = 5;

    /** Line width of a metro line on the map, in pixels. */
    public static final int METRO_LINE_WIDTH = 20 * SCALE_FACTOR; // must be even or AMPL constraints will be violated

    /**
     * Weight for alignment points in AMPL (normal stations have weight 1). The idea of this is that we want to weight
     * alignment points less than stations, as they are usually meant to help align things rather than enforce
     * specific positions. However, we need to give them some weight so that AMPL puts them in a sensible place. If
     * the weight is 0, it can just return garbage for alignment points that are not sufficiently constrained.
     *
     * This value is a string as it is written to an AMPL file - never used in Java code.
     */
    public static final String ALIGNMENT_POINT_WEIGHT = "0.1";

    /** Path to the directory containing bezier.r, a program which fits parallel curves to Bezier curves. */
    private static Path rDir;

    /** Directory containing AMPL files. Also used to store temporary AMPL files. */
    private static Path amplDir;

    /** Path to file containing model Bezier curves. These are transformed to obtain all curves in the network. */
    private static String bezierPath;

    /** Path to file containing network data. */
    private static String networkPath;

    /** Path to file linking station names to unique identifiers. */
    private static String stationIdPath;

    /** Path to file assigning colors to lines. */
    private static String colorsPath;

    /** Path to store output file. */
    private static String outputPath;

    /** Full name of a subclass of StationIdReader, to use instead of StationIdReader when constructing a Parser. */
    private static Optional<Class<StationIdReader>> stationIdReaderClass;

    public static void main(String[] args) throws InterruptedException, ParseException, IOException, InvocationTargetException, NoSuchMethodException, InstantiationException, IllegalAccessException, ClassNotFoundException {
        parseArguments(args);

        String amplInitialModelPath = amplDir.resolve("initial_model.mod").toString();
        String zAmplInitialModelPath = amplDir.resolve("z_index_initial_model.mod").toString();
        String amplModPath = amplDir.resolve("temp").resolve("model.mod").toString();
        String amplDatPath = amplDir.resolve("temp").resolve("data.dat").toString();
        String zAmplModPath = amplDir.resolve("temp").resolve("zModel.mod").toString();

        String rCsvInPath = rDir.resolve("bezier_in.csv").toString();
        String rCsvOutPath = rDir.resolve("bezier_out.csv").toString();

        Parser parser = stationIdReaderClass.isPresent() ? new Parser(networkPath, stationIdPath, stationIdReaderClass.get())
                : new Parser(networkPath, stationIdPath);
        var data = parser.parseData();
        var metroLines = data.getLeft();
        var alignmentConstraints = data.getMiddle();
        var zIndexConstraints = data.getRight();

        AmplDriver amplDriver = new AmplDriver(amplInitialModelPath, SCALE_FACTOR, METRO_LINE_WIDTH, zAmplInitialModelPath);
        amplDriver.writeAmplFiles(amplModPath, amplDatPath, zAmplModPath, alignmentConstraints, zIndexConstraints, metroLines);
        amplDriver.solveAmpl(amplModPath, amplDatPath, zAmplModPath, metroLines);

        OutputWriter outputWriter = new OutputWriter(outputPath, bezierPath, colorsPath, rCsvInPath, rCsvOutPath, metroLines);
        outputWriter.writeJson();

        System.out.println("Done!");

        Runtime.getRuntime().exec("python copy_json.py");
        Runtime.getRuntime().exec("python plot_output.py");
    }

    /**
     * Defines and parses the command-line arguments.
     *
     * @param args The arguments, from main().
     * @throws ParseException If commons-cli has a problem with the arguments.
     */
    private static void parseArguments(String[] args) throws ParseException, ClassNotFoundException {
        Options options = new Options();

        options.addOption(Option.builder("bezierdir").argName("bezier").hasArg().required()
                .desc("directory containing bezier.r").build());
        options.addOption(Option.builder("ampldir").argName("dir").hasArg().required()
                .desc("directory containing AMPL files").build());
        options.addOption(Option.builder("bezierjson").argName("bezier.json").hasArg().required()
                .desc("file describing the shape of curves - see scripts/map/input/README.md for format").build());
        options.addOption(Option.builder("network").argName("network.txt").hasArg().required()
                .desc("file describing the network - see scripts/map/input/README.md for format").build());
        options.addOption(Option.builder("ids").argName("ids.json").hasArg().required()
                .desc("file describing station IDs - see scripts/map/input/README.md for format").build());
        options.addOption(Option.builder("colors").argName("colors.json").hasArg().required()
                .desc("file describing the colors of lines - see scripts/map/input/README.md for format").build());
        options.addOption(Option.builder("out").argName("network.json").hasArg().required()
                .desc("path to write the output file").build());
        options.addOption(Option.builder("idreader").argName("network.json").hasArg()
                .desc("full name of a class to override StationIdReader").build());

        CommandLineParser parser = new DefaultParser();
        CommandLine cmd = parser.parse(options, args);

        rDir = Path.of(cmd.getOptionValue("bezierdir"));
        amplDir = Path.of(cmd.getOptionValue("ampldir"));
        bezierPath = cmd.getOptionValue("bezierjson");
        networkPath = cmd.getOptionValue("network");
        stationIdPath = cmd.getOptionValue("ids");
        colorsPath = cmd.getOptionValue("colors");
        outputPath = cmd.getOptionValue("out");
        stationIdReaderClass = cmd.hasOption("idreader") ?
                Optional.of(Class.forName(cmd.getOptionValue("idreader")).asSubclass(StationIdReader.class)) : Optional.empty();
    }
}