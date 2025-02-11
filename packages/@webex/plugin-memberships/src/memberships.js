/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import {
  SDK_EVENT,
  createEventEnvelope,
  ensureMyIdIsAvailable,
  buildHydraMembershipId,
  buildHydraMessageId,
  buildHydraOrgId,
  buildHydraPersonId,
  buildHydraRoomId,
  getHydraClusterString,
  getHydraRoomType,
  deconstructHydraId
} from '@webex/common';
import {WebexPlugin, Page} from '@webex/webex-core';
import {cloneDeep} from 'lodash';

const debug = require('debug')('memberships');

/**
 * @typedef {Object} MembershipObject
 * @property {string} id - Unique identifier for the membership
 * @property {string} roomId - The room ID
 * @property {string} personId - The person ID
 * @property {email} personEmail - The email address of the person / room member
 * @property {boolean} isModerator - Indicates whether the specified person should be a room moderator
 * @property {boolean} isMonitor - Indicates whether the specified member is a room monitor
 * @property {isoDate} created - The date and time that this membership was created
 */

/**
 * Memberships represent a person's relationship to a room. Use this API to list
 * members of any room that you're in or create memberships to invite someone
 * to a room. Memberships can also be updated to make someone a moderator
 * or deleted to remove them from the room.
 * @class
 * @name Memberships
 */
