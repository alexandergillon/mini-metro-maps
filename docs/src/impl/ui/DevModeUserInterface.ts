/**
 * @file Developer mode UI code.
 *
 * The dev mode UI enables a 'Developer Mode Enabled' label in the top left of the screen, and icons for warnings/errors
 * in the top right.
 */

/** Class for handling developer mode UI. */
export class DevModeUserInterface {
    /** The UI layer div. */
    private readonly userInterfaceLayer: HTMLDivElement;
    /** Div containing the dev mode warning/error icons. */
    private devModeIconsDiv: HTMLDivElement | null = null;
    /** Dev mode warning icon. */
    private devModeWarningIcon: HTMLImageElement | null = null;
    /** Dev mode warning text - contains count of warnings seen so far. */
    private devModeWarningText: HTMLSpanElement | null = null;
    /** Dev mode error icon. */
    private devModeErrorIcon: HTMLImageElement | null = null;
    /** Dev mode error text - contains county of errors seen so far. */
    private devModeErrorText: HTMLSpanElement | null = null;
    /** Original console.warn function, for our override to call. */
    private readonly originalConsoleWarn: Function;
    /** Original console.error function, for our override to call. */
    private readonly originalConsoleError: Function;

    /**
     * Constructor. Overrides console.warn and console.error to catch warnings/errors and display the appropriate icons.
     * @param userInterfaceLayer The UI layer div.
     */
    constructor(userInterfaceLayer: HTMLDivElement) {
        this.userInterfaceLayer = userInterfaceLayer;
        this.addDevModeLabel();

        this.originalConsoleWarn = console.warn;
        this.originalConsoleError = console.error;
        console.warn = this.consoleWarn.bind(this);
        console.error = this.consoleError.bind(this);
    }

    /** console.warn override. Enables / increments warning icon. */
    private consoleWarn(...args: any[]) {
        if (!this.devModeWarningIcon) this.addWarningIcon();
        const count = Number(this.devModeWarningText!.textContent);
        this.devModeWarningText!.textContent = (count + 1).toString();
        this.originalConsoleWarn(...args);
    }

    /** console.error override. Enables/increments error icon. */
    private consoleError(...args: any[]) {
        if (!this.devModeErrorIcon) this.addErrorIcon();
        const count = Number(this.devModeErrorText!.textContent);
        this.devModeErrorText!.textContent = (count + 1).toString();
        this.originalConsoleError(...args);
    }

    /** Adds the 'Developer Mode Enabled' label. */
    private addDevModeLabel() {
        const label = document.createElement("span");
        label.id = "devModeLabel";
        label.textContent = "Developer Mode Enabled";
        this.userInterfaceLayer.append(label);
    }

    /** Adds the devModeIcons div to the UI layer. Needed to put the warning/error icon/text in. */
    private addDevModeIconsDiv() {
        const div = document.createElement("div");
        div.id = "devModeIcons";
        this.userInterfaceLayer.append(div);
        this.devModeIconsDiv = div;
    }

    /** Creates/displays the warning icon and initializes its count to 0. */
    private addWarningIcon() {
        if (!this.devModeIconsDiv) this.addDevModeIconsDiv();

        const image = new Image();
        image.classList.add("devModeIcon");
        image.src = "../images/warning.svg";
        image.alt = "warning icon";

        const label = document.createElement("span");
        label.classList.add("devModeIconText");
        label.textContent = "0";

        this.devModeWarningIcon = image;
        this.devModeWarningText = label;

        this.devModeIconsDiv!.prepend(image, label);
    }

    /** Creates/displays the error icon and initializes its count to 0. */
    private addErrorIcon() {
        if (!this.devModeIconsDiv) this.addDevModeIconsDiv();

        const image = new Image();
        image.classList.add("devModeIcon");
        image.src = "../images/error.svg";
        image.alt = "error icon";

        const label = document.createElement("span");
        label.classList.add("devModeIconText");
        label.textContent = "0";

        this.devModeErrorIcon = image;
        this.devModeErrorText = label;

        this.devModeIconsDiv!.append(image, label);
    }
}