var receiver_filter;
var sender_filter;
var is_receiver;
var is_sender;
var and;
var clone;
var uuid_to_string;
var uuid4;
var generate_uuid;
import { errorsjs as errors } from "./errors.js";
/*
 * Copyright 2015 Red Hat Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

generate_uuid = function () {
    return uuid_to_string(uuid4());
};

uuid4 = function () {
    var bytes = new Buffer(16);
    for (var i = 0; i < bytes.length; i++) {
        bytes[i] = Math.random()*255|0;
    }

    // From RFC4122, the version bits are set to 0100
    bytes[7] &= 0x0F;
    bytes[7] |= 0x40;

    // From RFC4122, the top two bits of byte 8 get set to 01
    bytes[8] &= 0x3F;
    bytes[8] |= 0x80;

    return bytes;
};


uuid_to_string = function (buffer) {
    if (buffer.length === 16) {
        var chunks = [buffer.slice(0, 4), buffer.slice(4, 6), buffer.slice(6, 8), buffer.slice(8, 10), buffer.slice(10, 16)];
        return chunks.map(function (b) { return b.toString('hex'); }).join('-');
    } else {
        throw new errors.TypeError('Not a UUID, expecting 16 byte buffer');
    }
};

clone = function (o) {
    var copy = Object.create(o.prototype || {});
    var names = Object.getOwnPropertyNames(o);
    for (var i = 0; i < names.length; i++) {
        var key = names[i];
        copy[key] = o[key];
    }
    return copy;
};

and = function (f, g) {
    if (g === undefined) return f;
    return function (o) {
        return f(o) && g(o);
    };
};

is_sender = function (o) { return o.is_sender(); };
is_receiver = function (o) { return o.is_receiver(); };
sender_filter = function (filter) { return and(is_sender, filter); };
receiver_filter = function (filter) { return and(is_receiver, filter); };

export { generate_uuid, uuid4, uuid_to_string, clone, sender_filter, receiver_filter };
