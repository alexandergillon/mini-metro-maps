# Script to read in data about the network.
from classes import Station, Line
from naptan import NaptanReader
from typing import Optional
import util

# Lines of input file that represent constraints, with their network line and input line number (processed later)
constraint_text_lines: list[tuple[str, str, int]] = list()  # todo: create type
lines = dict()                                # line name -> Line object mapping
naptan_reader: Optional[NaptanReader] = None  # Reader for getting naptans
input_line_number: int = 0                    # Current line of the input being processed, for error messages


def sanitize_line(line: str) -> str:
    """
    :param line: Line of input.
    :return: Line with comments removed, and stripped of leading/trailing whitespace.
    """
    try:
        comment_index = line.index("#")
        line = line[:comment_index]
    except ValueError:
        pass
    line = line.strip()
    return line


def create_new_line(input_file_line: str) -> str:
    """
    Creates a new line in the network. Also returns the name of the line created.
    :param input_file_line: line of input which declares a line.
    :return: The name of the new line.
    """
    tokens = input_file_line.split()
    try:
        line_name = tokens[1]
    except IndexError:
        raise ValueError(f"line {input_line_number} '{input_file_line}' does not have a line name.")

    try:
        colon_index = line_name.index(":")
        line_name = line_name[:colon_index]
    except ValueError:
        pass
    line_name = line_name.strip()

    if line_name in lines:
        raise ValueError(f"redefinition of line '{line_name}'.")

    lines[line_name] = Line(line_name)
    return line_name


def create_new_station(input_file_line: str, current_line: str) -> None:
    """
    Creates a new station.
    :param input_file_line: line of input which declares a station.
    :param current_line: the current line that is selected in the network.
    """
    if current_line is None:
        raise ValueError(f"line {input_line_number} '{input_file_line}' was declared before a current line was set.")
    old_input_file_line = input_file_line

    input_file_line.removeprefix("station")
    input_file_line.lstrip()

    try:
        station_name, rest = util.consume_double_quoted(input_file_line)
        station_name.strip()
        rest.strip()
    except ValueError:
        raise ValueError(f"line {input_line_number} '{old_input_file_line}' does not have a double-quoted station name.")

    tokens = rest.split()
    try:
        x = int(tokens[0])
        y = int(tokens[1])
    except IndexError:
        raise ValueError(f"line {input_line_number} '{old_input_file_line}' does not have both coordinates.")
    except ValueError:
        raise ValueError(f"line {input_line_number} '{old_input_file_line}' contains coordinate which is not an integer.")

    naptan = naptan_reader.get_naptan(station_name)
    station = Station(current_line, station_name, naptan, x, y)
    lines[current_line].add_station(station)


def add_edges(input_file_line: str, current_line: str) -> None:
    """
    Adds a number of edges between two stations on a line.
    :param input_file_line: line of input which declares a series of edges.
    :param current_line: the current line that is selected in the network.
    """
    if current_line is None:
        raise ValueError(f"line {input_line_number} '{input_file_line}' was declared before a current line was set.")
    old_input_file_line = input_file_line

    input_file_line.removeprefix("edges")
    input_file_line.lstrip()

    try:
        stations_string, __ = util.consume_double_quoted(input_file_line)
        stations_string.strip()
    except ValueError:
        raise ValueError(f"line {input_line_number} '{old_input_file_line}' does not have double-quoted stations.")

    stations = stations_string.split(",")
    stations = [station.strip() for station in stations]
    if len(stations) < 2:
        raise ValueError(f"line {input_line_number} '{old_input_file_line}' has fewer than two stations.")

    current_station = stations[0]
    index = 1
    while index < len(stations):
        next_station = stations[index]
        lines[current_line].add_edge(current_station, next_station, input_line_number)
        current_station = next_station
        index += 1


