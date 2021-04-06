import { errorsjs as errors } from "./errors.js";
import { frames as frames_frames } from "./frames.js";
import { Transport as transport_Transport } from "./transport.js";
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

var sasl_codes = {
    'OK':0,
    'AUTH':1,
    'SYS':2,
    'SYS_PERM':3,
    'SYS_TEMP':4,
};

var SASL_PROTOCOL_ID = 0x03;

function extract(buffer) {
    var results = [];
    var start = 0;
    var i = 0;
    while (i < buffer.length) {
        if (buffer[i] === 0x00) {
            if (i > start) results.push(buffer.toString('utf8', start, i));
            else results.push(null);
            start = ++i;
        } else {
            ++i;
        }
    }
    if (i > start) results.push(buffer.toString('utf8', start, i));
    else results.push(null);
    return results;
}

var PlainServer = function(callback) {
    this.callback = callback;
    this.outcome = undefined;
    this.username = undefined;
};

PlainServer.prototype.start = function(response, hostname) {
    var fields = extract(response);
    if (fields.length !== 3) {
        this.connection.sasl_failed('Unexpected response in PLAIN, got ' + fields.length + ' fields, expected 3');
    }
    if (this.callback(fields[1], fields[2], hostname)) {
        this.outcome = true;
        this.username = fields[1];
    } else {
        this.outcome = false;
    }
};

var PlainClient = function(username, password) {
    this.username = username;
    this.password = password;
};

PlainClient.prototype.start = function() {
    var response = new Buffer(1 + this.username.length + 1 + this.password.length);
    response.writeUInt8(0, 0);
    response.write(this.username, 1);
    response.writeUInt8(0, 1 + this.username.length);
    response.write(this.password, 1 + this.username.length + 1);
    return response;
};

var AnonymousServer = function() {
    this.outcome = undefined;
    this.username = undefined;
};

AnonymousServer.prototype.start = function(response) {
    this.outcome = true;
    this.username = response ? response.toString('utf8') : 'anonymous';
};

var AnonymousClient = function(name) {
    this.username = name ? name : 'anonymous';
};

AnonymousClient.prototype.start = function() {
    var response = new Buffer(1 + this.username.length);
    response.writeUInt8(0, 0);
    response.write(this.username, 1);
    return response;
};

var ExternalServer = function() {
    this.outcome = undefined;
    this.username = undefined;
};

ExternalServer.prototype.start = function() {
    this.outcome = true;
};

var ExternalClient = function() {
    this.username = undefined;
};

ExternalClient.prototype.start = function() {
    return '';
};

ExternalClient.prototype.step = function() {
    return '';
};

/**
 * The mechanisms argument is a map of mechanism names to factory
 * functions for objects that implement that mechanism.
 */
var SaslServer = function (connection, mechanisms) {
    this.connection = connection;
    this.transport = new transport_Transport(connection.amqp_transport.identifier, SASL_PROTOCOL_ID, frames_frames.TYPE_SASL, this);
    this.next = connection.amqp_transport;
    this.mechanisms = mechanisms;
    this.mechanism = undefined;
    this.outcome = undefined;
    this.username = undefined;
    var mechlist = Object.getOwnPropertyNames(mechanisms);
    this.transport.encode(frames_frames.sasl_frame(frames_frames.sasl_mechanisms({sasl_server_mechanisms:mechlist}).described()));
};

SaslServer.prototype.do_step = function (challenge) {
    if (this.mechanism.outcome === undefined) {
        this.transport.encode(frames_frames.sasl_frame(frames_frames.sasl_challenge({'challenge':challenge}).described()));
    } else {
        this.outcome = this.mechanism.outcome ? sasl_codes.OK : sasl_codes.AUTH;
        this.transport.encode(frames_frames.sasl_frame(frames_frames.sasl_outcome({code: this.outcome}).described()));
        if (this.outcome === sasl_codes.OK) {
            this.username = this.mechanism.username;
            this.transport.write_complete = true;
            this.transport.read_complete = true;
        }
    }
};

SaslServer.prototype.on_sasl_init = function (frame) {
    var f = this.mechanisms[frame.performative.mechanism];
    if (f) {
        this.mechanism = f();
        var challenge = this.mechanism.start(frame.performative.initial_response, frame.performative.hostname);
        this.do_step(challenge);
    } else {
        this.outcome = sasl_codes.AUTH;
        this.transport.encode(frames_frames.sasl_frame(frames_frames.sasl_outcome({code: this.outcome}).described()));
    }
};
SaslServer.prototype.on_sasl_response = function (frame) {
    this.do_step(this.mechanism.step(frame.performative.response));
};

SaslServer.prototype.has_writes_pending = function () {
    return this.transport.has_writes_pending() || this.next.has_writes_pending();
};

