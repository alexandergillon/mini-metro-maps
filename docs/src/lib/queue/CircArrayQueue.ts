/*
BSD 3-Clause License

Copyright (c) 2022, KriztoferY (https://github.com/KriztoferY)
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

import IQueue from "./Queue";

/**
 * Circular array queue -- an implementation of the Queue ADT using a circular
 * array along with a dynamic resizing scheme.
 *
 * @class CircArrayQueue
 * @typedef {CircArrayQueue}
 * @template T The type of all elements in the queue.
 * @implements {IQueue<T>}
 */
class CircArrayQueue<T> implements IQueue<T> {
    /**
     * The underlying array for storing queue elements of type `T`.
     * @type {T[]}
     */
    #elems: T[];

    /**
     * Position of the front element in the underlying array.
     * @type {number}
     */
    #startIdx: number;

    /**
     * Number of elements in the queue.
     * @type {number}
     */
    #numElems: number;

    /**
     * Creates an empty queue.
     * @constructor
     * @template T The type of all elements in the queue.
     * @param {number} initCapacity Initial anticipated number of elements
     *      to be stored in the queue.
     */
    constructor(initCapacity: number = 2) {
        if (initCapacity <= 0 ||
            !Number.isInteger(initCapacity) ||
            !Number.isFinite(initCapacity)) {
            throw Error("initCapacity cannot be converted into " +
                "a finite positive integer");
        }

        this.#elems = new Array(initCapacity);
        this.#startIdx = 0;
        this.#numElems = 0;
    }

    /**
     * The maximum number of elements the queue can store without allocating
     * additional memory.
     * @readonly
     * @type {number}
     */
    get capacity(): number {
        return this.#elems.length;
    }

    /**
     * Position of the one past the last queue element in the underlying array.
     * @readonly
     * @type {number}
     */
    get #endIdx(): number {
        return (this.#startIdx + this.#numElems) % this.capacity
    }

    /**
     * Growth factor for the underlying array.
     * @static
     * @type {number}
     */
    static #growthFactor: number = 2;

    /**
     * Grows or shrinks the underlying array by a factor of 2.
     * @param {boolean} grow Grow/shrink flag.
     */
    #resize(grow: boolean = true): void {
        if (grow) {
            if (this.#numElems === this.capacity) {
                this.#elems.length *=
                    CircArrayQueue.#growthFactor;
            }
        }
        else {
            if (this.capacity >= 2 &&
                this.#numElems * 4 < this.capacity) {
                // Create new array of half the size as existing one
                const newElems = new Array(Math.floor(
                    this.#elems.length / CircArrayQueue.#growthFactor
                ));
                // Copy all elements into new array
                const n = this.#numElems;
                for (let i = 0; i < n; ++i) {
                    newElems[i] =
                        this.#elems[(this.#startIdx + i) % this.capacity];
                }
                // Reset start index
                this.#startIdx = 0;
                // Replace existing array with new array
                this.#elems = newElems;
            }
        }
    }

    /**
     * Number of elements in the queue.
     * @readonly
     * @type {number}
     */
    get size(): number {
        return this.#numElems;
    }

    /**
     * Whether the queue has no elements.
     * @returns {boolean} `true` if the queue is empty, `false` otherwise.
     */
    empty(): boolean {
        return this.#numElems === 0;
    }

    /**
     * Iterates over all elements of this queue from the front.
     *
     * The given operation will be performed on each element iterated.
     *
     * @param action The operation to be performed on each element.
     */
    iter(action: (elem: T) => void): void {
        if (this.size === 0) return;
        const n = this.size;
        for (let i = 0; i < n; ++i) {
            action(this.#elems[(this.#startIdx + i) % this.capacity]);
        }
    }

    /**
     * Creates a string representation of this queue.
     *
     * Elements are presented in the queue order from left to right.
     *
     * @param {string} separator Element separator. Defaults to a single space
     *      character.
     * @returns {string} The string representation.
     */
    toString(separator: string = ' '): string {
        let frontToEnd = '';
        const n = this.size;
        for (let i = 0; i < n; ++i) {
            frontToEnd =
                `${frontToEnd}${frontToEnd.length > 0 ? separator : ''}` +
                `${this.#elems[(this.#startIdx + i) % this.capacity]}`;
        }
        return `[${frontToEnd}]`;
    }

    /**
     * Gets the element at the front of the queue if not empty.
     * @returns {T | null} The front element.
     */
    front(): T | null {
        if (this.empty()) {
            return null;
        }
        return this.#elems[this.#startIdx];
    }

    /**
     * Adds an element to the end of the queue.
     * @param {T} elem The element to be added.
     */
    enqueue(elem: T): void {
        this.#resize();
        this.#elems[this.#endIdx] = elem;
        ++this.#numElems;
    }

    /**
     * Removes the front element from the queue if not empty.
     * @returns {boolean} `true` on success, `false` otherwise.
     */
    dequeue(): boolean {
        if (this.empty()) {
            return false;
        }

        delete this.#elems[this.#startIdx];
        this.#startIdx = (this.#startIdx + 1) % this.capacity;
        --this.#numElems;
        this.#resize(false);

        return true;
    }
}

export default CircArrayQueue;