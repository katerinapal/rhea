"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.containerjs = undefined;

var _connection = require("./connection.js");

var _log = require("./log.js");

var _rpc = require("./rpc.js");

var _sasl = require("./sasl.js");

var _util = require("./util.js");

var _net = require("net");

var _net2 = _interopRequireDefault(_net);

var _tls = require("tls");

var _tls2 = _interopRequireDefault(_tls);

var _events = require("events");

var _events2 = _interopRequireDefault(_events);

var _ws = require("./ws.js");

var _filter = require("./filter.js");

var _types = require("./types.js");

var _message = require("./message.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

var EventEmitter = _events2.default.EventEmitter;

var Container = function Container(options) {
    this.options = options ? Object.create(options) : {};
    if (!this.options.id) {
        this.options.id = (0, _util.generate_uuid)();
    }
    this.id = this.options.id;
    this.sasl_server_mechanisms = _sasl.sasljs.server_mechanisms();
};

Container.prototype = Object.create(EventEmitter.prototype);
Container.prototype.constructor = Container;
Container.prototype.dispatch = function (name) {
    _log.logjs.events('Container got event: ' + name);
    EventEmitter.prototype.emit.apply(this, arguments);
    if (this.listeners(name).length) {
        return true;
    } else {
        return false;
    }
};

Container.prototype.connect = function (options) {
    return new _connection.Connection(options, this).connect();
};

Container.prototype.listen = function (options) {
    var container = this;
    var server;
    if (options.transport === undefined || options.transport === 'tcp') {
        server = _net2.default.createServer();
        server.on('connection', function (socket) {
            new _connection.Connection(options, container).accept(socket);
        });
    } else if (options.transport === 'tls' || options.transport === 'ssl') {
        server = _tls2.default.createServer(options);
        server.on('secureConnection', function (socket) {
            new _connection.Connection(options, container).accept(socket);
        });
    } else {
        throw Error('Unrecognised transport: ' + options.transport);
    }
    if (process.version.match(/v0\.10\.\d+/)) {
        server.listen(options.port, options.host);
    } else {
        server.listen(options);
    }
    return server;
};

Container.prototype.create_container = function (options) {
    return new Container(options);
};

Container.prototype.get_option = function (name, default_value) {
    if (this.options[name] !== undefined) return this.options[name];else return default_value;
};

Container.prototype.generate_uuid = _util.generate_uuid;
Container.prototype.rpc_server = function (address, options) {
    return _rpc.rpcjs.server(this, address, options);
};
Container.prototype.rpc_client = function (address) {
    return _rpc.rpcjs.client(this, address);
};
Container.prototype.websocket_accept = function (socket, options) {
    new _connection.Connection(options, this).accept(_ws.wsjs.wrap(socket));
};
Container.prototype.websocket_connect = _ws.wsjs.connect;
Container.prototype.filter = _filter.filterjs;
Container.prototype.types = _types.types;
Container.prototype.message = _message.message;

exports.containerjs = mod_containerjs = new Container();
var mod_containerjs;
exports.containerjs = mod_containerjs;