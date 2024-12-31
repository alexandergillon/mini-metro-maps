import {CityApi, CityModule} from "./cities/CityTypes.js";
import {MetroNetwork} from "./impl/Types.js";
import {PaperCanvas} from "./impl/PaperCanvas.js";
import {NetworkHandler} from "./impl/NetworkHandler.js";
import {MetroNetworkImpl} from "./impl/network/MetroNetworkImpl.js";

/** The global paper object from paper.js. */
declare const paper: paper.PaperScope;

/**
 * Bootstraps the map.
 */
async function bootstrap() {
    // todo: error handling
    // Setup canvas - needs to be done before new MetroNetworkImpl, as that puts things onto the canvas
    const canvas = <HTMLCanvasElement>document.getElementById("mapCanvas")!;
    paper.setup(canvas);

    // Fetch metro network and city module
    const city = new URLSearchParams(window.location.search).get("city"); // todo: validate
    const jsonPath = `data/${city}.json`; // path to metro network data file
    const jsPath = `../js/cities/${city}.js`; // path to city API module
    const metroNetworkResponse: Promise<Response> = fetch(jsonPath);
    const cityModule: Promise<CityModule> = import(jsPath);

    // Use them to instantiate necessary map objects
    const metroNetwork: MetroNetwork = MetroNetworkImpl.fromJson(await (await metroNetworkResponse).json());
    const metroLineNames = Array.from(metroNetwork.metroLines).map(metroLine => metroLine.name);
    const cityApi: CityApi = (await cityModule).initialize(metroLineNames);
    const networkHandler = new NetworkHandler(metroNetwork, cityApi);
    const paperCanvas = new PaperCanvas(metroNetwork, canvas);
    metroNetwork.draw();
}

bootstrap();
