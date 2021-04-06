import ext_assert_assert from "assert";
import { containerjs as rhea } from "../lib/container.js";
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

describe('connection fields', function() {
    var container, listener;

    beforeEach(function(done) {
        container = rhea.create_container({non_fatal_errors:[]});
        listener = container.listen({port:0});
        listener.on('listening', function() {
            done();
        });
    });

    function open_test(fields, verification) {
        return function(done) {
            container.on('connection_open', function(context) {
                verification(context.connection);
                done();
            });
            fields.port = listener.address().port;
            container.connect(fields).on('connection_open', function(context) {});
        };
    }

    function close_test(error, verification) {
        return function(done) {
            container.on('connection_close', function(context) {
                verification(context.connection);
                done();
            });
            var c = container.connect(listener.address());
            c.on('connection_open', function(context) {
                context.connection.local.close.error = error;
                context.connection.close();
            });
            c.on('connection_close', function(context) {});
        };
    }
    function close_test_simple(error, verification) {
        return function(done) {
            container.on('connection_close', function(context) {
                verification(context.connection);
                done();
            });
            var c = container.connect(listener.address());
            c.on('connection_open', function(context) {
                context.connection.close(error);
            });
            c.on('connection_close', function(context) {});
        };
    }

    afterEach(function() {
        listener.close();
    });

    it('single offered capability', open_test({offered_capabilities:'foo'}, function(connection) {
        ext_assert_assert.equal(connection.remote.open.offered_capabilities, 'foo');
    }));
    it('multiple offered capabilities', open_test({offered_capabilities:['foo', 'bar']}, function(connection) {
        ext_assert_assert.equal(connection.remote.open.offered_capabilities.length, 2);
        ext_assert_assert.equal(connection.remote.open.offered_capabilities[0], 'foo');
        ext_assert_assert.equal(connection.remote.open.offered_capabilities[1], 'bar');
    }));
    it('single desired capability', open_test({desired_capabilities:'foo'}, function(connection) {
        ext_assert_assert.equal(connection.remote.open.desired_capabilities, 'foo');
    }));
    it('multiple desired capabilities', open_test({desired_capabilities:['a', 'b', 'c']}, function(connection) {
        ext_assert_assert.equal(connection.remote.open.desired_capabilities.length, 3);
        ext_assert_assert.equal(connection.remote.open.desired_capabilities[0], 'a');
        ext_assert_assert.equal(connection.remote.open.desired_capabilities[1], 'b');
        ext_assert_assert.equal(connection.remote.open.desired_capabilities[2], 'c');
    }));
    it('hostname explicit', open_test({hostname:'my-virtual-host'}, function(connection) {
        ext_assert_assert.equal(connection.remote.open.hostname, 'my-virtual-host');
    }));
    it('hostname aliased', open_test({hostname:'my-virtual-host'}, function(connection) {
        ext_assert_assert.equal(connection.hostname, 'my-virtual-host');
    }));
    it('container_id explicit', open_test({container_id:'this-is-me'}, function(connection) {
        ext_assert_assert.equal(connection.remote.open.container_id, 'this-is-me');
    }));
    it('container_id aliased', open_test({container_id:'this-is-me'}, function(connection) {
        ext_assert_assert.equal(connection.container_id, 'this-is-me');
    }));
    it('max frame size explicit', open_test({max_frame_size:5432}, function(connection) {
        ext_assert_assert.equal(connection.remote.open.max_frame_size, 5432);
    }));
    it('max frame size aliased', open_test({max_frame_size:5432}, function(connection) {
        ext_assert_assert.equal(connection.max_frame_size, 5432);
    }));
    it('channel max explicit', open_test({channel_max:10}, function(connection) {
        ext_assert_assert.equal(connection.remote.open.channel_max, 10);
    }));
    it('channel max aliased', open_test({channel_max:10}, function(connection) {
        ext_assert_assert.equal(connection.channel_max, 10);
    }));
    it('idle time out explicit', open_test({idle_time_out:1000}, function(connection) {
        ext_assert_assert.equal(connection.remote.open.idle_time_out, 1000);
    }));
    it('idle time out aliased', open_test({idle_time_out:1000}, function(connection) {
        ext_assert_assert.equal(connection.idle_time_out, 1000);
    }));
    it('properties explicit', open_test({properties:{flavour:'vanilla', scoops:2, cone:true}}, function(connection) {
        ext_assert_assert.equal(connection.remote.open.properties.flavour, 'vanilla');
        ext_assert_assert.equal(connection.remote.open.properties.scoops, 2);
        ext_assert_assert.equal(connection.remote.open.properties.cone, true);
    }));
    it('properties aliased', open_test({properties:{flavour:'vanilla', scoops:2, cone:true}}, function(connection) {
        ext_assert_assert.equal(connection.properties.flavour, 'vanilla');
        ext_assert_assert.equal(connection.properties.scoops, 2);
        ext_assert_assert.equal(connection.properties.cone, true);
    }));
    it('error on close', close_test({condition:'amqp:connection:forced', description:'testing error on close'}, function(connection) {
        var error = connection.remote.close.error;
        ext_assert_assert.equal(error.condition, 'amqp:connection:forced');
        ext_assert_assert.equal(error.description, 'testing error on close');
    }));
    it('pass error to close', close_test_simple({condition:'amqp:connection:forced', description:'testing error on close'}, function(connection) {
        var error = connection.remote.close.error;
        ext_assert_assert.equal(error.condition, 'amqp:connection:forced');
        ext_assert_assert.equal(error.description, 'testing error on close');
    }));
});
describe('connection error handling', function() {
    var container, listener;

    beforeEach(function(done) {
        container = rhea.create_container();
        container.options.non_fatal_errors = [];
        listener = container.listen({port:0});
        listener.on('listening', function() {
            done();
        });
    });

    afterEach(function() {
        listener.close();
    });

    it('error and close handled', function (done) {
        var error_handler_called;
        var close_handler_called;
        container.on('connection_open', function(context) {
            context.connection.close({condition:'amqp:connection:forced', description:'testing error on close'});
        });
        container.on('connection_close', function(context) {
            ext_assert_assert.equal(error_handler_called, true);
            ext_assert_assert.equal(close_handler_called, true);
            done();
        });
        var c = container.connect(listener.address());
        c.on('connection_error', function(context) {
            error_handler_called = true;
            var error = context.connection.error;
            ext_assert_assert.equal(error.condition, 'amqp:connection:forced');
            ext_assert_assert.equal(error.description, 'testing error on close');
        });
        c.on('connection_close', function(context) {
            close_handler_called = true;
            var error = context.connection.error;
            ext_assert_assert.equal(error.condition, 'amqp:connection:forced');
            ext_assert_assert.equal(error.description, 'testing error on close');
        });
    });
    it('error handled', function (done) {
        var error_handler_called;
        container.on('connection_open', function(context) {
            context.connection.close({condition:'amqp:connection:forced', description:'testing error on close'});
        });
        container.on('connection_close', function(context) {
            ext_assert_assert.equal(error_handler_called, true);
            done();
        });
        var c = rhea.create_container({non_fatal_errors:[]}).connect(listener.address());
        c.on('connection_error', function(context) {
            error_handler_called = true;
            var error = context.connection.error;
            ext_assert_assert.equal(error.condition, 'amqp:connection:forced');
            ext_assert_assert.equal(error.description, 'testing error on close');
        });
    });
    it('unhandled error', function (done) {
        var error_handler_called;
        container.on('connection_open', function(context) {
            context.connection.close({condition:'amqp:connection:forced', description:'testing error on close'});
        });
        container.on('connection_close', function(context) {
            done();
        });
        var container2 = rhea.create_container({non_fatal_errors:[]});
        container2.on('error', function (error) {
            ext_assert_assert.equal(error.condition, 'amqp:connection:forced');
            ext_assert_assert.equal(error.description, 'testing error on close');
        });
        var c = container2.connect(listener.address());
    });
});

