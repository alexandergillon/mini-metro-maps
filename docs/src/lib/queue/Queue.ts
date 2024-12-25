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

/**
 * The Queue ADT.
 * 
 * @interface IQueue
 * @typedef {IQueue}
 * @template T The type of all elements in the queue.
 */
interface IQueue<T> {
    /**
     * Number of elements in the queue.
     * @readonly
     * @type {number}
     */
    get size(): number;

    /**
     * Whether the queue has no elements.
     * @returns {boolean} `true` if the queue is empty, `false` otherwise.
     */
    empty(): boolean;

    /**
     * Iterates over all elements of this queue from the front.
     * 
     * The given operation will be performed on each element iterated.
     *
     * @param action The operation to be performed on each element.
     */
    iter(action: (elem: T) => void): void;

    /**
     * Creates a string representation of this queue.
     *
     * Elements are presented in the queue order from left to right.
     * 
     * @param {string} separator Element separator.
     * @returns {string} The string representation.
     */
    toString(separator: string): string;

    /**
     * Gets the element at the front of the queue if not empty.
     * @returns {T | null} The front element.
     */
    front(): T | null;

    /**
     * Adds an element to the end of the queue.
     * @param {T} elem The element to be added.
     */
    enqueue(elem: T): void;

    /**
     * Removes the front element from the queue if not empty.
     * @returns {boolean} `true` on success, `false` otherwise.
     */
    dequeue(): boolean;
}

export default IQueue;