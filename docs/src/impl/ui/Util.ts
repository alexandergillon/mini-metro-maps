/** UI utilities. */

/**
 * Gets an element by ID from the page, or throws an error if it doesn't exist.
 * @param id ID of the element.
 * @return The element.
 */
export function getElementByIdOrError<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Couldn't find element with ID '${id}' in document`);
    } else {
        return <T>element;
    }
}