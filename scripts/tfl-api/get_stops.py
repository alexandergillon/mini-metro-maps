# Script to pull the names and NAPTAN ids of all stops on the tube
# Writes the names in a (nicer) human-readable format to 'output/human_readable.txt'
# Writes names/NAPTAN id pairs in JSON to 'output/naptan.json'
import json
import os

import requests
from typing import Optional, TextIO

lines = ["bakerloo",
         "central",
         "circle",
         "district",
         "hammersmith-city",
         "jubilee",
         "metropolitan",
         "northern",
         "piccadilly",
         "victoria",
         "waterloo-city"]

human_readable_file: Optional[TextIO] = None
json_array = []


def open_output_file():
    global human_readable_file
    human_readable_file = open("output/human_readable.txt", "w")


def close_output_file():
    human_readable_file.close()


def write_json_file():
    json_string = json.dumps(json_array, indent=2)
    json_file = open("output/naptan.json", "w")
    json_file.write(json_string)
    json_file.close()


def get_stops_for_line(line):
    human_readable_file.write(f"{line}:\n")
    url = f"https://api.tfl.gov.uk/line/{line}/StopPoints"

    response = requests.get(url)
    response.raise_for_status()
    response_json = response.json()

    for stop in response_json:
        name = stop["commonName"]
        name = name.removesuffix("Underground Station").strip()
        human_readable_file.write(f"  \"{name}\"\n")

        json_dict = dict()
        json_dict["name"] = name
        json_dict["naptanId"] = stop["naptanId"]
        json_array.append(json_dict)

    human_readable_file.write("\n")


def get_stops():
    for line in lines:
        get_stops_for_line(line)


def main():
    try:
        os.makedirs("output", exist_ok=True)
        open_output_file()
        get_stops()
    except Exception as e:
        print(e)
    close_output_file()
    write_json_file()


if __name__ == "__main__":
    main()
