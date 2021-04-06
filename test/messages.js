"use strict";

var _assert = require("assert");

var _assert2 = _interopRequireDefault(_assert);

var _container = require("../lib/container.js");

var _types = require("../lib/types.js");

var _message = require("../lib/message.js");

var _util = require("../lib/util.js");

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

describe('message content', function () {
    var container, sender, listener;

    beforeEach(function (done) {
        container = _container.containerjs.create_container();
        listener = container.listen({ port: 0 });
        listener.on('listening', function () {
            sender = container.connect(listener.address()).attach_sender();
            done();
        });
    });

    function transfer_test(message, verification) {
        return function (done) {
            container.on('message', function (context) {
                verification(context.message);
                done();
            });
            sender.send(message);
        };
    }

    afterEach(function () {
        listener.close();
    });

    it('sends and receives string body', transfer_test({ body: 'hello world!' }, function (message) {
        _assert2.default.equal(message.body, 'hello world!');
    }));
    it('sends and receives binary body', transfer_test({ body: _types.types.wrap_binary(new Buffer('hello world!')) }, function (message) {
        _assert2.default.equal(message.body.toString(), 'hello world!');
    }));
    it('sends and receives body as data section', transfer_test({ body: _message.message.data_section(new Buffer('hello world!')) }, function (message) {
        _assert2.default.equal(message.body.typecode, 0x75);
        _assert2.default.equal(message.body.content.toString(), 'hello world!');
    }));
    it('sends and receives body as sequence section', transfer_test({ body: _message.message.sequence_section(['hello', 1, 'world!']) }, function (message) {
        _assert2.default.equal(message.body.typecode, 0x76);
        _assert2.default.equal(message.body.content[0], 'hello');
        _assert2.default.equal(message.body.content[1], 1);
        _assert2.default.equal(message.body.content[2], 'world!');
    }));
    it('sends and receives subject', transfer_test({ subject: 'my-subject' }, function (message) {
        _assert2.default.equal(message.subject, 'my-subject');
    }));
    it('sends and receives message-id', transfer_test({ message_id: 'my-id' }, function (message) {
        _assert2.default.equal(message.message_id, 'my-id');
    }));
    it('sends and receives string property', transfer_test({ application_properties: { colour: 'red' } }, function (message) {
        _assert2.default.equal(message.application_properties.colour, 'red');
    }));
    it('sends and receives int property', transfer_test({ application_properties: { age: 101 } }, function (message) {
        _assert2.default.equal(message.application_properties.age, 101);
    }));
    it('sends and receives float property', transfer_test({ application_properties: { pi: 3.14 } }, function (message) {
        _assert2.default.equal(message.application_properties.pi, 3.14);
    }));
    it('sends and receives long property', transfer_test({ application_properties: { big: 1467407965596 } }, function (message) {
        _assert2.default.equal(message.application_properties.big, 1467407965596);
    }));
    it('sends and receives ulong property', transfer_test({ application_properties: { bigneg: -1234567898765 } }, function (message) {
        _assert2.default.equal(message.application_properties.bigneg, -1234567898765);
    }));
    it('sends and receives char property', transfer_test({ application_properties: { 'x': _types.types.wrap_char(0x2603) } }, function (message) {
        _assert2.default.equal(message.application_properties.x, 0x2603);
    }));
    var test_uuid = (0, _util.uuid4)();
    it('sends and receives a uuid property', transfer_test({ application_properties: { 'x': _types.types.wrap_uuid(test_uuid) } }, function (message) {
        _assert2.default.equal((0, _util.uuid_to_string)(message.application_properties.x), (0, _util.uuid_to_string)(test_uuid));
    }));
    it('sends and receives string message annotation', transfer_test({ message_annotations: { colour: 'blue' } }, function (message) {
        _assert2.default.equal(message.message_annotations.colour, 'blue');
    }));
    it('sends and receives int delivery annotation', transfer_test({ delivery_annotations: { count: 8765 } }, function (message) {
        _assert2.default.equal(message.delivery_annotations.count, 8765);
    }));
    it('sends and receives body of 1k', transfer_test({ body: new Array(1024 + 1).join('x') }, function (message) {
        _assert2.default.equal(message.body, new Array(1024 + 1).join('x'));
    }));
    it('sends and receives body of 5k', transfer_test({ body: new Array(1024 * 5 + 1).join('y') }, function (message) {
        _assert2.default.equal(message.body, new Array(1024 * 5 + 1).join('y'));
    }));
    it('sends and receives body of 50k', transfer_test({ body: new Array(1024 * 50 + 1).join('z') }, function (message) {
        _assert2.default.equal(message.body, new Array(1024 * 50 + 1).join('z'));
    }));
    it('sends and receives map body', transfer_test({ body: { colour: 'green', age: 8, happy: true, sad: false } }, function (message) {
        _assert2.default.equal(message.body.colour, 'green');
        _assert2.default.equal(message.body.age, 8);
        _assert2.default.equal(message.body.happy, true);
        _assert2.default.equal(message.body.sad, false);
        _assert2.default.equal(message.body.indifferent, undefined);
    }));
    it('sends and receives map with doubles', transfer_test({ body: { west: _types.types.wrap_double(4.734), north: _types.types.wrap_double(56.0023)
        } }, function (message) {

        _assert2.default.equal(message.body.north, 56.0023);
        _assert2.default.equal(message.body.west, 4.734);
    }));
    it('sends and receives map with floats', transfer_test({ body: { half: _types.types.wrap_float(0.5), quarter: _types.types.wrap_double(0.25)
        } }, function (message) {

        _assert2.default.equal(message.body.half, 0.5);
        _assert2.default.equal(message.body.quarter, 0.25);
    }));
    it('sends and receives map with ulongs', transfer_test({ body: { age: _types.types.wrap_ulong(888), max: _types.types.wrap_ulong(9007199254740992)
        } }, function (message) {
        _assert2.default.equal(message.body.max, 9007199254740992);
        _assert2.default.equal(message.body.age, 888);
    }));
    it('sends and receives map with longs', transfer_test({ body: { one: _types.types.wrap_long(1),
            negative_one: _types.types.wrap_long(-1),
            positive: _types.types.wrap_long(1000),
            negative: _types.types.wrap_long(-1000),
            large: _types.types.wrap_long(1000000000),
            large_negative: _types.types.wrap_long(-1000000000),
            awkward: _types.types.wrap_long(1467407965596),
            max: _types.types.wrap_long(9007199254740992),
            min: _types.types.wrap_long(-9007199254740992)
        } }, function (message) {
        _assert2.default.equal(message.body.one, 1);
        _assert2.default.equal(message.body.negative_one, -1);
        _assert2.default.equal(message.body.positive, 1000);
        _assert2.default.equal(message.body.negative, -1000);
        _assert2.default.equal(message.body.large, 1000000000);
        _assert2.default.equal(message.body.large_negative, -1000000000);
        _assert2.default.equal(message.body.awkward, 1467407965596);
        _assert2.default.equal(message.body.max, 9007199254740992);
        _assert2.default.equal(message.body.min, -9007199254740992);
    }));
    it('sends and receives map with ulongs/longs as buffers', transfer_test({ body: { too_big: new _types.types.Ulong(new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF])),
            too_small: new _types.types.Long(new Buffer([0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
        } }, function (message) {
        _assert2.default.equal(message.body.too_big.length, 8);
        for (var i = 0; i < 8; i++) {
            _assert2.default.equal(message.body.too_big[i], 0xFF);
        }
        _assert2.default.equal(message.body.too_small.length, 8);
        for (var i = 0; i < 8; i++) {
            if (i === 0) {
                _assert2.default.equal(message.body.too_small[i], 0xFF);
            } else {
                _assert2.default.equal(message.body.too_small[i], 0x00);
            }
        }
    }));
    it('get header and properties directly', transfer_test({
        message_id: 'my-id',
        user_id: 'my-user',
        to: 'my-to',
        subject: 'my-subject',
        reply_to: 'my-reply-to',
        correlation_id: 'correlate-me',
        content_type: 'text',
        content_encoding: 'ascii',
        absolute_expiry_time: 123456789,
        creation_time: 987654321,
        group_id: 'my-group',
        group_sequence: 77,
        reply_to_group_id: 'still-my-group',
        durable: true,
        priority: 3,
        ttl: 123456789,
        first_acquirer: false,
        delivery_count: 8
    }, function (message) {
        _assert2.default.equal(message.message_id, 'my-id');
        _assert2.default.equal(message.user_id, 'my-user');
        _assert2.default.equal(message.to, 'my-to');
        _assert2.default.equal(message.subject, 'my-subject');
        _assert2.default.equal(message.reply_to, 'my-reply-to');
        _assert2.default.equal(message.correlation_id, 'correlate-me');
        _assert2.default.equal(message.content_type, 'text');
        _assert2.default.equal(message.content_encoding, 'ascii');
        _assert2.default.equal(message.absolute_expiry_time, 123456789);
        _assert2.default.equal(message.creation_time, 987654321);
        _assert2.default.equal(message.group_id, 'my-group');
        _assert2.default.equal(message.group_sequence, 77);
        _assert2.default.equal(message.reply_to_group_id, 'still-my-group');
        _assert2.default.equal(message.durable, true);
        _assert2.default.equal(message.priority, 3);
        _assert2.default.equal(message.ttl, 123456789);
        _assert2.default.equal(message.first_acquirer, false);
        _assert2.default.equal(message.delivery_count, 8);
    }));
    it('set header and properties directly', transfer_test({
        message_id: 'my-id',
        user_id: 'my-user',
        to: 'my-to',
        subject: 'my-subject',
        reply_to: 'my-reply-to',
        correlation_id: 'correlate-me',
        content_type: 'text',
        content_encoding: 'ascii',
        absolute_expiry_time: 123456789,
        creation_time: 987654321,
        group_id: 'my-group',
        group_sequence: 77,
        reply_to_group_id: 'still-my-group',
        durable: true,
        priority: 3,
        ttl: 123456789,
        first_acquirer: false,
        delivery_count: 8
    }, function (message) {
        _assert2.default.equal(message.message_id, 'my-id');
        _assert2.default.equal(message.user_id, 'my-user');
        _assert2.default.equal(message.to, 'my-to');
        _assert2.default.equal(message.subject, 'my-subject');
        _assert2.default.equal(message.reply_to, 'my-reply-to');
        _assert2.default.equal(message.correlation_id, 'correlate-me');
        _assert2.default.equal(message.content_type, 'text');
        _assert2.default.equal(message.content_encoding, 'ascii');
        _assert2.default.equal(message.absolute_expiry_time, 123456789);
        _assert2.default.equal(message.creation_time, 987654321);
        _assert2.default.equal(message.group_id, 'my-group');
        _assert2.default.equal(message.group_sequence, 77);
        _assert2.default.equal(message.reply_to_group_id, 'still-my-group');
        _assert2.default.equal(message.durable, true);
        _assert2.default.equal(message.priority, 3);
        _assert2.default.equal(message.ttl, 123456789);
        _assert2.default.equal(message.first_acquirer, false);
        _assert2.default.equal(message.delivery_count, 8);
    }));
    it('test undefined properties and headers directly', transfer_test({ body: 'hello world!' }, function (message) {
        _assert2.default.equal(message.body, 'hello world!');
        _assert2.default.equal(message.message_id, undefined);
        _assert2.default.equal(message.user_id, undefined);
        _assert2.default.equal(message.to, undefined);
        _assert2.default.equal(message.subject, undefined);
        _assert2.default.equal(message.reply_to, undefined);
        _assert2.default.equal(message.correlation_id, undefined);
        _assert2.default.equal(message.content_type, undefined);
        _assert2.default.equal(message.content_encoding, undefined);
        _assert2.default.equal(message.absolute_expiry_time, undefined);
        _assert2.default.equal(message.creation_time, undefined);
        _assert2.default.equal(message.group_id, undefined);
        _assert2.default.equal(message.group_sequence, undefined);
        _assert2.default.equal(message.reply_to_group_id, undefined);
        _assert2.default.equal(message.durable, undefined);
        _assert2.default.equal(message.priority, undefined);
        _assert2.default.equal(message.ttl, undefined);
        _assert2.default.equal(message.first_acquirer, undefined);
        _assert2.default.equal(message.delivery_count, undefined);
    }));
    it('message has a toString', transfer_test({ message_id: 'my-id', body: 'hello world!' }, function (message) {
        _assert2.default.equal(message.toString(), '{"message_id":"my-id","body":"hello world!"}');
    }));
});

describe('acknowledgement', function () {
    var server, client, listener;
    var outcome;

    beforeEach(function (done) {
        outcome = {};
        server = _container.containerjs.create_container();
        server.on('accepted', function (context) {
            outcome.state = 'accepted';
        });
        server.on('released', function (context) {
            outcome.state = 'released';
            outcome.delivery_failed = context.delivery.remote_state.delivery_failed;
            outcome.undeliverable_here = context.delivery.remote_state.undeliverable_here;
        });
        server.on('rejected', function (context) {
            outcome.state = 'rejected';
            outcome.error = context.delivery.remote_state.error;
        });
        server.on('settled', function (context) {
            context.connection.close();
        });
        client = _container.containerjs.create_container();
        listener = server.listen({ port: 0 });
        listener.on('listening', function () {
            done();
        });
    });

    afterEach(function () {
        listener.close();
    });

    it('auto-accept', function (done) {
        server.once('sendable', function (context) {
            context.sender.send({ body: 'accept-me' });
        });
        client.on('message', function (context) {
            _assert2.default.equal(context.message.body, 'accept-me');
        });
        client.on('connection_close', function (context) {
            _assert2.default.equal(outcome.state, 'accepted');
            done();
        });
        client.connect(listener.address()).attach_receiver();
    });
    it('explicit accept', function (done) {
        server.once('sendable', function (context) {
            context.sender.send({ body: 'accept-me' });
        });
        client.on('message', function (context) {
            _assert2.default.equal(context.message.body, 'accept-me');
            context.delivery.accept();
        });
        client.on('connection_close', function (context) {
            _assert2.default.equal(outcome.state, 'accepted');
            done();
        });
        client.connect(listener.address()).attach_receiver({ autoaccept: false });
    });
    it('explicit release', function (done) {
        server.once('sendable', function (context) {
            context.sender.send({ body: 'release-me' });
        });
        client.on('message', function (context) {
            _assert2.default.equal(context.message.body, 'release-me');
            context.delivery.release();
        });
        client.on('connection_close', function (context) {
            _assert2.default.equal(outcome.state, 'released');
            _assert2.default.equal(outcome.delivery_failed, undefined);
            _assert2.default.equal(outcome.undeliverable_here, undefined);
            done();
        });
        client.connect(listener.address()).attach_receiver({ autoaccept: false });
    });
    it('explicit reject', function (done) {
        server.once('sendable', function (context) {
            context.sender.send({ body: 'reject-me' });
        });
        client.on('message', function (context) {
            _assert2.default.equal(context.message.body, 'reject-me');
            context.delivery.reject({ condition: 'rhea:oops:string', description: 'something bad occurred' });
        });
        client.on('connection_close', function (context) {
            _assert2.default.equal(outcome.state, 'rejected');
            _assert2.default.equal(outcome.error.condition, 'rhea:oops:string');
            _assert2.default.equal(outcome.modified, undefined);
            done();
        });
        client.connect(listener.address()).attach_receiver({ autoaccept: false });
    });
    it('explicit modify', function (done) {
        server.options.treat_modified_as_released = false;
        server.on('modified', function (context) {
            _assert2.default.equal(outcome.state, undefined);
            outcome.state = 'modified';
            outcome.delivery_failed = context.delivery.remote_state.delivery_failed;
            outcome.undeliverable_here = context.delivery.remote_state.undeliverable_here;
        });
        server.once('sendable', function (context) {
            context.sender.send({ body: 'modify-me' });
        });
        client.on('message', function (context) {
            _assert2.default.equal(context.message.body, 'modify-me');
            context.delivery.modified({ delivery_failed: true, undeliverable_here: true });
        });
        client.on('connection_close', function (context) {
            _assert2.default.equal(outcome.state, 'modified');
            _assert2.default.equal(outcome.delivery_failed, true);
            _assert2.default.equal(outcome.undeliverable_here, true);
            done();
        });
        client.connect(listener.address()).attach_receiver({ autoaccept: false });
    });
    it('modified as released', function (done) {
        server.once('sendable', function (context) {
            context.sender.send({ body: 'try-again' });
        });
        client.on('message', function (context) {
            _assert2.default.equal(context.message.body, 'try-again');
            context.delivery.release({ delivery_failed: true, undeliverable_here: true });
        });
        client.on('connection_close', function (context) {
            _assert2.default.equal(outcome.state, 'released');
            _assert2.default.equal(outcome.delivery_failed, true);
            _assert2.default.equal(outcome.undeliverable_here, true);
            done();
        });
        client.connect(listener.address()).attach_receiver({ autoaccept: false });
    });
});

describe('fragmentation', function () {
    this.timeout(5000);
    var container, sender, listener;

    beforeEach(function (done) {
        container = _container.containerjs.create_container();
        listener = container.listen({ port: 0, max_frame_size: 16384 });
        listener.on('listening', function () {
            sender = container.connect({ port: listener.address().port, max_frame_size: 16384 }).attach_sender();
            done();
        });
    });

    function get_data(n, c) {
        var buffer = new Buffer(n);
        if (c) buffer.fill(c);
        return _types.types.wrap_binary(buffer);
    }

    function transfer_test(size, count) {
        var message = { body: get_data(size, 'x') };
        var received = 0;
        var n = count || 1;
        return function (done) {
            container.on('message', function (context) {
                _assert2.default.equal(context.message.body.length, size);
                _assert2.default.equal(context.message.body.toString(), message.body.toString());
                if (++received === n) {
                    done();
                }
            });
            for (var i = 0; i < n; i++) {
                sender.send(message);
            }
        };
    }

    afterEach(function () {
        listener.close();
    });

    it('handles single 16k message', transfer_test(16384));
    it('handles single 32k message', transfer_test(32768));
    it('handles single 64k message', transfer_test(65536));
    it('handles single 1M message', transfer_test(1048576));
    it('handles 100 16k messages', transfer_test(16384, 100));
    it('handles 50 32k messages', transfer_test(32768, 50));
    it('handles 10 64k messages', transfer_test(65536, 10));
});