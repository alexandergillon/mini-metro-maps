import os
import util
from typing import Optional, TextIO
from classes import Station

ampl_mod_file: Optional[TextIO] = None
ampl_dat_file: Optional[TextIO] = None


def open_files() -> None:
    """Opens the ampl .mod and .dat files, creating them and their directory if they don't exist."""
    global ampl_mod_file, ampl_dat_file
    os.makedirs("ampl/temp", exist_ok=True)
    try:
        ampl_mod_file = open("ampl/temp/model.mod", "w")
        ampl_dat_file = open("ampl/temp/data.dat", "w")
    except Exception as e:
        if ampl_mod_file is not None:
            ampl_mod_file.close()
        raise e


def close_files() -> None:
    """Closes the ampl .mod and .dat files."""
    global ampl_mod_file, ampl_dat_file
    try:
        ampl_mod_file.close()
        ampl_mod_file = None
        ampl_dat_file.close()
        ampl_dat_file = None
    except Exception as e:
        if ampl_dat_file is not None and ampl_mod_file is None:
            ampl_dat_file.close()
            raise e


def write_initial_model(lines: dict) -> None:
    """
    Writes the initial part of the .mod file. This comes from a base template, which needs to have a % replaced
    with station identifiers.
    :param lines: the lines in the network.
    """
    initial_model_file = open("ampl/initial_model.mod", "r")
    initial_model_text = initial_model_file.read()
    percent_index = initial_model_text.index("%")

    ampl_mod_file.write(initial_model_text[:percent_index])

    station_identifiers = list()
    for line in lines.values():
        for station in line.stations.values():
            station_identifiers.append(f'"{station.unique_id}"')

    ampl_mod_file.write(", ".join(station_identifiers))

    ampl_mod_file.write(initial_model_text[percent_index + 1:])
    ampl_mod_file.write("\n")


def write_vertical_constraint(station_1_identifier: str, station_2_identifier: str) -> None:
    """
    Writes a vertical constraint between two stations to the .mod file. I.e. the two stations lie on the same vertical.
    :param station_1_identifier: identifier of the first station, in the STATIONS ampl set.
    :param station_2_identifier: identifier of the second station, in the STATIONS ampl set.
    """
    ampl_mod_file.write(f"subject to vertical_{station_1_identifier}_{station_2_identifier}: "
                        f"SOLVED_X_COORDS[{station_1_identifier}] = SOLVED_X_COORDS[{station_2_identifier}];\n")


def write_horizontal_constraint(station_1_identifier: str, station_2_identifier: str) -> None:
    """
    Writes a horizontal constraint between two stations to the .mod file.
    I.e. the two stations lie on the same horizontal.
    :param station_1_identifier: identifier of the first station, in the STATIONS ampl set.
    :param station_2_identifier: identifier of the second station, in the STATIONS ampl set.
    """
    ampl_mod_file.write(f"subject to horizontal_{station_1_identifier}_{station_2_identifier}: "
                        f"SOLVED_Y_COORDS[{station_1_identifier}] = SOLVED_Y_COORDS[{station_2_identifier}];\n")


def write_rising_diagonal_constraint(station_1_identifier: str, station_2_identifier: str) -> None:
    """
    Writes a rising diagonal constraint between two stations to the .mod file.
    I.e. the two stations lie on the same rising diagonal.
    :param station_1_identifier: identifier of the first station, in the STATIONS ampl set.
    :param station_2_identifier: identifier of the second station, in the STATIONS ampl set.
    """
    ampl_mod_file.write(f"subject to up_right_{station_1_identifier}_{station_2_identifier}: "
                        f"SOLVED_X_COORDS[{station_1_identifier}] - SOLVED_X_COORDS[{station_2_identifier}] "
                        f"= -(SOLVED_Y_COORDS[{station_1_identifier}] - SOLVED_Y_COORDS[{station_2_identifier}]);\n")


def write_falling_diagonal_constraint(station_1_identifier: str, station_2_identifier: str) -> None:
    """
    Writes a falling diagonal constraint between two stations to the .mod file.
    I.e. the two stations lie on the same falling diagonal.
    :param station_1_identifier: identifier of the first station, in the STATIONS ampl set.
    :param station_2_identifier: identifier of the second station, in the STATIONS ampl set.
    """
    ampl_mod_file.write(f"subject to down_right_{station_1_identifier}_{station_2_identifier}: "
                        f"SOLVED_X_COORDS[{station_1_identifier}] - SOLVED_X_COORDS[{station_2_identifier}] "
                        f"= SOLVED_Y_COORDS[{station_1_identifier}] - SOLVED_Y_COORDS[{station_2_identifier}];\n")


