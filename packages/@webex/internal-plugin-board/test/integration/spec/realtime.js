/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import '@webex/internal-plugin-board';

import {assert} from '@webex/test-helper-chai';
import {flaky, maxWaitForEvent} from '@webex/test-helper-mocha';
import WebexCore from '@webex/webex-core';
import testUsers from '@webex/test-helper-test-users';
import fh from '@webex/test-helper-file';
import {map} from 'lodash';
import uuid from 'uuid';

describe('plugin-board', () => {
  describe('realtime', () => {
    let board, conversation, fixture, participants;
    let mccoy, spock;
    let mccoyRealtimeChannel, spockRealtimeChannel;

    before('create users', () => testUsers.create({count: 2})
      .then(async (users) => {
        participants = [spock, mccoy] = users;

        // Pause for 5 seconds for CI
        await new Promise((done) => setTimeout(done, 5000));

        return Promise.all(map(participants, (participant) => {
          participant.webex = new WebexCore({
            credentials: {
              authorization: participant.token
            },
            // NOTE: temp fix so that realtime tests pass
            // Test user catalogue does not include the URL from utc
            config: {
              services: {
                override: {
                  'mercury-test': 'wss://mercury-connection-llm.intb1.ciscospark.com/'
                }
              }
            }
          });

          return participant.webex.internal.device.register();
        }));
      }));

    before('create conversation', () => spock.webex.internal.conversation.create({
      displayName: 'Test Board Conversation',
      participants
    })
      .then((c) => {
        conversation = c;

        return conversation;
      }));

    before('create channel (board)', () => spock.webex.internal.board.createChannel(conversation)
      .then((channel) => {
        board = channel;

        return channel;
      }));

    before('connect to realtime channel', () => Promise.all(map(participants, (participant) => participant.webex.internal.board.realtime.connectByOpenNewMercuryConnection(board))));

    before('get realtime channels', () => {
      spockRealtimeChannel = spock.webex.internal.board.realtime.realtimeChannels.get(board.channelId);
      mccoyRealtimeChannel = mccoy.webex.internal.board.realtime.realtimeChannels.get(board.channelId);
    });

    before('load fixture image', () => fh.fetch('sample-image-small-one.png')
      .then((fetchedFixture) => {
        fixture = fetchedFixture;

        return fetchedFixture;
      }));

    // disconnect realtime
    after('disconnect realtime channel', () => Promise.all(map(participants, (participant) => participant.webex.internal.board.realtime.disconnectMercuryConnection(board))));

    describe('#config', () => {
      it('shares board values', () => {
        // board values
        assert.isDefined(spockRealtimeChannel.config.pingInterval);
        assert.isDefined(spockRealtimeChannel.config.pongTimeout);
        assert.isDefined(spockRealtimeChannel.config.forceCloseDelay);

        // mercury values not defined in board
        assert.isUndefined(spockRealtimeChannel.config.backoffTimeReset);
        assert.isUndefined(spockRealtimeChannel.config.backoffTimeMax);
      });
    });

    describe('#publish()', () => {
      describe('string payload', () => {
        let uniqueRealtimeData;

        before(() => {
          uniqueRealtimeData = uuid.v4();
        });

        flaky(it, process.env.SKIP_FLAKY_TESTS)('posts a message to the specified board', () => {
          const data = {
            envelope: {
              channelId: board,
              roomId: conversation.id
            },
            payload: {
              msg: uniqueRealtimeData
            }
          };

          // confirm that both are connected.
          assert.isTrue(spockRealtimeChannel.connected, 'spock is connected');
          assert.isTrue(mccoyRealtimeChannel.connected, 'mccoy is connected');

          spock.webex.internal.board.realtime.publish(board, data);

          return maxWaitForEvent(5000, 'event:board.activity', mccoyRealtimeChannel)
            .then((event) => {
              assert.equal(event.data.contentType, 'STRING');
              assert.equal(event.data.payload.msg, uniqueRealtimeData);
            });
        });
      });

      describe('file payload', () => {
        let testScr;

        it('uploads file to webex files which includes loc', () => mccoy.webex.internal.board._uploadImage(board, fixture)
          .then((scr) => {
            assert.property(scr, 'loc');
            testScr = scr;
          }));

        flaky(it, process.env.SKIP_FLAKY_TESTS)('posts a file to the specified board', () => {
          const data = {
            envelope: {
              channelId: board,
              roomId: conversation.id
            },
            payload: {
              displayName: 'image.png',
              type: 'FILE',
              file: {
                scr: testScr
              }
            }
          };

          // confirm that both are listening.
          assert.isTrue(spockRealtimeChannel.connected, 'spock is connected');
          assert.isTrue(mccoyRealtimeChannel.connected, 'mccoy is listening');

          spock.webex.internal.board.realtime.publish(board, data);

          return maxWaitForEvent(5000, 'event:board.activity', mccoyRealtimeChannel)
            .then((event) => {
              assert.equal(event.data.contentType, 'FILE');
              assert.equal(event.data.payload.file.scr.loc, testScr.loc);
              assert.equal(event.data.payload.displayName, 'image.png');
            });
        });
      });
    });
  });
});
