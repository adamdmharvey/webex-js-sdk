/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import {assert} from '@webex/test-helper-chai';
import Mercury, {config as mercuryConfig, Socket} from '@webex/internal-plugin-mercury';
import sinon from 'sinon';
import MockWebex from '@webex/test-helper-mock-webex';
import MockWebSocket from '@webex/test-helper-mock-web-socket';
import uuid from 'uuid';
import FakeTimers from '@sinonjs/fake-timers';
import {wrap} from 'lodash';

import promiseTick from '../lib/promise-tick';

describe('plugin-mercury', () => {
  describe('Mercury', () => {
    describe('Events', () => {
      let clock,
        mercury,
        mockWebSocket,
        socketOpenStub,
        webex;

      const fakeTestMessage = {
        id: uuid.v4(),
        data: {
          eventType: 'fake.test'
        },
        timestamp: Date.now(),
        trackingId: `suffix_${uuid.v4()}_${Date.now()}`
      };

      const statusStartTypingMessage = {
        id: uuid.v4(),
        data: {
          eventType: 'status.start_typing',
          actor: {
            id: 'actorId'
          },
          conversationId: uuid.v4()
        },
        timestamp: Date.now(),
        trackingId: `suffix_${uuid.v4()}_${Date.now()}`
      };

      beforeEach(() => {
        clock = FakeTimers.install({now: Date.now()});
      });

      afterEach(() => {
        clock.uninstall();
      });

      beforeEach(() => {
        webex = new MockWebex({
          children: {
            mercury: Mercury
          }
        });

        webex.internal.metrics.submitClientMetrics = sinon.stub();
        webex.trackingId = 'fakeTrackingId';
        webex.config.mercury = mercuryConfig.mercury;

        webex.logger = console;

        mockWebSocket = new MockWebSocket('ws://example.com');
        sinon.stub(Socket, 'getWebSocketConstructor').returns(() => mockWebSocket);

        const origOpen = Socket.prototype.open;

        socketOpenStub = sinon.stub(Socket.prototype, 'open').callsFake(function (...args) {
          const promise = Reflect.apply(origOpen, this, args);

          process.nextTick(() => mockWebSocket.open());

          return promise;
        });

        mercury = webex.internal.mercury;
      });

      afterEach(() => {
        if (socketOpenStub) {
          socketOpenStub.restore();
        }

        if (Socket.getWebSocketConstructor.restore) {
          Socket.getWebSocketConstructor.restore();
        }
      });

      describe('when connected', () => {
        it('emits the `online` event', () => {
          const spy = sinon.spy();

          mercury.on('online', spy);
          const promise = mercury.connect();

          mockWebSocket.open();

          return promise
            .then(() => assert.called(spy));
        });
      });

      describe('when disconnected', () => {
        it('emits the `offline` event', () => {
          const spy = sinon.spy();

          mercury.on('offline', spy);
          const promise = mercury.connect();

          mockWebSocket.open();

          return promise
            .then(() => {
              const promise = mercury.disconnect();

              mockWebSocket.emit('close', {
                code: 1000,
                reason: 'Done'
              });

              return promise;
            })
            .then(() => assert.calledOnce(spy));
        });

        describe('when reconnected', () => {
          it('emits the `online` event', () => {
            const spy = sinon.spy();

            mercury.on('online', spy);

            const promise = mercury.connect();

            mockWebSocket.open();

            return promise
              .then(() => assert.calledOnce(spy))
              .then(() => mockWebSocket.emit('close', {code: 1000, reason: 'Idle'}))
              .then(() => mercury.connect())
              .then(() => assert.calledTwice(spy));
          });
        });
      });

      describe('when `mercury.buffer_state` is received', () => {
        // This test is here because the buffer states message may arrive before
        // the mercury Promise resolves.
        it('gets emitted', (done) => {
          const spy = mockWebSocket.send;

          assert.notCalled(spy);
          const bufferStateSpy = sinon.spy();
          const onlineSpy = sinon.spy();

          mercury.on('event:mercury.buffer_state', bufferStateSpy);
          mercury.on('online', onlineSpy);

          Socket.getWebSocketConstructor.returns(() => {
            process.nextTick(() => {
              assert.isTrue(mercury.connecting, 'Mercury is still connecting');
              assert.isFalse(mercury.connected, 'Mercury has not yet connected');
              assert.notCalled(onlineSpy);
              assert.lengthOf(spy.args, 0, 'The client has not yet sent the auth message');
              // set websocket readystate to 1 to allow a successful send message
              mockWebSocket.readyState = 1;
              mockWebSocket.emit('open');
              mockWebSocket.emit('message', {
                data: JSON.stringify({
                  id: uuid.v4(),
                  data: {
                    eventType: 'mercury.buffer_state'
                  }
                })
              });
              // using lengthOf because notCalled doesn't allow the helpful
              // string assertion
              assert.lengthOf(spy.args, 0, 'The client has not acked the buffer_state message');

              promiseTick(1)
                .then(() => {
                  assert.calledOnce(bufferStateSpy);

                  return mercury.connect()
                    .then(done);
                })
                .catch(done);
            });

            return mockWebSocket;
          });

          // Delay send for a tick to ensure the buffer message comes before
          // auth completes.
          mockWebSocket.send = wrap(mockWebSocket.send, function (fn, ...args) {
            process.nextTick(() => {
              Reflect.apply(fn, this, args);
            });
          });
          mercury.connect();
          assert.lengthOf(spy.args, 0);
        });
      });

      describe('when a CloseEvent is received', () => {
        const events = [
          {
            code: 1000,
            reason: 'idle',
            action: 'reconnect'
          },
          {
            code: 1000,
            reason: 'done (forced)',
            action: 'reconnect'
          },
          {
            code: 1000,
            reason: 'pong not received',
            action: 'reconnect'
          },
          {
            code: 1000,
            reason: 'pong mismatch',
            action: 'reconnect'
          },
          {
            code: 1000,
            action: 'close'
          },
          {
            code: 1003,
            action: 'close'
          },
          {
            code: 1001,
            action: 'reconnect'
          },
          {
            code: 1005,
            action: 'reconnect'
          },
          {
            code: 1006,
            action: 'reconnect'
          },
          {
            code: 1011,
            action: 'reconnect'
          },
          {
            code: 4000,
            action: 'replace'
          },
          {
            action: 'close'
          }
        ];

        events.forEach((def) => {
          const {action, reason, code} = def;
          let description;

          if (code && reason) {
            description = `with code \`${code}\` and reason \`${reason}\``;
          }
          else if (code) {
            description = `with code \`${code}\``;
          }
          else if (reason) {
            description = `with reason \`${reason}\``;
          }

          describe(`when an event ${description} is received`, () => {
            it(`takes the ${action} action`, () => {
              if (mercury._reconnect.restore) {
                mercury._reconnect.restore();
              }

              sinon.spy(mercury, 'connect');

              const offlineSpy = sinon.spy();
              const permanentSpy = sinon.spy();
              const transientSpy = sinon.spy();
              const replacedSpy = sinon.spy();

              mercury.on('offline', offlineSpy);
              mercury.on('offline.permanent', permanentSpy);
              mercury.on('offline.transient', transientSpy);
              mercury.on('offline.replaced', replacedSpy);

              const promise = mercury.connect();

              mockWebSocket.open();

              return promise
                .then(() => {
                  // Make sure mercury.connect has a call count of zero
                  mercury.connect.resetHistory();

                  mockWebSocket.emit('close', {code, reason});

                  return promiseTick(1);
                })
                .then(() => {
                  assert.called(offlineSpy);
                  assert.calledWith(offlineSpy, {code, reason});
                  switch (action) {
                    case 'close':
                      assert.called(permanentSpy);
                      assert.notCalled(transientSpy);
                      assert.notCalled(replacedSpy);
                      break;
                    case 'reconnect':
                      assert.notCalled(permanentSpy);
                      assert.called(transientSpy);
                      assert.notCalled(replacedSpy);
                      break;
                    case 'replace':
                      assert.notCalled(permanentSpy);
                      assert.notCalled(transientSpy);
                      assert.called(replacedSpy);
                      break;
                    default:
                      assert(false, 'unreachable code reached');
                  }
                  assert.isFalse(mercury.connected, 'Mercury is not connected');
                  if (action === 'reconnect') {
                    assert.called(mercury.connect);
                    assert.calledWith(mercury.connect, mockWebSocket.url);
                    assert.isTrue(mercury.connecting, 'Mercury is connecting');

                    // Block until reconnect completes so logs don't overlap
                    return mercury.connect();
                  }

                  assert.notCalled(mercury.connect);
                  assert.isFalse(mercury.connecting, 'Mercury is not connecting');

                  return Promise.resolve();
                });
            });
          });
        });
      });

      describe('when a MessageEvent is received', () => {
        it('processes the Event via any autowired event handlers', () => {
          webex.fake = {
            processTestEvent: sinon.spy()
          };

          const promise = mercury.connect();

          mockWebSocket.open();

          return promise
            .then(() => {
              mockWebSocket.emit('message', {data: JSON.stringify(fakeTestMessage)});

              return promiseTick(1);
            })
            .then(() => {
              assert.called(webex.fake.processTestEvent);
            });
        });

        it('emits the Mercury envelope', () => {
          const startSpy = sinon.spy();
          const stopSpy = sinon.spy();

          mercury.on('event:status.start_typing', startSpy);
          mercury.on('event:status.stop_typing', stopSpy);

          const promise = mercury.connect();

          mockWebSocket.open();

          return promise
            .then(() => {
              mockWebSocket.emit('message', {data: JSON.stringify(statusStartTypingMessage)});

              return promiseTick(1);
            })
            .then(() => {
              assert.calledOnce(startSpy);
              assert.notCalled(stopSpy);
              assert.calledWith(startSpy, statusStartTypingMessage);
            });
        });

        it('emits the Mercury envelope named by the Mercury event\'s eventType', () => {
          const startSpy = sinon.spy();
          const stopSpy = sinon.spy();

          mercury.on('event:status.start_typing', startSpy);
          mercury.on('event:status.stop_typing', stopSpy);

          const promise = mercury.connect();

          mockWebSocket.open();

          return promise
            .then(() => {
              mockWebSocket.emit('message', {data: JSON.stringify(statusStartTypingMessage)});

              return promiseTick(1);
            })
            .then(() => {
              assert.calledOnce(startSpy);
              assert.notCalled(stopSpy);
              assert.calledWith(startSpy, statusStartTypingMessage);
            });
        });
      });

      describe('when a sequence number is skipped', () => {
        it('emits an event', () => {
          const spy = sinon.spy();

          mercury.on('sequence-mismatch', spy);
          const promise = mercury.connect();

          mockWebSocket.open();

          return promise
            .then(() => {
              mockWebSocket.emit('message', {
                data: JSON.stringify({
                  sequenceNumber: 2,
                  id: 'mockid',
                  data: {
                    eventType: 'mercury.buffer_state'
                  }
                })
              });
              mockWebSocket.emit('message', {
                data: JSON.stringify({
                  sequenceNumber: 4,
                  id: 'mockid',
                  data: {
                    eventType: 'mercury.buffer_state'
                  }
                })
              });
              assert.called(spy);
            });
        });
      });
    });
  });

  /*
  // On mercury:
  online
  offline
  offline.transient
  offline.permanent
  offline.replaced
  event
  event:locus.participant_joined
  mockWebSocket.connection-failed
  mockWebSocket.sequence-mismatch

  // On webex:
  mercury.online
  mercury.offline
  mercury.offline.transient
  mercury.offline.permanent
  mercury.offline.replaced
  mercury.event
  mercury.event:locus.participant_joined
  mercury.mockWebSocket.connection-failed
  mercury.mockWebSocket.sequence-mismatch

  // TODO go through all it(`emits...`) and make sure corresponding tests are here
  */
});
