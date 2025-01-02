/** @file UI code. */
import {DevModeUserInterface} from "./DevModeUserInterface.js";
import {Config} from "../Config.js";
import {getElementByIdOrError} from "./Util.js";

/** Class for handling the UI. */
export class UserInterface {
    /** The UI layer div. */
    private readonly userInterfaceLayer: HTMLDivElement = getElementByIdOrError("userInterfaceLayer");
    /** Object which handles the developer mode UI. */
    private readonly devModeUserInterface: DevModeUserInterface | null = Config.DEV_MODE_ENABLED ? new DevModeUserInterface(this.userInterfaceLayer) : null;

    /** Constructor. Enables dev mode UI if dev mode is enabled. */
    constructor() { }
}