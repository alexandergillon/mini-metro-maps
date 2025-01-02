/** @file UI code. */
import { DevModeUserInterface } from "./DevModeUserInterface.js";
import { Config } from "../Config.js";
import { getElementByIdOrError } from "./Util.js";
/** Class for handling the UI. */
export class UserInterface {
    /** Constructor. Enables dev mode UI if dev mode is enabled. */
    constructor() {
        /** The UI layer div. */
        this.userInterfaceLayer = getElementByIdOrError("userInterfaceLayer");
        /** Object which handles the developer mode UI. */
        this.devModeUserInterface = Config.DEV_MODE_ENABLED ? new DevModeUserInterface(this.userInterfaceLayer) : null;
    }
}
