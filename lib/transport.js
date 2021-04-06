"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Transport = undefined;

var _errors = require("./errors.js");

var _frames = require("./frames.js");

var _log = require("./log.js");

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

var Transport = function Transport(identifier, protocol_id, frame_type, handler) {
    this.identifier = identifier;
    this.protocol_id = protocol_id;
    this.frame_type = frame_type;
    this.handler = handler;
    this.pending = [];
    this.header_sent = undefined;
    this.header_received = undefined;
    this.write_complete = false;
    this.read_complete = false;
};

Transport.prototype.has_writes_pending = function () {
    return this.pending.length > 0;
};

Transport.prototype.encode = function (frame) {
    var buffer = _frames.frames.write_frame(frame);
    _log.logjs.frames('[%s] PENDING: %o', this.identifier, JSON.stringify(frame));
    this.pending.push(buffer);
};

Transport.prototype.write = function (socket) {
    if (!this.header_sent) {
        var buffer = new Buffer(8);
        var header = { protocol_id: this.protocol_id, major: 1, minor: 0, revision: 0 };
        _frames.frames.write_header(buffer, header);
        socket.write(buffer);
        this.header_sent = header;
    }
    for (var i = 0; i < this.pending.length; i++) {
        socket.write(this.pending[i]);
        _log.logjs.raw('[%s] SENT: %o', this.identifier, this.pending[i]);
    }
    this.pending = [];
};

Transport.prototype.read = function (buffer) {
    var offset = 0;
    if (!this.header_received) {
        if (buffer.length < 8) {
            return offset;
        } else {
            this.header_received = _frames.frames.read_header(buffer);
            _log.logjs.frames('[%s] RECV: %o', this.identifier, this.header_received);
            if (this.header_received.protocol_id !== this.protocol_id) {
                if (this.protocol_id === 3 && this.header_received.protocol_id === 0) {
                    throw new _errors.errorsjs.ProtocolError('Expecting SASL layer');
                } else if (this.protocol_id === 0 && this.header_received.protocol_id === 3) {
                    throw new _errors.errorsjs.ProtocolError('SASL layer not enabled');
                } else {
                    throw new _errors.errorsjs.ProtocolError('Invalid AMQP protocol id ' + this.header_received.protocol_id + ' expecting: ' + this.protocol_id);
                }
            }
            offset = 8;
        }
    }
    while (offset < buffer.length - 4 && !this.read_complete) {
        var frame_size = buffer.readUInt32BE(offset);
        _log.logjs.io('[%s] got frame of size %d', this.identifier, frame_size);
        if (buffer.length < offset + frame_size) {
            _log.logjs.io('[%s] incomplete frame; have only %d of %d', this.identifier, buffer.length - offset, frame_size);
            //don't have enough data for a full frame yet
            break;
        } else {
            var frame = _frames.frames.read_frame(buffer.slice(offset, offset + frame_size));
            _log.logjs.frames('[%s] RECV: %o', this.identifier, JSON.stringify(frame));
            if (frame.type !== this.frame_type) {
                throw new _errors.errorsjs.ProtocolError('Invalid frame type: ' + frame.type);
            }
            offset += frame_size;
            if (frame.performative) {
                frame.performative.dispatch(this.handler, frame);
            }
        }
    }
    return offset;
};

var mod_Transport;

exports.Transport = mod_Transport = Transport;
exports.Transport = mod_Transport;