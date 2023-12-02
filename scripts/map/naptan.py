# Script to read in data from naptan.json and provide a station -> naptan mapping.
# naptan.json is as produced by the tfl-api script.
import json


class NaptanReader:
    def __init__(self, naptan_filepath):
        self.name_to_naptan = NaptanReader.build_name_to_naptan(naptan_filepath)

    @staticmethod
    def build_name_to_naptan(naptan_filepath):
        """
        :param naptan_filepath: Path to naptan.json.
        :return: A mapping from station names to naptan ids.
        """
        name_to_naptan = dict()

        json_file = open(naptan_filepath, "r")
        naptan_json = json.load(json_file)
        json_file.close()

        for pair in naptan_json:
            name_to_naptan[pair["name"]] = pair["naptanId"]

        return name_to_naptan

    def get_naptan(self, name):
        """
        :param name: Name of a station.
        :return: Naptan id for that station. For Euston/Edgware road, has suffix attached to distinguish
        the two points on the map which correspond to the same station.
        """
        if name == "Euston (Charing Cross branch)":
            naptan = self.name_to_naptan["Euston"]
            naptan += "_CC"
        elif name == "Euston (Bank branch)":
            naptan = self.name_to_naptan["Euston"]
            naptan += "_B"
        elif name == "Edgware Road (Circle Line) w/ H&C":
            naptan = self.name_to_naptan["Edgware Road (Circle Line)"]
            naptan += "_HC"
        elif name == "Edgware Road (Circle Line) w/ District":
            naptan = self.name_to_naptan["Edgware Road (Circle Line)"]
            naptan += "_D"
        else:
            try:
                naptan = self.name_to_naptan[name]
            except KeyError:
                raise KeyError(f"No naptan entry for {name}")

        return naptan


if __name__ == "__main__":
    print("This file is not mean to be run. Run parse_data.py instead.")
    exit(1)