const Memberships = WebexPlugin.extend({
  /**
   * Register to listen for incoming membership events
   * This is an alternate approach to registering for membership webhooks.
   * The events passed to any registered handlers will be similar to the webhook JSON,
   * but will omit webhook specific fields such as name, secret, url, etc.
   * To utilize the `listen()` method, the authorization token used
   * will need to have `spark:all` and `spark:kms` scopes enabled.
   * Note that by configuring your application to enable or disable `spark:all`
   * via its configuration page will also enable or disable `spark:kms`.
   * See the <a href="https://webex.github.io/webex-js-sdk/samples/browser-socket/">Sample App</a>
   * for more details.
   * @instance
   * @memberof Memberships
   * @returns {Promise}
   * @example
   * webex.memberships.listen()
   *   .then(() => {
   *     console.log('listening to membership events');
   *     webex.memberships.on('created', (event) => {
   *       console.log(`Got a membership:created event:\n${event}`);
   *     }
   *     webex.memberships.on('updated', (event) => {
   *        console.log(`Got a membership:updated event:\n${event}`);
   *     }
   *     webex.memberships.on('seen', (event) => {
   *       // This represents a "read receipt" and will include a
   *       // lastSeenId for the message this member has just "read",
   *       // There is currently no equivelent webhook for this event.
   *       console.log(`Got a membership:seen event:\n${event}`);
   *     }
   *     webex.memberships.on('deleted', (event) =>  => {
   *       console.log(`Got a membership:created event:\n${event}`);
   *     }
   *   })
   *   .catch((e) => console.error(`Unable to register for membership events: ${e}`));
   * // App logic goes here...
   * // Later when it is time to clean up
   * webex.memberships.stopListening();
   * webex.memberships.off('created');
   * webex.memberships.off('updated');
   * webex.memberships.off('seen');
   * webex.memberships.off('deleted');

   */
  listen() {
    // Create a common envelope that we will wrap all events in
    return createEventEnvelope(this.webex,
      SDK_EVENT.EXTERNAL.RESOURCE.MEMBERSHIPS)
      .then((envelope) => {
        this.eventEnvelope = envelope;

        // Register to listen to events
        return this.webex.internal.mercury.connect().then(() => {
          this.listenTo(this.webex.internal.mercury,
            SDK_EVENT.INTERNAL.WEBEX_ACTIVITY,
            (event) => this.onWebexApiEvent(event));
        });
      });
  },

  /**
   * Adds a person to a room. The person can be added by ID (`personId`) or by
   * Email Address (`personEmail`). The person can be optionally added to the room
   * as a moderator.
   * @instance
   * @memberof Memberships
   * @param {MembershipObject} membership
   * @returns {Promise<MembershipObject>}
   * @example
   * webex.rooms.create({title: 'Create Membership Example'})
   *   .then(function(room) {
   *     return webex.memberships.create({
   *      personEmail: 'alice@example.com',
   *      roomId: room.id
   *    });
   *   })
   *   .then(function(membership) {
   *     var assert = require('assert');
   *     assert(membership.id);
   *     assert(membership.roomId);
   *     assert(membership.personId);
   *     assert(membership.personEmail);
   *     assert('isModerator' in membership);
   *     assert('isMonitor' in membership);
   *     assert(membership.created);
   *     return 'success';
   *   });
   *   // => success
   */
  create(membership) {
    return this.request({
      method: 'POST',
      service: 'hydra',
      resource: 'memberships',
      body: membership
    })
      .then((res) => res.body);
  },

  /**
   * Returns a single membership.
   * @instance
   * @memberof Memberships
   * @param {MembershipObject|uuid} membership
   * @returns {Promise<MembershipObject>}
   * @example
   * var membership;
   * webex.rooms.create({title: 'Get Membership Example'})
   *   .then(function(room) {
   *     return webex.memberships.create({
   *       personEmail: 'alice@example.com',
   *       roomId: room.id
   *     });
   *   })
   *   .then(function(m) {
   *     membership = m;
   *     return webex.memberships.get(m.id);
   *   })
   *   .then(function(m) {
   *     var assert = require('assert');
   *     assert.deepEqual(m, membership);
   *     return 'success';
   *   });
   *   // => success
   */
  get(membership) {
    const id = membership.id || membership;

    return this.request({
      service: 'hydra',
      resource: `memberships/${id}`
    })
      .then((res) => res.body.items || res.body);
  },

  /**
   * Returns a list of memberships. In most cases the results will only contain
   * rooms that the authentiated user is a member of. You can filter the results
   * by room to list people in a room or by person to find rooms that a
   * specific person is a member of.
   * @instance
   * @memberof Memberships
   * @param {Object} options
   * @param {string} options.personId
   * @param {string} options.personEmail
   * @param {string} options.roomId
   * @param {number} options.max
   * @returns {Promise<Page<MembershipObject>>}
   * @example
   * var room;
   * webex.rooms.create({title: 'List Membership Example'})
   *   .then(function(r) {
   *     room = r;
   *     return webex.memberships.create({
   *      personEmail: 'alice@example.com',
   *      roomId: room.id
   *     });
   *   })
   *   .then(function() {
   *     return webex.memberships.list({roomId: room.id});
   *   })
   *   .then(function(memberships) {
   *     var assert = require('assert');
   *     assert.equal(memberships.length, 2);
   *     for (var i = 0; i < memberships.length; i+= 1) {
   *       assert.equal(memberships.items[i].roomId, room.id);
   *     }
   *     return 'success';
   *   });
   *   // => success
   */
  list(options) {
    return this.request({
      service: 'hydra',
      resource: 'memberships',
      qs: options
    })
      .then((res) => new Page(res, this.webex));
  },

  /**
   * Returns a list of memberships with details about the lastSeenId for each
   * user, allowing a client to indicate "read status" in a space GUI
   *
   * This differs from the memberships.list() function in the following ways:
   *  -- it accepts only a room or object with a valid roomId
   *  -- no other options, eg: max, are considered
   *  -- results are not paginated
   *  -- memberships in the return do not include the
   *     "created", "isRoomHidden", fields
   *  -- memberships in the return do include the new
   *    "lastSeenId", and "lastSeenDate" fields
   *     these will not exist if the member has never "seen" the space
   *
   * In general this function should be used only when the
   * client needs to access read status info.
   *
   * This function may be deprecated when this info is provided in the membership
   * objects returned in the list function.
   *
   *
   * @instance
   * @memberof Memberships
   * @param {Object} options
   * @param {string} options.roomId
   * @returns {Promise<MembershipObjectList>}
   */
  listWithReadStatus(options) {
    const deconstructedId = deconstructHydraId(options.roomId);
    const conversation = {
      id: deconstructedId.id,
      cluster: deconstructedId.cluster
    };

    return ensureMyIdIsAvailable(this.webex)
      .then(() => this.webex.internal.services.waitForCatalog('postauth')
        .then(() => this.webex.internal.conversation.get(conversation,
          {
            participantAckFilter: 'all', // show lastAck info for each participant
            activitiesLimit: 0 // don't send the whole history of activity
          })
          .then((resp) => {
            try {
              // We keep track of the last read message by each user
              const roomUUID = resp.id;
              const roomId = buildHydraRoomId(roomUUID, conversation.cluster);
              const particpants = resp.participants.items;
              const lastReadInfo = {items: []};
              const roomType = getHydraRoomType(resp.tags);
              const myId = this.webex.internal.me.id;
              const isRoomHidden = resp.tags.includes(SDK_EVENT.INTERNAL.ACTIVITY_TAG.HIDDEN);

              for (let i = 0; i < particpants.length; i += 1) {
                const participant = particpants[i];
                const participantInfo = {
                  id: buildHydraMembershipId(participant.entryUUID, roomUUID,
                    conversation.cluster),
                  roomId,
                  personId: buildHydraPersonId(participant.entryUUID),
                  personEmail: participant.entryEmailAddress ||
                    participant.entryEmail,
                  personDisplayName: participant.displayName,
                  personOrgId: buildHydraOrgId(participant.orgId,
                    conversation.cluster),
                  isMonitor: false, // deprecated, but included for completeness
                  roomType
                  // created is not available in the conversations payload
                };

                if ((isRoomHidden) && (participantInfo.personId === myId)) {
                  participantInfo.isRoomHidden = isRoomHidden;
                }

                if ('roomProperties' in participant) {
                  if ('lastSeenActivityDate' in participant.roomProperties) {
                    participantInfo.lastSeenId =
                      buildHydraMessageId(participant.roomProperties.lastSeenActivityUUID,
                        conversation.cluster);
                    participantInfo.lastSeenDate =
                      participant.roomProperties.lastSeenActivityDate;
                  }
                  if ('isModerator' in participant.roomProperties) {
                    participantInfo.isModerator = participant.roomProperties.isModerator;
                  }
                }

                lastReadInfo.items.push(participantInfo);
              }

              return Promise.resolve(lastReadInfo);
            }
            catch (e) {
              return Promise.reject(e);
            }
          })));
  },

  /**
   * Deletes a single membership.
   * @instance
   * @memberof Memberships
   * @param {MembershipObject|uuid} membership
   * @returns {Promise}
   * @example
   * var membership, room;
   * webex.rooms.create({title: 'Remove Membership Example'})
   *   .then(function(r) {
   *     room = r;
   *     return webex.memberships.create({
   *      personEmail: 'alice@example.com',
   *      roomId: room.id
   *     });
   *   })
   *   .then(function(m) {
   *     membership = m;
   *     return webex.memberships.list({roomId: room.id});
   *   })
   *   .then(function(memberships) {
   *     var assert = require('assert');
   *     assert.equal(memberships.length, 2);
   *     return webex.memberships.remove(membership);
   *   })
   *   .then(function() {
   *     return webex.memberships.list({roomId: room.id});
   *   })
   *   .then(function(memberships) {
   *     var assert = require('assert');
   *     assert.equal(memberships.length, 1);
   *     return 'success';
   *   });
   *   // => success
   */
  remove(membership) {
    const id = membership.id || membership;

    return this.request({
      method: 'DELETE',
      service: 'hydra',
      resource: `memberships/${id}`
    })
      .then((res) => {
        // Firefox has some issues with 204s and/or DELETE. This should move to
        // http-core
        if (res.statusCode === 204) {
          return undefined;
        }

        return res.body;
      });
  },

  /**
   * Used to update a single membership's properties
   * @instance
   * @memberof Memberships
   * @param {MembershipObject|uuid} membership
   * @returns {Promise<MembershipObject>}
   * @example
   * // Change membership to make user a moderator
   * var membership, room;
   * webex.rooms.create({title: 'Memberships Example'})
   *   .then(function(r) {
   *     room = r;
   *     return webex.memberships.list({roomId: room.id});
   *   })
   *   .then(function(memberships) {
   *     membership = memberships.items[0];
   *     var assert = require('assert');
   *     assert.equal(membership.isModerator, false);
   *     membership.isModerator = true;
   *     return webex.memberships.update(membership);
   *   })
   *   .then(function() {
   *     return webex.memberships.get(membership.id);
   *   })
   *   .then(function(membership) {
   *     var assert = require('assert');
   *     assert.equal(membership.isModerator, true);
   *     return 'success';
   *   });
   *   // => success
   * @example
   * // Hide a one on one space
   * var assert = require('assert');
   * var membership, myId;
   * webex.people.get('me')
   *   .then(function(person) {
   *     myId = personId;
   *     return webex.messages.create({
   *       toPersonEmail: 'otherUser@acme.com',
   *       text: 'This message will create a 1-1 space'
   *     });
   *   })
   *   then(function(message) {
   *     return webex.memberships.list({
   *       roomId: message.roomId,
   *       personId: myId
   *     });
   *   })
   *   .then((memberships) => {
   *     membership = memberships.items[0];
   *     assert.equal(membership.isRoomHidden, false);
   *     membership.isRoomHidden = true;
   *     // This will generate a memberships:updated event
   *     // that will only be seen by this user
   *     return webex.memberships.update(membership);
   *   })
   *   .then(function(membership) {
   *     assert.equal(membership.isRoomHidden, true);
   *     return 'success';
   *   });
   *   // => success
   */
  update(membership) {
    const id = membership.id || membership;

    return this.request({
      method: 'PUT',
      service: 'hydra',
      resource: `memberships/${id}`,
      body: membership
    })
      .then((res) => res.body);
  },

  /**
   * Updates the lastSeenId attribute of a membership.
   * Call this method to send a "read receipt" for a given message.
   * This will update the lastSeenId for the user's membership in
   * space where the message is.
   * @instance
   * @memberof Memberships
   * @param {string} message
   * @returns {Promise<MembershipObject>}
   */
  updateLastSeen(message) {
    const activity = {
      id: deconstructHydraId(message.id).id
    };
    const deconstructedId = deconstructHydraId(message.roomId);
    const conversation = {
      id: deconstructedId.id,
      cluster: deconstructedId.cluster
    };

    return this.webex.internal.services.waitForCatalog('postauth')
      .then(() => this.webex.internal.conversation.acknowledge(conversation, activity)
        .then((ack) => ({
          lastSeenId: buildHydraMessageId(ack.object.id, conversation.cluster),
          id: buildHydraMembershipId(ack.actor.entryUUID,
            ack.target.id, conversation.cluster),
          personId: buildHydraPersonId(ack.actor.entryUUID, conversation.cluster),
          personEmail: ack.actor.emailAddress || ack.actor.entryEmail,
          personDisplayName: ack.actor.displayName,
          personOrgId: buildHydraOrgId(ack.actor.orgId, conversation.cluster),
          roomId: buildHydraRoomId(ack.target.id, conversation.cluster),
          roomType: getHydraRoomType(ack.target.tags),
          isRoomHidden: false, // any activity unhides a space.
          isMonitor: false, // deprecated, returned for back compat
          created: ack.published
        })));
  },

  /**
   * This function is called when an internal membership events fires,
   * if the user registered for these events with the public listen() method.
   * External users of the SDK should not call this function
   * @private
   * @memberof Memberships
   * @param {Object} event
   * @returns {void}
   */
  onWebexApiEvent(event) {
    const {activity} = event.data;

    /* eslint-disable no-case-declarations */
    switch (activity.verb) {
      case SDK_EVENT.INTERNAL.ACTIVITY_VERB.CREATE:
        const membershipCreatedEventDataArray =
          activity.object.participants.items.map((participant) => {
            const output = cloneDeep(activity);

            output.target = cloneDeep(activity.object);
            output.object = cloneDeep(participant);

            return this.getMembershipEvent(output,
              SDK_EVENT.EXTERNAL.EVENT_TYPE.CREATED);
          });

        membershipCreatedEventDataArray.forEach((data) => {
          if (data) {
            debug(`membership "created" payload: ${JSON.stringify(data)}`);
            this.trigger(SDK_EVENT.EXTERNAL.EVENT_TYPE.CREATED, data);
          }
        });
        break;

      case SDK_EVENT.INTERNAL.ACTIVITY_VERB.ADD:
        const membershipCreatedEventData =
          this.getMembershipEvent(activity, SDK_EVENT.EXTERNAL.EVENT_TYPE.CREATED);

        if (membershipCreatedEventData) {
          debug(`membership "created" payload: \
            ${JSON.stringify(membershipCreatedEventData)}`);
          this.trigger(SDK_EVENT.EXTERNAL.EVENT_TYPE.CREATED, membershipCreatedEventData);
        }
        break;

      case SDK_EVENT.INTERNAL.ACTIVITY_VERB.LEAVE:
        const membershipDeletedEventData =
          this.getMembershipEvent(activity, SDK_EVENT.EXTERNAL.EVENT_TYPE.DELETED);

        if (membershipDeletedEventData) {
          debug(`membership "deleted" payload: \
            ${JSON.stringify(membershipDeletedEventData)}`);
          this.trigger(SDK_EVENT.EXTERNAL.EVENT_TYPE.DELETED, membershipDeletedEventData);
        }
        break;

      case SDK_EVENT.INTERNAL.ACTIVITY_VERB.ADD_MODERATOR:
      case SDK_EVENT.INTERNAL.ACTIVITY_VERB.REMOVE_MODERATOR:
      case SDK_EVENT.INTERNAL.ACTIVITY_VERB.HIDE:
        const membershipUpdatedEventData =
          this.getMembershipEvent(activity, SDK_EVENT.EXTERNAL.EVENT_TYPE.UPDATED);

        if (membershipUpdatedEventData) {
          debug(`membership "updated" payload: \
            ${JSON.stringify(membershipUpdatedEventData)}`);
          this.trigger(SDK_EVENT.EXTERNAL.EVENT_TYPE.UPDATED, membershipUpdatedEventData);
        }
        break;

      case SDK_EVENT.INTERNAL.ACTIVITY_VERB.ACKNOWLEDGE:
        const membershipSeenEventData =
          this.getMembershipEvent(activity, SDK_EVENT.EXTERNAL.EVENT_TYPE.SEEN);

        if (membershipSeenEventData) {
          debug(`membership "updated" payload: \
            ${JSON.stringify(membershipSeenEventData)}`);
          this.trigger(SDK_EVENT.EXTERNAL.EVENT_TYPE.SEEN, membershipSeenEventData);
        }
        break;

      default:
        break;
    }
  },

  /**
   * Constructs the data object for an event on the memberships resource,
   * adhering to Hydra's Webehook data structure memberships.
   * External users of the SDK should not call this function
   * @private
   * @memberof Memberships
   * @param {Object} activity from mercury
   * @param {Object} event type of "webhook" event
   * @returns {Object} constructed event
   */
  getMembershipEvent(activity, event) {
    try {
      const sdkEvent = cloneDeep(this.eventEnvelope);
      const cluster = (activity.verb !== SDK_EVENT.INTERNAL.ACTIVITY_VERB.HIDE) ?
        getHydraClusterString(this.webex, activity.target.url) :
        getHydraClusterString(this.webex, activity.url);
      let member;
      let space;

      sdkEvent.event = event;
      sdkEvent.data.created = activity.published;
      sdkEvent.actorId = buildHydraPersonId(activity.actor.entryUUID, cluster);
      if (activity.verb !== SDK_EVENT.INTERNAL.ACTIVITY_VERB.HIDE) {
        sdkEvent.data.roomId = buildHydraRoomId(activity.target.id, cluster);
        sdkEvent.data.roomType = getHydraRoomType(activity.target.tags);
        sdkEvent.data.isRoomHidden = false; // any activity unhides a space.
      }
      else {
        sdkEvent.data.roomId = buildHydraRoomId(activity.object.id, cluster);
        sdkEvent.data.roomType = SDK_EVENT.EXTERNAL.SPACE_TYPE.DIRECT;
        // currently hidden attribute is only set on 1-1
        sdkEvent.data.isRoomHidden = true;
      }
      if (activity.verb !== SDK_EVENT.INTERNAL.ACTIVITY_VERB.ACKNOWLEDGE) {
        if ((activity.object.roomProperties) && (activity.object.roomProperties.isModerator)) {
          sdkEvent.data.isModerator = true;
        }
        else {
          sdkEvent.data.isModerator = false;
        }
      }
      // This is deprecated but still sent in the webhooks
      // We won't send it for our new SDK events
      // sdkEvent.data.isMonitor = false;

      if (activity.verb === SDK_EVENT.INTERNAL.ACTIVITY_VERB.ACKNOWLEDGE) {
        // For a read receipt the person is the "actor" or the one who did the reading
        member = SDK_EVENT.INTERNAL.ACTIVITY_FIELD.ACTOR;
        // The space with the read message is the "target"
        space = SDK_EVENT.INTERNAL.ACTIVITY_FIELD.TARGET;
        // And the "object" is the message that was last seen
        sdkEvent.data.lastSeenId = buildHydraMessageId(activity.object.id, cluster);
      }
      else if (activity.verb === SDK_EVENT.INTERNAL.ACTIVITY_VERB.HIDE) {
        // For a hide activity the person is also the "actor"
        member = SDK_EVENT.INTERNAL.ACTIVITY_FIELD.ACTOR;
        // But the space is now the "object"
        space = SDK_EVENT.INTERNAL.ACTIVITY_FIELD.OBJECT;
      }
      else {
        // For most memberships events the person is the 'object"
        member = SDK_EVENT.INTERNAL.ACTIVITY_FIELD.OBJECT;
        // and the space is the "target"
        space = SDK_EVENT.INTERNAL.ACTIVITY_FIELD.TARGET;
      }

      sdkEvent.data.id = buildHydraMembershipId(activity[member].entryUUID,
        activity[space].id, cluster);
      sdkEvent.data.personId = buildHydraPersonId(activity[member].entryUUID, cluster);
      sdkEvent.data.personEmail =
        activity[member].emailAddress || activity[member].entryEmail;
      sdkEvent.data.personDisplayName = activity[member].displayName;
      sdkEvent.data.personOrgId = buildHydraOrgId(activity[member].orgId, cluster);

      return sdkEvent;
    }
    catch (e) {
      this.webex.logger.error(`Unable to generate SDK event from mercury \
'socket activity for memberships:${event} event: ${e.message}`);

      return null;
    }
  }

});

export default Memberships;
