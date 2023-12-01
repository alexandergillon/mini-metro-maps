# Classes for organizing stations/lines.
from typing import Optional


class Station:
    """Class representing a station."""

    def __init__(self, line: str, name: str, naptan: str, x: int, y: int):
        self.line = line
        self.name = name
        self.unique_id = f"{line}_{naptan}"

        self.original_x = x
        self.original_y = y
        self.solved_x: Optional[int] = None
        self.solved_y: Optional[int] = None

        # self.neighbors = []

    def __repr__(self):
        return f"{self.line} station {self.name} ({self.unique_id})"


class Line:
    """Class representing a line of the network."""

    def __init__(self, name):
        self.name = name
        self.stations = dict()  # station name -> station
        self.edges: set[tuple[Station, Station]] = set()
        self.curves: list[tuple[Station, Station, str]] = list()

    def add_station(self, station: Station):
        self.stations[station.name] = station

    def get_station(self, station_name: str, input_line_number: int):
        """
        Gets a station in this line, printing an error message if the station does not exist.
        :param station_name: The name of the station to find.
        :param input_line_number: The line number in the input which used this station name.
        :return: The station in this line, corresponding to that name.
        """
        if station_name not in self.stations:
            raise ValueError(f"(line {input_line_number}) station {station_name} does not exist for line {self.name}.")
        return self.stations[station_name]

    def add_edge(self, station_name_1: str, station_name_2: str, input_line_number: int) -> None:
        """
        Connects two stations.
        :param station_name_1: name of first station.
        :param station_name_2: name of second station.
        :param input_line_number: line of input file which contained this edge, for error messages.
        """
        if station_name_1 not in self.stations:
            raise ValueError(f"(line {input_line_number}) station {station_name_1} does not exist for line {self.name}.")
        if station_name_2 not in self.stations:
            raise ValueError(f"(line {input_line_number}) station {station_name_2} does not exist for line {self.name}.")

        self.edges.add((self.stations[station_name_1], self.stations[station_name_2]))

    def add_curve(self, station_name_1: str, station_name_2: str, curve_type: str, input_line_number: int) -> None:
        """
        Specifies the curve type between two stations.
        :param station_name_1: name of first station.
        :param station_name_2: name of second station.
        :param curve_type: the type of the curve.
        :param input_line_number: line of input file which contained this edge, for error messages.
        :return:
        """
        if station_name_1 not in self.stations:
            raise ValueError(f"(line {input_line_number}) station {station_name_1} does not exist for line {self.name}.")
        if station_name_2 not in self.stations:
            raise ValueError(f"(line {input_line_number}) station {station_name_2} does not exist for line {self.name}.")

        station1 = self.stations[station_name_1]
        station2 = self.stations[station_name_2]
        if (station1, station2) not in self.edges and (station2, station1) not in self.edges:
            raise ValueError(
                f"(line {input_line_number}) curve between {station_name_1} and {station_name_2} "
                f"specified, but they are not connected.")

        self.curves.append((self.stations[station_name_1], self.stations[station_name_2], curve_type))

    def has_orphan_stations(self) -> tuple[bool, Optional[str]]:
        """
        :return: Whether this line has orphan stations (stations connected to no others). If so, also returns the name
        of an orphan.
        """
        for station in self.stations.values():
            orphan = True
            for edge in self.edges:
                if station.name in [edge[0].name, edge[1].name]:
                    orphan = False
            if orphan:
                return True, station.name
        return False, None

    def __repr__(self):
        return f"{self.name} line with {len(self.stations)} stations"


if __name__ == "__main__":
    print("This file is not mean to be run. Run parse_data.py instead.")
    exit(1)
