import { fetchTrainData, setGetData } from "./trains.js";
import { MetroNetworkImpl } from "./impl/network/MetroNetworkImpl.js";
import { PaperCanvas } from "./impl/PaperCanvas.js";
/** Time between updates of train data, in seconds. */
const FETCH_TRAIN_DATA_INTERVAL = 15;
/** JS module for the specific city being displayed. Has functionality to retrieve data from the appropriate transit API. */
let cityModule;
/** The metro network. */
let metroNetwork;
/**
 * Fetches the JSON file which describes the metro network. Stores the JSON, parsed as a JS object, into the
 * metroNetwork variable.
 * @param jsonPath Path to the JSON file which describes the metro network.
 */
async function fetchMetroNetwork(jsonPath) {
    const response = await fetch(jsonPath);
    metroNetwork = new MetroNetworkImpl(await response.json());
}
/**
 * Fetches the JS function which gets data from the public transit API. Stores the function in the getData variable.
 * @param jsPath Path to the JS module which exports the getData() function.
 */
async function fetchApiFunction(jsPath) {
    cityModule = await import(jsPath);
    setGetData(cityModule.getData);
}
/**
 * Fetches the dependencies required for the map to work. This includes the JSON file which describes the metro network,
 * and the JS file which fetches data from the appropriate transit API.
 */
async function fetchDependencies() {
    // todo: error handling
    const urlParameters = new URLSearchParams(window.location.search);
    const city = urlParameters.get("city"); // todo: validate
    const jsonPath = `data/${city}.json`;
    const jsPath = `../js/cities/${city}.js`;
    await Promise.all([fetchMetroNetwork(jsonPath), fetchApiFunction(jsPath)]);
    const metroLineNames = Array.from(metroNetwork.metroLines).map(metroLine => metroLine.name);
    cityModule.setLines(metroLineNames);
}
/**
 * Sets up the canvas. Registers the canvas with the paper object, registers event listeners, and draws the metro
 * network.
 */
async function setupCanvas() {
    const canvas = document.getElementById("mapCanvas");
    paper.setup(canvas);
    await fetchDependencies();
    setInterval(fetchTrainData, FETCH_TRAIN_DATA_INTERVAL * 1000);
    const paperCanvas = new PaperCanvas(metroNetwork, canvas);
    metroNetwork.draw();
}
setupCanvas();