def validate_curve_type(rest: str, old_input_file_line: str) -> str:
    """
    Extracts the curve type from a line of input and validates it.
    :param rest: the rest of the line that declared the curve, after 'curve'
    :param old_input_file_line: line of input which declared the curve, for error messages.
    :return: The extracted curve type.
    """
    rest_tokens = rest.split()
    curve_type = rest_tokens[0]
    curve_type_tokens = curve_type.split(",")
    if curve_type != "special":
        error = False
        if len(curve_type_tokens) != 2:
            error = True
        for token in curve_type_tokens:
            token = token.strip()
            if token not in ["up", "down", "left", "right", "up-right", "up-left", "down-right", "down-left"]:
                error = True
        if error:
            raise ValueError(f"line {input_line_number} '{old_input_file_line}' has invalid curve type.")

    return curve_type


def add_curve(input_file_line: str, current_line: str) -> None:
    """
    :param input_file_line: line of input which declares a curve.
    :param current_line: the current line that is selected in the network.
    """
    if current_line is None:
        raise ValueError(f"line {input_line_number} '{input_file_line}' was declared before a current line was set.")
    old_input_file_line = input_file_line

    input_file_line.removeprefix("curve")
    input_file_line.lstrip()

    try:
        stations_string, rest = util.consume_double_quoted(input_file_line)
        stations_string.strip()
        rest.strip()
    except ValueError:
        raise ValueError(f"line {input_line_number} '{old_input_file_line}' does not have double-quoted stations.")
    if len(rest) == 0:
        raise ValueError(f"line {input_line_number} '{old_input_file_line}' does not have curve type.")

    curve_type = validate_curve_type(rest, old_input_file_line)

    stations = stations_string.split(",")
    stations = [station.strip() for station in stations]
    if len(stations) != 2:
        raise ValueError(f"line {input_line_number} '{old_input_file_line}' does not have two stations.")

    lines[current_line].add_curve(stations[0], stations[1], curve_type, input_line_number)


def read_data(path) -> None:
    """
    Reads data about lines/stations from the input file. Puts line information into the ``lines`` global variable,
    and leaves constraints unprocessed in the ``constraint_text_lines`` global variable.
    :param path: Path to the input file.
    """
    global input_line_number
    station_data_file = open(path, "r")

    current_line = None
    for input_file_line in station_data_file.readlines():
        input_line_number += 1
        input_file_line = sanitize_line(input_file_line)
        if len(input_file_line) == 0:
            continue

        if input_file_line.startswith("line"):
            current_line = create_new_line(input_file_line)
        elif input_file_line.startswith("station"):
            create_new_station(input_file_line, current_line)
        elif input_file_line.startswith("edges"):
            add_edges(input_file_line, current_line)
        elif input_file_line.startswith("curve"):
            add_curve(input_file_line, current_line)
        elif input_file_line.startswith("multi-line"):
            current_line = "_MULTI"
        elif input_file_line.startswith(tuple(["vertical", "horizontal", "up-right",
                                               "up-left", "down-right", "down-left"])):
            input_file_line = input_file_line.replace("up-left", "down-right")
            input_file_line = input_file_line.replace("down-left", "up-right")
            constraint_text_lines.append((input_file_line, current_line, input_line_number))
        elif input_file_line.startswith("same-station") or input_file_line.startswith("equal"):
            constraint_text_lines.append((input_file_line, current_line, input_line_number))
        else:
            raise ValueError(f"line {input_line_number} '{input_file_line}' has unrecognized form.")


def check_no_orphans() -> None:
    """Checks that all lines have no orphans."""
    for line in lines.values():
        has_orphan, orphan = line.has_orphan_stations()
        if has_orphan:
            raise ValueError(f"line {line.name} has orphan station {orphan}.")


def parse_data() -> tuple[dict, list[tuple[str, str, int]]]:
    global naptan_reader
    naptan_reader = NaptanReader("input/naptan.json")
    read_data("input/tube_data.txt")
    check_no_orphans()
    return lines, constraint_text_lines


if __name__ == "__main__":
    print("This file is not mean to be run. Run generate_map.py instead.")
    exit(1)
