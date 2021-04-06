import ext_debug_debug from "debug";
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

mod_logjs = {
    'frames' : ext_debug_debug('rhea:frames'),
    'raw' : ext_debug_debug('rhea:raw'),
    'reconnect' : ext_debug_debug('rhea:reconnect'),
    'events' : ext_debug_debug('rhea:events'),
    'message' : ext_debug_debug('rhea:message'),
    'flow' : ext_debug_debug('rhea:flow'),
    'io' : ext_debug_debug('rhea:io')
};
var mod_logjs;
export { mod_logjs as logjs };
