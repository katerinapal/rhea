import ext_assert_assert from "assert";
import { containerjs as rhea } from "../lib/container.js";
import { message as amqp_messaging } from "../lib/message.js";
import { types as amqp_types } from "../lib/types.js";
import { filterjs as filter } from "../lib/filter.js";
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

describe('link fields', function() {
    var container, listener;

    beforeEach(function(done) {
        container = rhea.create_container();
        listener = container.listen({port:0});
        listener.on('listening', function() {
            done();
        });
    });

    function open_test(local_role, fields, verification) {
        var remote_role = local_role === 'sender' ? 'receiver' : 'sender';
        return function(done) {
            container.on(remote_role + '_open', function(context) {
                verification(context[remote_role]);
                done();
            });
            var c = container.connect(listener.address());
            c.on(local_role + '_open', function(context) {});
            c['open_' + local_role](fields);
        };
    }

    function open_sender_test(fields, verification) {
        return open_test('sender', fields, verification);
    }
    function open_receiver_test(fields, verification) {
        return open_test('receiver', fields, verification);
    }

    function close_test(local_role, error, verification) {
        var remote_role = local_role === 'sender' ? 'receiver' : 'sender';
        return function(done) {
            container.on(remote_role + '_close', function(context) {
                verification(context[remote_role]);
                done();
            });
            var c = container.connect(listener.address());
            c.on(local_role + '_open', function(context) {
                context[local_role].local.detach.error = error;
                context[local_role].close();
            });
            c.on(local_role + '_close', function(context) {});
            c['open_' + local_role]();
        };
    }
    function close_test_simple(local_role, error, verification) {
        var remote_role = local_role === 'sender' ? 'receiver' : 'sender';
        return function(done) {
            container.on(remote_role + '_close', function(context) {
                verification(context[remote_role]);
                done();
            });
            var c = container.connect(listener.address());
            c.on(local_role + '_open', function(context) {
                context[local_role].close(error);
            });
            c.on(local_role + '_close', function(context) {});
            c['open_' + local_role]();
        };
    }
    function close_sender_test(error, verification) {
        return close_test('sender', error, verification);
    }
    function close_receiver_test(error, verification) {
        return close_test('receiver', error, verification);
    }

    afterEach(function() {
        listener.close();
    });

    var link_types = ['sender', 'receiver'];
    for (var i = 0; i < link_types.length; i++) {
        var t = link_types[i];
        it(t + ' name', open_test(t, {name:'my-link'}, function(link) {
            ext_assert_assert.equal(link.remote.attach.name, 'my-link');
        }));
        it('single offered ' + t + ' capability explicit', open_test(t, {offered_capabilities:'foo'}, function(link) {
            ext_assert_assert.equal(link.remote.attach.offered_capabilities, 'foo');
        }));
        it('single offered ' + t + ' capability aliased', open_test(t, {offered_capabilities:'foo'}, function(link) {
            ext_assert_assert.equal(link.offered_capabilities, 'foo');
        }));
        it('multiple offered ' + t + ' capabilities', open_test(t, {offered_capabilities:['foo', 'bar']}, function(link) {
            ext_assert_assert.equal(link.remote.attach.offered_capabilities.length, 2);
            ext_assert_assert.equal(link.remote.attach.offered_capabilities[0], 'foo');
            ext_assert_assert.equal(link.remote.attach.offered_capabilities[1], 'bar');
        }));
        it('single desired ' + t + ' capability', open_test(t, {desired_capabilities:'foo'}, function(link) {
            ext_assert_assert.equal(link.remote.attach.desired_capabilities, 'foo');
        }));
        it('multiple desired ' + t + ' capabilities', open_test(t, {desired_capabilities:['a', 'b', 'c']}, function(link) {
            ext_assert_assert.equal(link.remote.attach.desired_capabilities.length, 3);
            ext_assert_assert.equal(link.remote.attach.desired_capabilities[0], 'a');
            ext_assert_assert.equal(link.remote.attach.desired_capabilities[1], 'b');
            ext_assert_assert.equal(link.remote.attach.desired_capabilities[2], 'c');
        }));
        it(t + ' properties', open_test(t, {properties:{flavour:'vanilla', scoops:2, cone:true}}, function(link) {
            ext_assert_assert.equal(link.remote.attach.properties.flavour, 'vanilla');
            ext_assert_assert.equal(link.remote.attach.properties.scoops, 2);
            ext_assert_assert.equal(link.remote.attach.properties.cone, true);
        }));
        it('error on ' + t + ' close', close_test(t, {condition:'amqp:link:detach-forced', description:'testing error on close'}, function(link) {
            var error = link.remote.detach.error;
            ext_assert_assert.equal(error.condition, 'amqp:link:detach-forced');
            ext_assert_assert.equal(error.description, 'testing error on close');
        }));
        it('pass error to ' + t + ' close', close_test_simple(t, {condition:'amqp:link:detach-forced', description:'testing error on close'}, function(link) {
            var error = link.remote.detach.error;
            ext_assert_assert.equal(error.condition, 'amqp:link:detach-forced');
            ext_assert_assert.equal(error.description, 'testing error on close');
        }));
    }
    it('source address as simple string', open_receiver_test('my-source', function (link) {
        ext_assert_assert.equal(link.remote.attach.source.address, 'my-source');
    }));
    it('source address aliased', open_receiver_test('my-source', function (link) {
        ext_assert_assert.equal(link.source.address, 'my-source');
    }));
    it('source address as single nested value', open_receiver_test({source:'my-source'}, function (link) {
        ext_assert_assert.equal(link.remote.attach.source.address, 'my-source');
    }));
    it('source as nested object', open_receiver_test(
        {source:{
            address:'my-source',
            durable:1,
            expiry_policy:'session-end',
            timeout:33,
            distribution_mode:'copy',
            filter: filter.selector("colour = 'green'"),
            default_outcome: amqp_messaging.modified().described(),
            outcomes: ['amqp:list:accepted', 'amqp:list:rejected', 'amqp:list:released', 'amqp:list:modified'],
            capabilities: ['a', 'b', 'c']
        }},
        function (link) {
            ext_assert_assert.equal(link.remote.attach.source.address, 'my-source');
            ext_assert_assert.equal(link.remote.attach.source.durable, 1);
            ext_assert_assert.equal(link.remote.attach.source.expiry_policy, 'session-end');
            ext_assert_assert.equal(link.remote.attach.source.timeout, 33);
            ext_assert_assert.equal(link.remote.attach.source.distribution_mode, 'copy');
            var descriptor = amqp_types.unwrap(link.remote.attach.source.filter['jms-selector'].descriptor);
            ext_assert_assert.equal(descriptor, 0x0000468C00000004);
            ext_assert_assert.equal(link.remote.attach.source.filter['jms-selector'], "colour = 'green'");
            ext_assert_assert.ok(amqp_messaging.is_modified(link.remote.attach.source.default_outcome));
            ext_assert_assert.equal(link.remote.attach.source.outcomes.length, 4);
            ext_assert_assert.equal(link.remote.attach.source.outcomes[0], 'amqp:list:accepted');
            ext_assert_assert.equal(link.remote.attach.source.outcomes[1], 'amqp:list:rejected');
            ext_assert_assert.equal(link.remote.attach.source.outcomes[2], 'amqp:list:released');
            ext_assert_assert.equal(link.remote.attach.source.outcomes[3], 'amqp:list:modified');
            ext_assert_assert.equal(link.remote.attach.source.capabilities.length, 3);
            ext_assert_assert.equal(link.remote.attach.source.capabilities[0], 'a');
            ext_assert_assert.equal(link.remote.attach.source.capabilities[1], 'b');
            ext_assert_assert.equal(link.remote.attach.source.capabilities[2], 'c');
    }));
    it('source with single capability', open_receiver_test(
        {source:{
            address:'my-source',
            capabilities: 'sourceable'
        }},
        function (link) {
            ext_assert_assert.equal(link.remote.attach.source.address, 'my-source');
            ext_assert_assert.equal(link.remote.attach.source.capabilities, 'sourceable');
        }
    ));
    it('dynamic source', open_receiver_test({source:{dynamic:true, dynamic_node_properties:{foo:'bar'}}}, function (link) {
        ext_assert_assert.equal(link.remote.attach.source.dynamic, true);
        ext_assert_assert.equal(link.remote.attach.source.dynamic_node_properties.foo, 'bar');
    }));
    it('dynamic source aliased', open_receiver_test({source:{dynamic:true, dynamic_node_properties:{foo:'bar'}}}, function (link) {
        ext_assert_assert.equal(link.source.dynamic, true);
        ext_assert_assert.equal(link.source.dynamic_node_properties.foo, 'bar');
    }));
    it('target address as simple string', open_sender_test('my-target', function (link) {
        ext_assert_assert.equal(link.remote.attach.target.address, 'my-target');
    }));
    it('target address aliased', open_sender_test('my-target', function (link) {
        ext_assert_assert.equal(link.target.address, 'my-target');
    }));
    it('target address as single nested value', open_sender_test({target:'my-target'}, function (link) {
        ext_assert_assert.equal(link.remote.attach.target.address, 'my-target');
    }));
    it('target as nested object', open_receiver_test(
        {target:{
            address:'my-target',
            durable:2,
            expiry_policy:'connection-close',
            timeout:33,
            distribution_mode:'copy',
            capabilities: ['d', 'e', 'f']
        }},
        function (link) {
            ext_assert_assert.equal(link.remote.attach.target.address, 'my-target');
            ext_assert_assert.equal(link.remote.attach.target.durable, 2);
            ext_assert_assert.equal(link.remote.attach.target.expiry_policy, 'connection-close');
            ext_assert_assert.equal(link.remote.attach.target.timeout, 33);
            ext_assert_assert.equal(link.remote.attach.target.capabilities.length, 3);
            ext_assert_assert.equal(link.remote.attach.target.capabilities[0], 'd');
            ext_assert_assert.equal(link.remote.attach.target.capabilities[1], 'e');
            ext_assert_assert.equal(link.remote.attach.target.capabilities[2], 'f');
    }));
    it('target with single capability', open_receiver_test(
        {target:{
            address:'my-target',
            capabilities: 'targetable'
        }},
        function (link) {
            ext_assert_assert.equal(link.remote.attach.target.address, 'my-target');
            ext_assert_assert.equal(link.remote.attach.target.capabilities, 'targetable');
        }
    ));
    it('dynamic target', open_receiver_test({target:{dynamic:true, dynamic_node_properties:{foo:'bar'}}}, function (link) {
        ext_assert_assert.equal(link.remote.attach.target.dynamic, true);
        ext_assert_assert.equal(link.remote.attach.target.dynamic_node_properties.foo, 'bar');
    }));
});

