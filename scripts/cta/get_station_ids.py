# Script to pull station IDs of CTA stations from CSV file
# CSV file source: https://data.cityofchicago.org/Transportation/CTA-System-Information-List-of-L-Stops/8pix-ypme/about_data
import csv
import json
import os
import re

from typing import Optional, TextIO

json_array = []


def write_json_file():
    json_string = json.dumps(json_array, indent=2)
    json_file = open("output/station_ids.json", "w")
    json_file.write(json_string)
    json_file.close()

def get_lines(row):
    lines = list()
    if row["RED"].lower() == "true": lines.append("red")
    if row["BLUE"].lower() == "true": lines.append("blue")
    if row["G"].lower() == "true": lines.append("green")
    if row["BRN"].lower() == "true": lines.append("brown")
    if row["P"].lower() == "true" or row["Pexp"].lower() == "true": lines.append("purple")
    if row["Y"].lower() == "true": lines.append("yellow")
    if row["Pnk"].lower() == "true": lines.append("pink")
    if row["O"].lower() == "true": lines.append("orange")

    if len(lines) == 0:
        print(f"bad row, no colors: {row}")
    return lines

def get_stops():
    rows = list()

    with open("input.csv", "r") as csvfile:
        csvreader = csv.reader(csvfile)
        headers = next(csvreader)
        for row in csvreader:
            rowdict = dict()
            for i in range(len(headers)):
                rowdict[headers[i]] = row[i]
            rows.append(rowdict)

    seen = set()
    for row in rows:
        name_with_direction = row["STOP_NAME"]
        match = re.match(r"^\s*(.*)\s+\(.*?\)\s*", name_with_direction)

        if not match:
            print(f"Bad row: {row}")
            next

        station_id = row["MAP_ID"]

        # some stops have multiple lines stopping at them, but we treat them as separate stops
        for line in get_lines(row):
            identifier = station_id + line
            if identifier in seen: continue
            seen.add(identifier)
            json_dict = dict()
            json_dict["name"] = match.group(1)
            json_dict["metroLine"] = line
            json_dict["id"] = identifier
            json_array.append(json_dict) # TODO: filter unique

def main():
    try:
        os.makedirs("output", exist_ok=True)
        get_stops()
    except Exception as e:
        print(e)
    write_json_file()


if __name__ == "__main__":
    main()