SaslServer.prototype.write = function (socket) {
    if (this.transport.write_complete && this.transport.pending.length === 0) {
        return this.next.write(socket);
    } else {
        return this.transport.write(socket);
    }
};

SaslServer.prototype.read = function (buffer) {
    if (this.transport.read_complete) {
        return this.next.read(buffer);
    } else {
        return this.transport.read(buffer);
    }
};

var SaslClient = function (connection, mechanisms, hostname) {
    this.connection = connection;
    this.transport = new transport_Transport(connection.amqp_transport.identifier, SASL_PROTOCOL_ID, frames_frames.TYPE_SASL, this);
    this.next = connection.amqp_transport;
    this.mechanisms = mechanisms;
    this.mechanism = undefined;
    this.mechanism_name = undefined;
    this.hostname = hostname;
    this.failed = false;
};

SaslClient.prototype.on_sasl_mechanisms = function (frame) {
    for (var i = 0; this.mechanism === undefined && i < frame.performative.sasl_server_mechanisms.length; i++) {
        var mech = frame.performative.sasl_server_mechanisms[i];
        var f = this.mechanisms[mech];
        if (f) {
            this.mechanism = f();
            this.mechanism_name = mech;
        }
    }
    if (this.mechanism) {
        var response = this.mechanism.start();
        var init = {'mechanism':this.mechanism_name,'initial_response':response};
        if (this.hostname) {
            init.hostname = this.hostname;
        }
        this.transport.encode(frames_frames.sasl_frame(frames_frames.sasl_init(init).described()));
    } else {
        this.failed = true;
        this.connection.sasl_failed('No suitable mechanism; server supports ' + frame.performative.sasl_server_mechanisms);
    }
};
SaslClient.prototype.on_sasl_challenge = function (frame) {
    var response = this.mechanism.step(frame.performative.challenge);
    this.transport.encode(frames_frames.sasl_frame(frames_frames.sasl_response({'response':response}).described()));
};
SaslClient.prototype.on_sasl_outcome = function (frame) {
    switch (frame.performative.code) {
    case sasl_codes.OK:
        this.transport.read_complete = true;
        this.transport.write_complete = true;
        break;
    default:
        this.transport.write_complete = true;
        this.connection.sasl_failed('Failed to authenticate: ' + frame.performative.code);
    }
};

SaslClient.prototype.has_writes_pending = function () {
    return this.transport.has_writes_pending() || this.next.has_writes_pending();
};

SaslClient.prototype.write = function (socket) {
    if (this.transport.write_complete) {
        return this.next.write(socket);
    } else {
        return this.transport.write(socket);
    }
};

SaslClient.prototype.read = function (buffer) {
    if (this.transport.read_complete) {
        return this.next.read(buffer);
    } else {
        return this.transport.read(buffer);
    }
};

var SelectiveServer = function (connection, mechanisms) {
    this.header_received = false;
    this.transports = {
        0: connection.amqp_transport,
        3: new SaslServer(connection, mechanisms)
    };
    this.selected = undefined;
};

SelectiveServer.prototype.has_writes_pending = function () {
    return this.header_received && this.selected.has_writes_pending();
};

SelectiveServer.prototype.write = function (socket) {
    if (this.selected) {
        return this.selected.write(socket);
    } else {
        return 0;
    }
};

SelectiveServer.prototype.read = function (buffer) {
    if (!this.header_received) {
        if (buffer.length < 8) {
            return 0;
        } else {
            this.header_received = frames_frames.read_header(buffer);
            this.selected = this.transports[this.header_received.protocol_id];
            if (this.selected === undefined) {
                throw new errors.ProtocolError('Invalid AMQP protocol id ' + this.header_received.protocol_id);
            }
        }
    }
    return this.selected.read(buffer);
};

var default_server_mechanisms = {
    enable_anonymous: function () {
        this['ANONYMOUS'] = function() { return new AnonymousServer(); };
    },
    enable_plain: function (callback) {
        this['PLAIN'] = function() { return new PlainServer(callback); };
    }
};

var default_client_mechanisms = {
    enable_anonymous: function (name) {
        this['ANONYMOUS'] = function() { return new AnonymousClient(name); };
    },
    enable_plain: function (username, password) {
        this['PLAIN'] = function() { return new PlainClient(username, password); };
    },
    enable_external: function () {
        this['EXTERNAL'] = function() { return new ExternalClient(); };
    }
};

mod_sasljs = {
    Client : SaslClient,
    Server : SaslServer,
    Selective: SelectiveServer,
    server_mechanisms : function () {
        return Object.create(default_server_mechanisms);
    },
    client_mechanisms : function () {
        return Object.create(default_client_mechanisms);
    },
    server_add_external: function (mechs) {
        mechs['EXTERNAL'] = function() { return new ExternalServer(); };
        return mechs;
    }
};
var mod_sasljs;
export { mod_sasljs as sasljs };