describe('connection events', function() {
    var listener;

    beforeEach(function(done) {
        var container = rhea.create_container();
        container.on('connection_open', function(context) {
            var conn = context.connection;
            conn.local.open.offered_capabilities = conn.remote.open.desired_capabilities;
        });
        listener = container.listen({port:0});
        listener.on('listening', function() {
            done();
        });
    });

    afterEach(function() {
        listener.close();
    });

    it('dispatches events to correct handlers', function(done) {
        var latch = {
            count: 3,
            decrement: function() {
                if (--this.count == 0) done();
            }
        };
        var container = rhea.create_container();

        var c1 = container.connect({port: listener.address().port, desired_capabilities:'one'});
        c1.on('connection_open', function (context) {
            ext_assert_assert.equal(context.connection.remote.open.offered_capabilities, 'one');
            latch.decrement();
            context.connection.close();
        });
        var c2 = container.connect({port: listener.address().port, desired_capabilities:'two'});
        c2.on('connection_open', function (context) {
            ext_assert_assert.equal(context.connection.remote.open.offered_capabilities, 'two');
            latch.decrement();
            context.connection.close();
        });
        var c3 = container.connect({port: listener.address().port, desired_capabilities:'three'});
        //third connection has no handler defined, so will default to container level handler:
        container.on('connection_open', function(context) {
            ext_assert_assert.equal(context.connection.remote.open.offered_capabilities, 'three');
            latch.decrement();
            context.connection.close();
        });
    });
});