var roles = {'sender':'receiver', 'receiver':'sender'};
for (var local_role in roles) {
    describe(local_role + ' events', function() {
        var listener;

        beforeEach(function(done) {
            var container = rhea.create_container();
            container.on(roles[local_role] + '_open', function(context) {
                var link = context[roles[local_role]];
                link.local.attach.offered_capabilities = link.remote.attach.desired_capabilities;
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

            var c = container.connect(listener.address());
            c.on(local_role + '_open', function (context) {
                ext_assert_assert.equal(context[local_role].remote.attach.offered_capabilities, 'one');
                latch.decrement();
                context[local_role].close();
            });
            c['open_' + local_role]({desired_capabilities:'one'});
            var s2 = c['open_' + local_role]({desired_capabilities:'two'});
            s2.on(local_role + '_open', function (context) {
                ext_assert_assert.equal(context[local_role].remote.attach.offered_capabilities, 'two');
                latch.decrement();
                context.connection.close();
            });
            container.connect(listener.address())['open_' + local_role]({desired_capabilities:'three'});
            //third link has no handler defined at either link or connection level, so will default to container level handler:
            container.on(local_role + '_open', function(context) {
                ext_assert_assert.equal(context[local_role].remote.attach.offered_capabilities, 'three');
                latch.decrement();
                context.connection.close();
            });
        });
    });
    describe(local_role + ' error handling', function() {
        var container, listener;
        var remote_role;

        beforeEach(function(done) {
            remote_role = roles[local_role];
            container = rhea.create_container();
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
            container.on(remote_role + '_open', function(context) {
                context[remote_role].close({condition:'amqp:link:detach-forced', description:'testing error on close'});
            });
            container.on('connection_close', function(context) {
                ext_assert_assert.equal(error_handler_called, true);
                ext_assert_assert.equal(close_handler_called, true);
                done();
            });
            var c = rhea.create_container().connect(listener.address());
            c.on(local_role + '_error', function(context) {
                error_handler_called = true;
                var error = context[local_role].error;
                ext_assert_assert.equal(error.condition, 'amqp:link:detach-forced');
                ext_assert_assert.equal(error.description, 'testing error on close');
            });
            c.on(local_role + '_close', function(context) {
                close_handler_called = true;
                var error = context[local_role].error;
                ext_assert_assert.equal(error.condition, 'amqp:link:detach-forced');
                ext_assert_assert.equal(error.description, 'testing error on close');
                c.close();
            });
            c['open_' + local_role]('foo');
        });
        it('error handled', function (done) {
            var error_handler_called;
            container.on(remote_role + '_open', function(context) {
                context[remote_role].close({condition:'amqp:link:detach-forced', description:'testing error on close'});
            });
            container.on('connection_close', function(context) {
                ext_assert_assert.equal(error_handler_called, true);
                done();
            });
            var c = rhea.create_container().connect(listener.address());
            c.on(local_role + '_error', function(context) {
                error_handler_called = true;
                var error = context[local_role].error;
                ext_assert_assert.equal(error.condition, 'amqp:link:detach-forced');
                ext_assert_assert.equal(error.description, 'testing error on close');
                c.close();
            });
            c['open_' + local_role]();
        });
        it('unhandled error', function (done) {
            var error_handler_called;
            container.on(remote_role + '_open', function(context) {
                context[remote_role].close({condition:'amqp:link:detach-forced', description:'testing error on close'});
            });
            container.on('connection_close', function(context) {
                done();
            });
            var container2 = rhea.create_container();
            var c = container2.connect(listener.address());
            container2.on('error', function (error) {
                ext_assert_assert.equal(error.condition, 'amqp:link:detach-forced');
                ext_assert_assert.equal(error.description, 'testing error on close');
                c.close();
            });
            c['open_' + local_role]();
        });
    });
}

describe('settlement modes', function() {
    var server, client, listener;

    beforeEach(function(done) {
        server = rhea.create_container();
        client = rhea.create_container();
        listener = server.listen({port:0});
        listener.on('listening', function() {
            done();
        });

    });

    afterEach(function() {
        listener.close();
    });

    it('sender sends unsettled', function(done) {
        server.on('receiver_open', function(context) {
            ext_assert_assert.equal(context.receiver.snd_settle_mode, 0);
        });
        server.on('message', function(context) {
            ext_assert_assert.equal(context.message.body, 'settle-me');
            ext_assert_assert.equal(context.delivery.remote_settled, false);
        });
        client.on('settled', function (context) {
            context.connection.close();
        });
        client.once('sendable', function (context) {
            context.sender.send({body:'settle-me'});
        });
        client.on('connection_close', function (context) {
            done();
        });
        client.connect(listener.address()).attach_sender({snd_settle_mode:0});
    });
    it('sender sends settled', function(done) {
        server.on('receiver_open', function(context) {
            ext_assert_assert.equal(context.receiver.snd_settle_mode, 1);
        });
        server.on('message', function(context) {
            ext_assert_assert.equal(context.message.body, 'already-settled');
            ext_assert_assert.equal(context.delivery.remote_settled, true);
            context.connection.close();
        });
        client.once('sendable', function (context) {
            context.sender.send({body:'already-settled'});
        });
        client.on('connection_close', function (context) {
            done();
        });
        client.connect(listener.address()).attach_sender({snd_settle_mode:1});
    });
    it('receiver requests send unsettled', function(done) {
        server.on('sender_open', function(context) {
            ext_assert_assert.equal(context.sender.snd_settle_mode, 0);
            context.sender.local.attach.snd_settle_mode = context.sender.snd_settle_mode;
        });
        server.on('settled', function (context) {
            context.connection.close();
        });
        server.once('sendable', function (context) {
            context.sender.send({body:'settle-me'});
        });
        client.on('message', function(context) {
            ext_assert_assert.equal(context.message.body, 'settle-me');
            ext_assert_assert.equal(context.delivery.remote_settled, false);
        });
        client.on('connection_close', function (context) {
            done();
        });
        client.connect(listener.address()).attach_receiver({snd_settle_mode:0});
    });
    it('receiver requests send settled', function(done) {
        server.on('sender_open', function(context) {
            ext_assert_assert.equal(context.sender.snd_settle_mode, 1);
            context.sender.local.attach.snd_settle_mode = context.sender.snd_settle_mode;
        });
        server.once('sendable', function (context) {
            context.sender.send({body:'already-settled'});
        });
        client.on('message', function(context) {
            ext_assert_assert.equal(context.message.body, 'already-settled');
            ext_assert_assert.equal(context.delivery.remote_settled, true);
            context.connection.close();
        });
        client.on('connection_close', function (context) {
            done();
        });
        client.connect(listener.address()).attach_receiver({snd_settle_mode:1});
    });
    it('receiver settles first', function(done) {
        server.on('sender_open', function(context) {
            ext_assert_assert.equal(context.sender.rcv_settle_mode, 0);
        });
        server.once('sendable', function (context) {
            context.sender.send({body:'settle-me'});
        });
        server.once('accepted', function (context) {
            ext_assert_assert.equal(context.delivery.remote_settled, true);
            context.connection.close();
        });
        client.on('message', function(context) {
            ext_assert_assert.equal(context.message.body, 'settle-me');
            ext_assert_assert.equal(context.delivery.remote_settled, false);
        });
        client.on('connection_close', function (context) {
            done();
        });
        client.connect(listener.address()).attach_receiver({rcv_settle_mode:0});
    });
    it('receiver settles second', function(done) {
        server.on('sender_open', function(context) {
            ext_assert_assert.equal(context.sender.rcv_settle_mode, 1);
        });
        server.once('sendable', function (context) {
            context.sender.send({body:'settle-me'});
        });
        server.once('accepted', function (context) {
            ext_assert_assert.equal(context.delivery.remote_settled, false);
            context.delivery.update(true);
        });
        client.on('message', function(context) {
            ext_assert_assert.equal(context.message.body, 'settle-me');
            ext_assert_assert.equal(context.delivery.remote_settled, false);
        });
        client.on('settled', function (context) {
            ext_assert_assert.equal(context.delivery.remote_settled, true);
            context.connection.close();
        });
        client.on('connection_close', function (context) {
            done();
        });
        client.connect(listener.address()).attach_receiver({rcv_settle_mode:1});
    });
});
