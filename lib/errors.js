import ext_util_util from "util";
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

function ProtocolError(message) {
    Error.call(this);
    this.message = message;
    this.name = 'ProtocolError';
}
ext_util_util.inherits(ProtocolError, Error);

function TypeError(message) {
    ProtocolError.call(this, message);
    this.message = message;
    this.name = 'TypeError';
}

ext_util_util.inherits(TypeError, ProtocolError);

function ConnectionError(message, condition, connection) {
    Error.call(this, message);
    this.message = message;
    this.name = 'ConnectionError';
    this.condition = condition;
    this.description = message;
    this.connection = connection;
}

ext_util_util.inherits(ConnectionError, Error);

mod_errorsjs = {
    ProtocolError: ProtocolError,
    TypeError: TypeError,
    ConnectionError: ConnectionError
};
var mod_errorsjs;
export { mod_errorsjs as errorsjs };