describe('container id', function() {
    var listener;
    var client_container_name;

    beforeEach(function(done) {
        var container = rhea.create_container({id:'my-server-container'});
        container.on('connection_open', function(context) {
            client_container_name = context.connection.remote.open.container_id;
        });
        listener = container.listen({port:0});
        listener.on('listening', function() {
            done();
        });
    });

    afterEach(function() {
        listener.close();
    });

    it('correctly sets desired container id', function(done) {
        var container = rhea.create_container({id:'my-client-container'});

        var c1 = container.connect(listener.address());
        c1.on('connection_open', function (context) {
            ext_assert_assert.equal(context.connection.remote.open.container_id, 'my-server-container');
            ext_assert_assert.equal(client_container_name, 'my-client-container');
            context.connection.close();
            done();
        });
    });
});

describe('connection send', function() {
    var listener;
    var received = {};

    beforeEach(function(done) {
        var container = rhea.create_container();
        container.on('message', function(context) {
            received[context.message.to] = context.message.body;
        });
        listener = container.listen({port:0});
        listener.on('listening', function() {
            done();
        });
    });

    afterEach(function() {
        listener.close();
        received = {};
    });

    it('sends message via default sender', function(done) {
        var container = rhea.create_container();

        var c = container.connect(listener.address());
        var count = 0;
        c.on('accepted', function (context) {
            if (++count === 2) {
                ext_assert_assert.equal(received['a'], 'A');
                ext_assert_assert.equal(received['b'], 'B');
                context.sender.close();
                context.connection.close();
                done();
            }
        });
        c.send({to:'a',body:'A'});
        c.send({to:'b',body:'B'});
    });
});

describe('link lookup and iteration', function() {
    var listener;

    beforeEach(function(done) {
        var container = rhea.create_container();
        listener = container.listen({port:0});
        listener.on('listening', function() {
            done();
        });
    });

    afterEach(function() {
        listener.close();
    });

    it('finds sender or receiver', function(done) {
        var container = rhea.create_container();
        var conn = container.connect(listener.address());
        var r1 = conn.open_receiver({name:'foo'});
        var r2 = conn.open_receiver({name:'bar'});
        var s1 = conn.open_sender({name:'oof'});
        var s2 = conn.open_sender({name:'rab'});
        conn.on('connection_open', function (context) {
            ext_assert_assert.equal(conn.find_receiver(function (r) { return r.name === 'foo'; }), r1);
            ext_assert_assert.equal(conn.find_receiver(function (r) { return r.name === 'bar'; }), r2);
            ext_assert_assert(conn.find_receiver(function (r) { return false; }) === undefined);
            ext_assert_assert.equal(conn.find_sender(function (s) { return s.name === 'oof'; }), s1);
            ext_assert_assert.equal(conn.find_sender(function (s) { return s.name === 'rab'; }), s2);
            ext_assert_assert(conn.find_sender(function (s) { return false; }) === undefined);
            conn.close();
        });
        conn.on('connection_close', function () {
            done();
        });
    });
    it('iterates over senders or receivers', function(done) {
        var container = rhea.create_container();
        var conn = container.connect(listener.address());
        var r1 = conn.open_receiver({name:'foo'});
        var r2 = conn.open_receiver({name:'bar'});
        var s1 = conn.open_sender({name:'oof'});
        var s2 = conn.open_sender({name:'rab'});
        conn.on('connection_open', function (context) {
            var results = [];
            function collect (o) {
                results.push(o.name);
            }
            conn.each_receiver(collect);
            ext_assert_assert.deepEqual(results, ['foo', 'bar']);
            results = [];
            conn.each_sender(collect);
            ext_assert_assert.deepEqual(results, ['oof', 'rab']);
            results = [];
            conn.each_link(collect);
            ext_assert_assert.deepEqual(results, ['foo', 'bar', 'oof', 'rab']);
            conn.close();
        });
        conn.on('connection_close', function () {
            done();
        });
    });
});
