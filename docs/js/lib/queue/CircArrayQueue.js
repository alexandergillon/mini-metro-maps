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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _CircArrayQueue_instances, _a, _CircArrayQueue_elems, _CircArrayQueue_startIdx, _CircArrayQueue_numElems, _CircArrayQueue_endIdx_get, _CircArrayQueue_growthFactor, _CircArrayQueue_resize;
/**
 * Circular array queue -- an implementation of the Queue ADT using a circular
 * array along with a dynamic resizing scheme.
 *
 * @class CircArrayQueue
 * @typedef {CircArrayQueue}
 * @template T The type of all elements in the queue.
 * @implements {IQueue<T>}
 */
class CircArrayQueue {
    /**
     * Creates an empty queue.
     * @constructor
     * @template T The type of all elements in the queue.
     * @param {number} initCapacity Initial anticipated number of elements
     *      to be stored in the queue.
     */
    constructor(initCapacity = 2) {
        _CircArrayQueue_instances.add(this);
        /**
         * The underlying array for storing queue elements of type `T`.
         * @type {T[]}
         */
        _CircArrayQueue_elems.set(this, void 0);
        /**
         * Position of the front element in the underlying array.
         * @type {number}
         */
        _CircArrayQueue_startIdx.set(this, void 0);
        /**
         * Number of elements in the queue.
         * @type {number}
         */
        _CircArrayQueue_numElems.set(this, void 0);
        if (initCapacity <= 0 ||
            !Number.isInteger(initCapacity) ||
            !Number.isFinite(initCapacity)) {
            throw Error("initCapacity cannot be converted into " +
                "a finite positive integer");
        }
        __classPrivateFieldSet(this, _CircArrayQueue_elems, new Array(initCapacity), "f");
        __classPrivateFieldSet(this, _CircArrayQueue_startIdx, 0, "f");
        __classPrivateFieldSet(this, _CircArrayQueue_numElems, 0, "f");
    }
    /**
     * The maximum number of elements the queue can store without allocating
     * additional memory.
     * @readonly
     * @type {number}
     */
    get capacity() {
        return __classPrivateFieldGet(this, _CircArrayQueue_elems, "f").length;
    }
    /**
     * Number of elements in the queue.
     * @readonly
     * @type {number}
     */
    get size() {
        return __classPrivateFieldGet(this, _CircArrayQueue_numElems, "f");
    }
    /**
     * Whether the queue has no elements.
     * @returns {boolean} `true` if the queue is empty, `false` otherwise.
     */
    empty() {
        return __classPrivateFieldGet(this, _CircArrayQueue_numElems, "f") === 0;
    }
    /**
     * Iterates over all elements of this queue from the front.
     *
     * The given operation will be performed on each element iterated.
     *
     * @param action The operation to be performed on each element.
     */
    iter(action) {
        if (this.size === 0)
            return;
        const n = this.size;
        for (let i = 0; i < n; ++i) {
            action(__classPrivateFieldGet(this, _CircArrayQueue_elems, "f")[(__classPrivateFieldGet(this, _CircArrayQueue_startIdx, "f") + i) % this.capacity]);
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
    toString(separator = ' ') {
        let frontToEnd = '';
        const n = this.size;
        for (let i = 0; i < n; ++i) {
            frontToEnd =
                `${frontToEnd}${frontToEnd.length > 0 ? separator : ''}` +
                    `${__classPrivateFieldGet(this, _CircArrayQueue_elems, "f")[(__classPrivateFieldGet(this, _CircArrayQueue_startIdx, "f") + i) % this.capacity]}`;
        }
        return `[${frontToEnd}]`;
    }
    /**
     * Gets the element at the front of the queue if not empty.
     * @returns {T | null} The front element.
     */
    front() {
        if (this.empty()) {
            return null;
        }
        return __classPrivateFieldGet(this, _CircArrayQueue_elems, "f")[__classPrivateFieldGet(this, _CircArrayQueue_startIdx, "f")];
    }
    /**
     * Adds an element to the end of the queue.
     * @param {T} elem The element to be added.
     */
    enqueue(elem) {
        var _b;
        __classPrivateFieldGet(this, _CircArrayQueue_instances, "m", _CircArrayQueue_resize).call(this);
        __classPrivateFieldGet(this, _CircArrayQueue_elems, "f")[__classPrivateFieldGet(this, _CircArrayQueue_instances, "a", _CircArrayQueue_endIdx_get)] = elem;
        __classPrivateFieldSet(this, _CircArrayQueue_numElems, (_b = __classPrivateFieldGet(this, _CircArrayQueue_numElems, "f"), ++_b), "f");
    }
    /**
     * Removes the front element from the queue if not empty.
     * @returns {boolean} `true` on success, `false` otherwise.
     */
    dequeue() {
        var _b;
        if (this.empty()) {
            return false;
        }
        delete __classPrivateFieldGet(this, _CircArrayQueue_elems, "f")[__classPrivateFieldGet(this, _CircArrayQueue_startIdx, "f")];
        __classPrivateFieldSet(this, _CircArrayQueue_startIdx, (__classPrivateFieldGet(this, _CircArrayQueue_startIdx, "f") + 1) % this.capacity, "f");
        __classPrivateFieldSet(this, _CircArrayQueue_numElems, (_b = __classPrivateFieldGet(this, _CircArrayQueue_numElems, "f"), --_b), "f");
        __classPrivateFieldGet(this, _CircArrayQueue_instances, "m", _CircArrayQueue_resize).call(this, false);
        return true;
    }
}
_a = CircArrayQueue, _CircArrayQueue_elems = new WeakMap(), _CircArrayQueue_startIdx = new WeakMap(), _CircArrayQueue_numElems = new WeakMap(), _CircArrayQueue_instances = new WeakSet(), _CircArrayQueue_endIdx_get = function _CircArrayQueue_endIdx_get() {
    return (__classPrivateFieldGet(this, _CircArrayQueue_startIdx, "f") + __classPrivateFieldGet(this, _CircArrayQueue_numElems, "f")) % this.capacity;
}, _CircArrayQueue_resize = function _CircArrayQueue_resize(grow = true) {
    if (grow) {
        if (__classPrivateFieldGet(this, _CircArrayQueue_numElems, "f") === this.capacity) {
            __classPrivateFieldGet(this, _CircArrayQueue_elems, "f").length *=
                __classPrivateFieldGet(_a, _a, "f", _CircArrayQueue_growthFactor);
        }
    }
    else {
        if (this.capacity >= 2 &&
            __classPrivateFieldGet(this, _CircArrayQueue_numElems, "f") * 4 < this.capacity) {
            // Create new array of half the size as existing one
            const newElems = new Array(Math.floor(__classPrivateFieldGet(this, _CircArrayQueue_elems, "f").length / __classPrivateFieldGet(_a, _a, "f", _CircArrayQueue_growthFactor)));
            // Copy all elements into new array
            const n = __classPrivateFieldGet(this, _CircArrayQueue_numElems, "f");
            for (let i = 0; i < n; ++i) {
                newElems[i] =
                    __classPrivateFieldGet(this, _CircArrayQueue_elems, "f")[(__classPrivateFieldGet(this, _CircArrayQueue_startIdx, "f") + i) % this.capacity];
            }
            // Reset start index
            __classPrivateFieldSet(this, _CircArrayQueue_startIdx, 0, "f");
            // Replace existing array with new array
            __classPrivateFieldSet(this, _CircArrayQueue_elems, newElems, "f");
        }
    }
};
/**
 * Growth factor for the underlying array.
 * @static
 * @type {number}
 */
_CircArrayQueue_growthFactor = { value: 2 };
export default CircArrayQueue;
