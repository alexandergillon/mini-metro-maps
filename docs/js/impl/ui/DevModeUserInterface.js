/**
 * @file Developer mode UI code.
 *
 * The dev mode UI enables a 'Developer Mode Enabled' label in the top left of the screen, and icons for warnings/errors
 * in the top right.
 */
/** Class for handling developer mode UI. */
export class DevModeUserInterface {
    /**
     * Constructor. Overrides console.warn and console.error to catch warnings/errors and display the appropriate icons.
     * @param userInterfaceLayer The UI layer div.
     */
    constructor(userInterfaceLayer) {
        /** Div containing the dev mode warning/error icons. */
        this.devModeIconsDiv = null;
        /** Dev mode warning icon. */
        this.devModeWarningIcon = null;
        /** Dev mode warning text - contains count of warnings seen so far. */
        this.devModeWarningText = null;
        /** Dev mode error icon. */
        this.devModeErrorIcon = null;
        /** Dev mode error text - contains county of errors seen so far. */
        this.devModeErrorText = null;
        this.userInterfaceLayer = userInterfaceLayer;
        this.addDevModeLabel();
        this.originalConsoleWarn = console.warn;
        this.originalConsoleError = console.error;
        console.warn = this.consoleWarn.bind(this);
        console.error = this.consoleError.bind(this);
    }
    /** console.warn override. Enables / increments warning icon. */
    consoleWarn(...args) {
        if (!this.devModeWarningIcon)
            this.addWarningIcon();
        const count = Number(this.devModeWarningText.textContent);
        this.devModeWarningText.textContent = (count + 1).toString();
        this.originalConsoleWarn(...args);
    }
    /** console.error override. Enables/increments error icon. */
    consoleError(...args) {
        if (!this.devModeErrorIcon)
            this.addErrorIcon();
        const count = Number(this.devModeErrorText.textContent);
        this.devModeErrorText.textContent = (count + 1).toString();
        this.originalConsoleError(...args);
    }
    /** Adds the 'Developer Mode Enabled' label. */
    addDevModeLabel() {
        const label = document.createElement("span");
        label.id = "devModeLabel";
        label.textContent = "Developer Mode Enabled";
        this.userInterfaceLayer.append(label);
    }
    /** Adds the devModeIcons div to the UI layer. Needed to put the warning/error icon/text in. */
    addDevModeIconsDiv() {
        const div = document.createElement("div");
        div.id = "devModeIcons";
        this.userInterfaceLayer.append(div);
        this.devModeIconsDiv = div;
    }
    /** Creates/displays the warning icon and initializes its count to 0. */
    addWarningIcon() {
        if (!this.devModeIconsDiv)
            this.addDevModeIconsDiv();
        const image = new Image();
        image.classList.add("devModeIcon");
        image.src = "../images/warning.svg";
        image.alt = "warning icon";
        const label = document.createElement("span");
        label.classList.add("devModeIconText");
        label.textContent = "0";
        this.devModeWarningIcon = image;
        this.devModeWarningText = label;
        this.devModeIconsDiv.prepend(image, label);
    }
    /** Creates/displays the error icon and initializes its count to 0. */
    addErrorIcon() {
        if (!this.devModeIconsDiv)
            this.addDevModeIconsDiv();
        const image = new Image();
        image.classList.add("devModeIcon");
        image.src = "../images/error.svg";
        image.alt = "error icon";
        const label = document.createElement("span");
        label.classList.add("devModeIconText");
        label.textContent = "0";
        this.devModeErrorIcon = image;
        this.devModeErrorText = label;
        this.devModeIconsDiv.append(image, label);
    }
}