def write_cardinal_direction_constraint(station_name_1: str, station_name_2: str, constraint_type: str, lines: dict,
                                        network_line: str, input_line_number: int) -> None:
    """
    Writes a cardinal direction constraint between two stations (a vertical, horizontal, or rising/falling diagonal
    constraint).
    :param station_name_1: name of the first station.
    :param station_name_2: name of the second station.
    :param constraint_type: type of the constraint (one of 'vertical', 'horizontal', 'up-right', 'down-right')
    :param lines: the lines in the network.
    :param network_line: the line of these stations in the network - if '_MULTI', to be read from each station
    :param input_line_number: the line number of this constraint in the input file, for error messages.
    """
    if network_line == "_MULTI":
        return  # todo

    station1: Station = lines[network_line].get_station(station_name_1, input_line_number)
    station2: Station = lines[network_line].get_station(station_name_2, input_line_number)
    station_1_identifier = station1.unique_id
    station_2_identifier = station2.unique_id

    if constraint_type == "vertical":
        write_vertical_constraint(station_1_identifier, station_2_identifier)
    elif constraint_type == "horizontal":
        write_horizontal_constraint(station_1_identifier, station_2_identifier)
    elif constraint_type == "up-right":
        write_rising_diagonal_constraint(station_1_identifier, station_2_identifier)
    elif constraint_type == "down-right":
        write_falling_diagonal_constraint(station_1_identifier, station_2_identifier)
    else:
        raise ValueError(f"(internal error) constraint (line {input_line_number}) is invalid.")


def process_cardinal_direction_constraint(constraint_type: str, lines: dict, input_line_rest: str,
                                          network_line: str, input_line_number: int) -> None:
    """
    Processes a line of text which represents a cardinal direction constraint (a vertical, horizontal, or
    rising/falling diagonal constraint).
    :param constraint_type: type of the constraint (one of 'vertical', 'horizontal', 'up-right', 'down-right')
    :param lines: the lines in the network.
    :param input_line_rest: the rest of the line of input, after the constraint type has been removed.
    :param network_line: the line that this constraint applies to - if '_MULTI', to be read from each station.
    :param input_line_number: the line number of this constraint in the input file, for error messages.
    :return:
    """
    # todo: dupe fragment
    try:
        stations_string, __ = util.consume_double_quoted(input_line_rest)
        stations_string.strip()
    except ValueError:
        raise ValueError(f"(line {input_line_number}) does not have double-quoted stations.")
    stations = stations_string.split(",")
    stations = [station.strip() for station in stations]
    if len(stations) < 2:
        raise ValueError(f"(line {input_line_number}) has fewer than two stations.")
    current_station = stations[0]
    index = 1
    while index < len(stations):
        next_station = stations[index]
        write_cardinal_direction_constraint(current_station, next_station, constraint_type, lines, network_line,
                                            input_line_number)
        current_station = next_station
        index += 1


def process_constraint(lines: dict, input_file_line: str, network_line: str, input_line_number: int) -> None:
    """
    Processes a line of text which represents an alignment constraint between some number of stations.
    :param lines: the lines in the network.
    :param input_file_line: the line of input that declares the constraint.
    :param network_line: the line that this constraint applies to - if '_MULTI', to be read from each station.
    :param input_line_number: the line number of this constraint in the input file, for error messages.
    """
    old_input_file_line = input_file_line
    input_file_line.lstrip()
    constraint_type = input_file_line.split(maxsplit=1)[0]

    input_file_line.removeprefix(constraint_type)
    input_file_line.strip()

    if constraint_type in ["vertical", "horizontal", "up-right", "down-right"]:
        process_cardinal_direction_constraint(constraint_type, lines, input_file_line, network_line, input_line_number)
    elif constraint_type == "same-station":
        pass  # todo
    elif constraint_type == "equal":
        pass  # todo
    else:
        raise ValueError(f"(internal error) constraint (line {input_line_number}) '{old_input_file_line}' is invalid.")


def process_constraints(lines: dict, constraints: list[tuple[str, str, int]]) -> None:
    """
    Processes all alignment constraints.
    :param lines: the lines in the network.
    :param constraints: the constraints.
    """
    for input_file_line, network_line, input_line_number in constraints:
        process_constraint(lines, input_file_line, network_line, input_line_number)


def write_ampl_files(lines: dict, constraints: list[tuple[str, str, int]]) -> None:
    """
    Writes the ampl .mod and .dat files based on the constraints and parameters of the network.
    :param lines: the lines in the network.
    :param constraints: the constraints in the network.
    """
    open_files()
    try:
        write_initial_model(lines)
        process_constraints(lines, constraints)
    except Exception as e:
        close_files()
        raise e
    close_files()
