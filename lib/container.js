import { Connection as connection_Connection } from "./connection.js";
import { logjs as log_logjs } from "./log.js";
import { rpcjs as rpc } from "./rpc.js";
import { sasljs as sasl } from "./sasl.js";
import { generate_uuid as utiljs_generate_uuid } from "./util.js";
import ext_net_net from "net";
import ext_tls_tls from "tls";
import ext_events from "events";
import { wsjs as ws } from "./ws.js";
import { filterjs } from "./filter.js";
import { types as typesjs } from "./types.js";
import { message as message_message } from "./message.js";
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

var EventEmitter = ext_events.EventEmitter;

var Container = function (options) {
    this.options = options ? Object.create(options) : {};
    if (!this.options.id) {
        this.options.id = utiljs_generate_uuid();
    }
    this.id = this.options.id;
    this.sasl_server_mechanisms = sasl.server_mechanisms();
};

Container.prototype = Object.create(EventEmitter.prototype);
Container.prototype.constructor = Container;
Container.prototype.dispatch = function(name) {
    log_logjs.events('Container got event: ' + name);
    EventEmitter.prototype.emit.apply(this, arguments);
    if (this.listeners(name).length) {
        return true;
    } else {
        return false;
    }
};

Container.prototype.connect = function (options) {
    return new connection_Connection(options, this).connect();
};

Container.prototype.listen = function (options) {
    var container = this;
    var server;
    if (options.transport === undefined || options.transport === 'tcp') {
        server = ext_net_net.createServer();
        server.on('connection', function (socket) {
            new connection_Connection(options, container).accept(socket);
        });
    } else if (options.transport === 'tls' || options.transport === 'ssl') {
        server = ext_tls_tls.createServer(options);
        server.on('secureConnection', function (socket) {
            new connection_Connection(options, container).accept(socket);
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
    if (this.options[name] !== undefined) return this.options[name];
    else return default_value;
};

Container.prototype.generate_uuid = utiljs_generate_uuid;
Container.prototype.rpc_server = function(address, options) { return rpc.server(this, address, options); };
Container.prototype.rpc_client = function(address) { return rpc.client(this, address); };
Container.prototype.websocket_accept = function(socket, options) {
    new connection_Connection(options, this).accept(ws.wrap(socket));
};
Container.prototype.websocket_connect = ws.connect;
Container.prototype.filter = filterjs;
Container.prototype.types = typesjs;
Container.prototype.message = message_message;

mod_containerjs = new Container();
var mod_containerjs;
export { mod_containerjs as containerjs };
