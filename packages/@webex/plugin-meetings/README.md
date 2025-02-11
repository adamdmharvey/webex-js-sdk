# @webex/plugin-meetings

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> Meetings plugin for the Cisco Webex JS SDK.

- [Install](#install)
- [Usage](#usage)
- [Important Changes](#important-changes)
- [Development](#development)
- [Contribute](#contribute)
- [Maintainers](#maintainers)
- [License](#license)

# WARNING: This plugin is currently under active development

## Install

```bash
npm install --save @webex/plugin-meetings
```

## Usage

This is a plugin for the Cisco Webex JS SDK . Please see our [developer portal](https://developer.webex.com/) and the [API docs](https://webex.github.io/webex-js-sdk/api/) for full details.

## Important Changes

- Version `0.109.0` - Participant email has been removed to reduce PII. Please use participant identity (`members.membersCollection.members[id].participant.identity`) to lookup participant details via the [/people](https://developer.webex.com/docs/api/v1/people/get-person-details) endpoint.

## API Docs and Sample App
API Docs: https://webex.github.io/webex-js-sdk/api/
Hosted Sample App: https://webex.github.io/webex-js-sdk/samples/browser-plugin-meetings/
See https://github.com/webex/webex-js-sdk/tree/master/docs/samples/browser-plugin-meetings for the sample app code vs the readme

#### Device Registration

The meetings plugin relies on websocket data to function. The user's device needs to register and connect to the web socket server.

These setup actions are handled with the `register` function.

This function registers the device, connects web sockets, and listens for meeting events.

```js
webex.meetings.register()
```

#### Device Unregistration

The inverse of the `register()` function is available as well.
This function stops listening for meeting events, disconnects from web sockets and unregisters the device.

```js
webex.meetings.unregister()
```

#### Creating a basic meeting

##### Via [developer portal room id](https://developer.webex.com/docs/api/v1/rooms)

```javascript
let roomId = `Y2lzY29zcGFyazovL3VzL1JPT00vNWZhMWUzODAtZTkzZS0xMWU5LTgyZTEtOGRmYTg5ZTgzMjJm `;
return webex.meetings.create(roomId).then((meeting) ==> {...});
```

##### Via [developer portal people id](https://developer.webex.com/docs/api/v1/people)

```javascript
let peopleId = `Y2lzY29zcGFyazovL3VzL1BFT1BMRS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAw `;
return webex.meetings.create(peopleId).then((meeting) ==> {...});
```

##### Via conversation url

```javascript
let conversationUrl = `https://conv-a.wbx2.com/conversation/api/v1/ObiwanAnnouncementsConversationUUID`;
return webex.meetings.create(conversationUrl).then((meeting) ==> {...});
```

##### Via SIP URI

```javascript
let sipUri = `obiwan@example.com`;
return webex.meetings.create(sipUri).then((meeting) ==> {...});
```

##### Via Locus Object

```javascript
// unlikely to be used
return webex.meetings.create(locusObj, 'LOCUS_ID').then((meeting) ==> {...});
```

#### Meetings

##### List Active Meetings
We want to sync our meetings collection with the server.

```js
let existingMeetings;
// Sync Meetings From Server
webex.meetings.syncMeetings().then(() => {
  // Existing meetings live in the meeting collection
  existingMeetings = webex.meetings.getAllMeetings();
});
```

##### Get a Meeting

```js
webex.meetings.getMeetingByType('SIP_URI', sipUri)
```

##### Properties
```js
webex.meetings.personalMeetingRoom // the personal meeting room instance
webex.meetings.reachability // the reachability instance, not initialized until after setReachability is called
webex.meetings.meetingCollection // the collection of meetings instance
webex.meetings.meetingInfo // the meeting info instance
```

##### Media

After a meeting is created and joined, the media from the meeting needs to be connected.

###### Local Media

To get the local device media we use the function on the meeting object `getMediaStreams`. This takes an options object of which media streams to enable:

```js
const mediaSettings = {
  receiveVideo: true,
  receiveAudio: true,
  receiveShare: true,
  sendVideo: true,
  sendAudio: true,
  sendShare: false
};

const myStreams = {}
meeting.getMediaStreams(mediaSettings).then(([localStream, localShare]) => {
  return {localStream, localShare};
}).then((streams) => {
  myStreams.localStream = streams.localStream
  myStreams.localShare = streams.localShare
});
```

This local stream is now ready to be added to the DOM for a self preview via:

```html
<video id="localvideo" muted="true" autoplay playsinline></video>
```

```js
document.getElementById('localvideo').srcObject = myStreams.localStream;
```

##### Add Media

Once you have your local streams and shares, you need to add the media to the meeting with the `addMedia` function.

```js
meeting.addMedia({
  localShare,
  localStream,
  mediaSettings
}).then((mediaResponse) => {
  // do something once you know media has been completed
});
```

#### Join a meeting

##### Basic Join
One can join a meeting without adding a media to just be present in the meeting without send/receive
Once a meeting object has been created, to start it, simply `join` it.
```javascript
let destination = `obiwan@example.com`; // email example
return webex.meetings
  .create(destination)
  .then((meeting) => {
    activeMeeting = meeting;
    // attach listeners or other actions
    activeMeeting.join().then(() => {
      // now the meeting is joined!
      // now you can addMedia
    });
  });
```

##### Full Example

```javascript
let activeMeeting;

const mediaSettings = {
  receiveVideo: true,
  receiveAudio: true,
  receiveShare: true,
  sendVideo: true,
  sendAudio: true,
  sendShare: false
};

const myStreams = {}

function setMedia(media){
  if (media.type === 'local') {
    document.getElementById('<videoId>').srcObject = media.stream;
  } else if (media.type === 'remote') {
    document.getElementById('<videoId>').srcObject = media.stream;
  }
}

function handleAudioChange(audio){
  // perform some actions after audio has been muted/unmuted
}

function handleVideoChange(video) {
  // perform some action after video has been muted/unmuted
}

return webex.meetings
  .create(destination)
  .then((meeting) => {
    activeMeeting = meeting;
    activeMeeting.getMediaStreams(mediaSettings).then(([localStream, localShare]) => {
      return {localStream, localShare};
    }).then((streams) => {
      myStreams.localStream = streams.localStream
      myStreams.localShare = streams.localShare
    });
    activeMeeting.on('media:ready', () => setMedia));
    activeMeeting.on('media:audioChanged', handleAudioChange);
    activeMeeting.on('media:videoChanged', handleVideoChange);
    // join a meeting using resourceId as the destination, i.e., paired to a device and using the device for the call
    activeMeeting.join({resourceId: <DeviceId>}).then((joinResponse) => {
      activeMeeting.addMedia({
      localShare,
      localStream,
      mediaSettings
    }).then((mediaResponse) => {
    // do something once you know media has been completed
    });
    });
  });
```

##### Join a PMR

From above, we build off of the join...

##### Join your own claimed PMR

```javascript
...
meeting.join().then((res) => {
  // backend services determine you are the owner, so no pin, or moderator flag is required
  // now you are in the meeting
});
...
```

##### Join someone elses claimed PMR

```javascript
...
// join as host (in place of them)
meeting.join({pin: <WebexHostPin>, moderator: true}).then((res) => {
  // now you are in the meeting
});
```

```javascript
...
// join as attendee
meeting.join({pin: <WebexMeetingPin>}).then((res) => {
  // if host hasn't started the meeting, now you are in the lobby, else if host has started the meeting, you are in the meeting
});
```

##### Join an unclaimed PMR

```javascript
// join as host automatically
meeting.join({pin: <WebexHostPin>, moderator: true}).then((res) => {
  // now you are in the meeting
});
```

```javascript
// join as host with ask user option
// join as attendee
meeting.join().then((res) => {
}).catch((err) => {
  if (err.joinIntentRequired) {
    // at this point you can ask the user to join as host or join as guest
    // if join as host, requires a pin
    ...
    // join as host simply makes the join call again with the proper pin/moderator parameters
    meeting.join({pin: <WebexHostPin>, moderator: true}).then(() => {
      // you are now in the meeting
    });
    ...
    // join as guest simply makes the call again with moderator parameter
    meeting.join(({moderator: false})).then(() => {
      // if host hasn't started the meeting, now you are in the lobby, else if host has started the meeting, you are in the meeting
    });
  }
});
```

##### Join an incoming meeting

When listening to an added meeting, to determine if it is an "incoming" meeting, check the type property of the meeting:

```js
webex.meetings.on('meeting:added', (addedMeeting) => {
  if (addedMeeting.type === 'INCOMING') {
    // Handle incoming meeting
    addedMeeting.acknowledge();
    addedMeeting.join().then(() => {});
  }
```

##### Reject an incoming meeting

When listening to an added meeting, to determine if it is an "incoming" meeting, check the type property of the meeting:

```js
webex.meetings.on('meeting:added', (addedMeeting) => {
  if (addedMeeting.type === 'INCOMING') {
    // Handle incoming meeting
    addedMeeting.decline();
  }
```

#### Enable receiving meeting real-time transcripts

In order to receive meeting transcripts, Webex assistant must be enabled for the meeting.

```javascript
...
// Subscribe to transcription events
meeting.on('meeting:receiveTranscription:started', (payload) => {
  console.log(payload);
});

meeting.on('meeting:receiveTranscription:stopped', () => {});

await meeting.join({receiveTranscription: true});
```
##### Microphone, Speaker and Camera
Select a different device than the default:

```js
const audioInputSelect = document.querySelector('select#audioSource');
const audioOutputSelect = document.querySelector('select#audioOutput');
const videoSelect = document.querySelector('select#videoSource');
```

```js
const audio = {};
const video = {};
const media = {
  receiveVideo: boolean,
  receiveAudio: boolean,
  receiveShare: boolean,
  sendShare: boolean,
  sendVideo: boolean,
  sendAudio: boolean
};

// setting up the devices
const selectors = [audioInputSelect, audioOutputSelect, videoSelect];

meeting.getDevices().then((deviceInfos) => {
const values = selectors.map((select) => select.value);

selectors.forEach((select) => {
  while (select.firstChild) {
    select.removeChild(select.firstChild);
  }
});
for (let i = 0; i !== deviceInfos.length; i += 1) {
  const deviceInfo = deviceInfos[i];
  const option = document.createElement('option');

  option.value = deviceInfo.deviceId;
  if (deviceInfo.kind === 'audioinput') {
    option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
    audioInputSelect.appendChild(option);
  }
  else if (deviceInfo.kind === 'audiooutput') {
    option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
    audioOutputSelect.appendChild(option);
  }
  else if (deviceInfo.kind === 'videoinput') {
    option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
    videoSelect.appendChild(option);
  }
  else {
    console.log('Some other kind of source/device: ', deviceInfo);
  }
}
selectors.forEach((select, selectorIndex) => {
  if (Array.prototype.slice.call(select.childNodes).some((n) => n.value === values[selectorIndex])) {
    select.value = values[selectorIndex];
  }
});

// attaching before the request

audio.deviceId = {exact: audioInputSelect.value}
video.deviceId = {exact: videoSelect.value}
meeting.getMediaStreams(media, {audio, video}).then(...)
```

###### Changing remote audio output
```js
// Attach audio output device to video element using device/sink ID.
function attachSinkId(element, sinkId) {
  if (typeof element.sinkId !== 'undefined') {
    element.setSinkId(sinkId)
      .then(() => {
        console.log(`Success, audio output device attached: ${sinkId}`);
      })
      .catch((error) => {
        let errorMessage = error;

        if (error.name === 'SecurityError') {
          errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
        }
        console.error(errorMessage);
        // Jump back to first output device in the list as it's the default.
        audioOutputSelect.selectedIndex = 0;
      });
  }
  else {
    console.warn('Browser does not support output device selection.');
  }
}

audioOutputSelect.onchange = function () {
  attachSinkId(document.getElementById('remoteaudio'), audioOutputSelect.value);
};
```

##### Record
```js
// you can only pause if recording
// you can only start recording if not recording
// you can only resume recording if paused
// you can only pause recording if started
meeting.startRecording();
meeting.pauseRecording();
meeting.resumeRecording();
meeting.stopRecording();
// note, all recording is done in the cloud
// local recording is not yet available for this package
// but is technically possible
// please submit a feature request if desired :)
// https://github.com/webex/webex-js-sdk/blob/master/CONTRIBUTING.md
```

##### Mute Audio or Video
```js
meeting.muteAudio();
meeting.muteVideo();
```

##### Unmute Audio or Video
```js
meeting.unmuteAudio();
meeting.unmuteVideo();
```

##### Start Sending a Share
```js
meeting.shareScreen();
```

##### Stop Sending a Share
```js
meeting.stopShare();
```

##### Update Audio/Video Streams
Use this if you want to change the actual streams send and receive for audio or video component separately; `updateAudio` and `updateVideo` is for the developer to add and remove the streams completely.
```js
//video
  if (media.sendVideo) {
    meeting.getMediaStreams({sendVideo: true}, {video: videoSelect.value ? {deviceId: {exact: videoSelect.value}} : media.sendVideo})
      .then(([localStream]) => meeting.updateVideo({
        stream: localStream,
        sendVideo: media.sendVideo,
        receiveVideo: media.receiveVideo
      }));
  }
  else {
    meeting.updateVideo({
      sendVideo: media.sendVideo,
      receiveVideo: media.receiveVideo
    });
  }
//audio
  if (media.sendAudio) {
    meeting.getMediaStreams(media, {audio: audioInputSelect.value ? {deviceId: {exact: audioInputSelect.value}} : media.sendAudio})
      .then(([localStream]) => meeting.updateAudio({
        stream: localStream,
        sendAudio: media.sendAudio,
        receiveAudio: media.receiveAudio
      }));
  }
  else {
    meeting.updateAudio({
      sendAudio: media.sendAudio,
      receiveAudio: media.receiveAudio
    });
  }
//all in one
  meeting.getMediaStreams(media, {audio, video})
    .then(([localStream, localShare]) => meeting.updateMedia({
      mediaSettings: media,
      localStream,
      localShare
    }));
```


##### Accessing media directly (outside of a meeting)
You can also directly access the following media properties that are not on a meeting instance

```
this.media.getUserMedia(mediaSetting, audioVideo, sharePreferences, config)
```

See the [Media](https://github.com/webex/webex-js-sdk/blob/master/packages/node_modules/%40webex/plugin-meetings/src/media/index.js) util file for method signatures.

##### Leave a Meeting
To leave a meeting, simply call leave
```js
myMeeting.leave();
```

##### Lock/Unlock a Meeting
```js
meeting.lockMeeting();
meeting.unlockMeeting();
```

##### Transfer Host
```js
const hostMemberId = ...;
meeting.transfer(hostMemberId);
```

##### Check User Actions
```js
meeting.inMeetingActions.get();
{
  canInviteNewParticipants: boolean,
  canAdmitParticipant: boolean,
  canLock: boolean,
  canUnlock: boolean,
  canAssignHost: boolean,
  canStartRecording: boolean,
  canPauseRecording: boolean,
  canResumeRecording: boolean,
  canStopRecording: boolean,
  canRaiseHand: boolean,
  canLowerAllHands: boolean,
  canLowerSomeoneElsesHand: boolean,
}
```

#### Personal Meeting Room

##### Edit Personal Meeting Room

```javascript
const link = ...; // a valid pmr link
const pin = ...; // a valid host pin assoicated to the link
// claiming a pmr, and updating the cached values for the stored PMR
webex.meetings.personalMeetingRoom.claim(link, pin).then((pmr) => {
  console.log(pmr); // do something else with the pmr
});
```

##### Get Personal Meeting Room

```javascript
webex.meetings.personalMeetingRoom.get().then((pmr) => {
  // do some stuff with the pmr values
  console.log(`PMR INFO:
      link-${webex.meetings.personalMeetingRoom.meetingLink}-
      uri-${webex.meetings.personalMeetingRoom.sipUri}-
      tollFree-${webex.meetings.personalMeetingRoom.pmr.callInNumbersInfo.callInTollFreeNumber.number}-
      toll-${webex.meetings.personalMeetingRoom.pmr.callInNumbersInfo.callInTollNumber.number}-
      accessCode-${webex.meetings.personalMeetingRoom.pmr.meetingNumber}
      `);
});
```

#### Usage of Webex Devices
For details on how to use the devices see https://github.com/webex/webex-js-sdk/tree/master/packages/node_modules/%40webex/plugin-device-manager

##### Leave a Meeting Using a Device
```js
const resourceId = ...;

meeting.leave({resourceId}).then((res) => {
  console.log(`successful leave with device, ${res}`);
});
```

##### Leave a Meeting While Paired to the Device, Keep Device in Meeting
```js
meeting.leave().then((res) => {
  console.log(`successful leave, ${res}`);
});
```

##### Move Meeting To Paired Device
```js
const resourceId = ...

meeting.moveTo(resourceId).then((res) => {
  console.log(`successful move to ${res}`);
});
}
```

##### Move Meeting from Paired Device
```js
const resourceId = ...

meeting.moveFrom(resourceId).then((res) => {
  console.log(`successful move from ${res}`);
});
```

##### Start Wireless Share
```js
const deviceId = ...
// create the meeting
webex.meetings.create(deviceId).then((m) => {
// attach listeners
// then join the meeting
meeting.getMediaStreams({
        sendAudio: false,
        sendVideo: false,
        sendShare: true
      }))
      .then(([localStream, localShare]) =>
        meeting.addMedia({
          mediaSettings: {
            sendAudio: false,
            sendVideo: false,
            sendShare: true,
            receiveShare: false,
            receiveAudio: false,
            receiveVideo: false
          },
          localShare,
          localStream
        }))
      .catch((e) => {
        meeting.leave();
        console.error('Error wireless screen sharing', e);
      });
}
```

##### End Wireless Share
```js
meeting.leave();
```

##### Reconnect a Meeting Media
Warning: not necessary to use manually, internally the sdk listens to mercury reconnect events to determine for a reconnection
```js
meeting.reconnect();
```

#### Scheduled Meetings
For scheduled meetings see https://github.com/webex/webex-js-sdk/tree/master/packages/node_modules/%40webex/internal-plugin-calendar


#### Member

##### Properties
```javascript
member.participant ... // Object server participant object, advanced use only
member.id ... // String key for storing
member.name ... // String plain text name
member.isAudioMuted ... // Boolean
member.isVideoMuted ... // Boolean
member.isHandRaised ... //Boolean
member.isSelf ... // Boolean is this member YOUR user?
member.isHost ... // Boolean
member.isGuest ... // Boolean
member.isInLobby ... // Boolean
member.isInMeeting ... // Boolean
member.isNotAdmitted ... // Boolean -- waiting to be admitted to the meeting, will also have isInLobby true
member.isContentSharing ... // Boolean
member.status ... // String -- advanced use only
member.isDevice ... // Boolean
member.isUser ... // Boolean
member.associatedUser ... // String -- member.id if isDevice is true
member.isRecording ... // Boolean
member.isMutable ... // Boolean
member.isRemovable ... // Boolean
member.type ... // String
member.isModerator ... // Boolean
member.isModeratorAssignmentProhibited ... // Boolean
```

#### Members
 You can access the members object on each individual meeting instance. It has some key events to listen to, and maintains what happens for members of a meeting with some key properties.

##### Properties
```javascript
meeting.members.membersCollection.members ... // the members collection, object {id0: member0, ... idN: memberN}
meeting.members.locusUrl ... // current locusUrl being used
meeting.members.hostId ... // active host id for the meeting
meeting.members.selfId ... // active self id for the meeting
meeting.members.mediaShareContentId ... // active content sharer id for the meeting
```

##### Functions
```javascript
// You can add a guest to the meeting by inviting them, this is proxied by meeting.invite
// use an emailAddress and a boolean value alertIfActive to notify server side (usually true)
meeting.members.addMember(emailAddress, alertIfActive)

// You can admit the guest to the meeting once they are waiting in the lobby, you can do this in bulk, proxied by meeting.admit
// use member ids, can be singular, but has to be put into an array
meeting.members.admitMembers([memberIds])

// You can remove a member from the meeting by booting them, this is proxied by meeting.remove
// use a memberId string
meeting.members.removeMember(memberId)

// You can audio mute a member from the meeting by calling to mute them, this is proxied by meeting.mute
// use a memberId string and a boolean to mute or not, default to true
// mute them
meeting.members.muteMember(memberId)

// You can raise or lower the hand of a member from the meeting
// use a memberId string and a "raise" boolean to raise or lower, default to true ("raise the hand")
meeting.members.raiseOrLowerHand(memberId)

// You can lower all hands in a meeting
// use a memberId string to indicate who is requesting lowering all hands
meeting.members.lowerAllHands(requestingMemberId)

// You can transfer the host role to another member in the meeting, this is proxied by meeting.transfer
// use a memberId string and a moderator boolean to transfer or not, default to true
meeting.members.transferHostToMember(memberId)
```

##### Events
```javascript
// members collection updated
meeting.members.on('members:update', (payload) => {
  const delta = payload.delta; // the changes to the members list
  const full = payload.full; // the full members collection
  const updated = delta.updated; // only the updates, includes removals, as they will have updated status and member properties
  const added = delta.added; // added members to the meeting
  Object.keys(full).forEach((key) => {
    const member = full[key];
    console.log(`Member: ... ${member.x}`);
  });
  Object.keys(updated).forEach((key) => {
    const member = updated[key];
    console.log(`Member Updated: ... ${member.x}`);
  });
  Object.keys(added).forEach((key) => {
    const member = added[key];
    console.log(`Member Added: ... ${member.x}`);
  });
});
// content updates
meeting.members.on('members:content:update', (payload) => {
  console.log(`who started sharing: ${payload.activeContentSharingId};`);
  console.log(`who stopped sharing: ${payload.endedContentSharingId};`);
});
// host updates
meeting.members.on('members:host:update', (payload) => {
  console.log(`who started hosting: ${payload.activeHostId};`);
  console.log(`who stopped hosting: ${payload.endedHostId};`);
})
// self updates, not typically used
meeting.members.on('members:self:update', (payload) => {
  console.log(`active self id: ${payload.activeSelfId};`);
  console.log(`ended self Id: ${payload.endedSelfId};`);
})
```

## Events

### Meetings Events
```js
webex.meetings.on(...)
```
| Event Name | Description |
|---|---|
| `meetings:ready` | Fired when the plugin has been instantiated and is ready for action! |
| `meeting:added` | Fired when a meeting has been added to the collection, either incoming, or outgoing, can be joined |
| `meeting:removed` | Fired when a meeting has been deleted from the collection, this meeting cannot be rejoined |
|`media:codec:loaded`| Fired when H.264 media codec has been loaded in the browser. Does not have a payload.|
|`media:codec:missing`| Fired when H.264 media codec appears to be missing from the browser. Does not have a payload. |
|---|---|

`meetings:ready` does not have a payload

`meeting:added` has the following payload
```js
{
  meetingId // the uuid of the meeting removed
  type // string type can be INCOMING, JOIN, or MEETING
}
```

`meeting:removed` has the following payload
```js
{
  meetingId // the uuid of the meeting removed
  response // a propagated server response
}
```

### Meeting Events

```js
meeting.on(...)
```

| Event Name | Description |
|---|---|
| `meetings:ready` | Fired when the meetings plugin has been successfully initialized |
| `meetings:registered` | Fired when the meetings plugin has registered the device and is listening to websocket events |
| `meetings:unregistered` | Fired when the meetings plugin has been disconnected from websockets and unregistered as a device |
| `media:ready` | Fired when remote or local media has been acquired |
| `media:stopped` | Fired when remote or local media has been torn down |
| `meeting:media:local:start` | Fired when local media has started sending bytes |
| `meeting:media:remote:start` | Fired when local media has started receiving bytes from the remote audio or video streams |
| `meeting:alerted` | Fired when locus was notified that user received meeting |
| `meeting:ringing` | Fired when meeting should have a ringing sound on repeat |
| `meeting:ringingStop` | Fired when meeting should stop a ringing sound |
| `meeting:startedSharingLocal` | Fired when local screen sharing was started |
| `meeting:stoppedSharingLocal` | Fired when local screen sharing ends |
| `meeting:startedSharingRemote` | Fired when remote screen sharing was started |
| `meeting:stoppedSharingRemote` | Fired when remote screen sharing ends |
| `meeting:self:lobbyWaiting` | Fired when user has entered the lobby for a PMR or the like |
| `meeting:self:guestAdmitted` | Fired when user has entered the meeting after waiting to be admitted from join |
| `meeting:self:mutedByOthers` | Fired when user has been audio muted by another in the muting |
| `meeting:reconnectionStarting` | Fired when a reconnect begins |
| `meeting:reconnectionSuccess` | Fired when the media was reconnected successfully |
| `meeting:reconnectionFailure` | Fired when the media failed to reconnect, user will have to rejoin and connect |
| `meeting:unlocked` | Fired when the meeting was unlocked by the host, for webex type meetings only |
| `meeting:locked` | Fired when the meeting was locked by the host, for webex type meetings only |
| `meeting:actionsUpdate` | Fired when the user has new actions they can take, such as lock, unlock, transferHost |
| `meeting:logUpload:success` | Fired when the meeting logs were successfully uploaded |
| `meeting:logUpload:failure` | Fired when the meeting logs failed to upload |
| `meeting:recording:started` | Fired when member starts recording |
| `meeting:recording:stopped` | Fired when member stops recording |
| `meeting:recording:paused`  | Fired when member pauses recording |
| `meeting:recording:resumed` | Fired when member resumes recording |
| `meeting:receiveTranscription:started` | Fired when transcription is received |
| `meeting:receiveTranscription:stopped` | Fired when transcription has stopped from being received |
| `meeting:meetingContainer:update` | Fired when the meetingContainerUrl is updated |
|---|---|

`meetings:ready` does not have a payload

`meetings:registered` does not have a payload

`meetings:unregistered` does not have a payload

`media:ready` has the following payload
```javascript
{
  type, // local or remote
  stream; // the MediaStream
}
// usage
meeting.on('media:ready', (media) => {
  if (!media) {
    return;
  }
  if (media.type === 'local') {
    document.getElementById('localvideo').srcObject = media.stream;
  }
  if (media.type === 'remoteVideo') {
    document.getElementById('remotevideo').srcObject = media.stream;
  }
  if (media.type === 'remoteAudio') {
    document.getElementById('remoteaudio').srcObject = media.stream;
  }
  if (media.type === 'remoteShare') {
    document.getElementById('sharevideo').srcObject = media.stream;
  }
  if (media.type === 'localShare') {
    document.getElementById('localshare').srcObject = media.stream;
  }
});
```

`media:stopped` has the following payload
```javascript
{
  type, // local or remote
}
// usage
meeting.on('media:stopped', (media) => {
  if (media.type === 'local') {
    document.getElementById('localvideo').srcObject = null;
  }
  if (media.type === 'remoteVideo') {
    document.getElementById('remotevideo').srcObject = null;
  }
  if (media.type === 'remoteAudio') {
    document.getElementById('remoteaudio').srcObject = null;
  }
  if (media.type === 'localShare') {
    document.getElementById('localshare').srcObject = null;
  }
  if (media.type === 'remoteShare') {
    document.getElementById('sharevideo').srcObject = null;
  }
});
```

`meeting:alerted` does not have a payload

`meeting:ringing` has the following payload
```js
{
  type // INCOMING or JOIN
  id // the meeting id
}
```

`meeting:ringingStop` has the following payload
```js
{
  type // Object {remoteAnswered: boolean, remoteDeclined: boolean}
  id // the meeting id
}
```

`meeting:startedSharingLocal` does not have a payload

`meeting:stoppedSharingLocal` does not have a payload

`meeting:self:lobbyWaiting` has the following payload
```js
{
  payload // self object
}
```

`meeting:self:guestAdmitted` has the following payload
```js
{
  payload // self object
}
```

`meeting:self:mutedByOthers` has the following payload
```js
{
  payload // self object
}
```

`meeting:reconnectionStarting` does not have a payload

`meeting:reconnectionSuccess` has the following payload
```js
{
  reconnect // the media promise resolution
}
```

`meeting:reconnectionFailure` has the following payload
```js
{
  error // the forwarded error from media
}
```

`meeting:unlocked` has the following payload
```js
{
  info // info object
}
```

`meeting:locked` has the following payload
```js
{
  info // info object
}
```

`meeting:actionsUpdate` has the following payload
```js
{
  canInviteNewParticipants, // boolean
  canAdmitParticipant, // boolean
  canLock, // boolean
  canUnlock, // boolean
  canAssignHost, // boolean
  canStartRecording, // boolean
  canPauseRecording, // boolean
  canResumeRecording, // boolean
  canStopRecording, // boolean
  canRaiseHand, //boolean
  canLowerAllHands, //boolean
  canLowerSomeoneElsesHand, //boolean
}
```

`meeting:recording:started`
`meeting:recording:stopped`
`meeting:recording:paused`
`meeting:recording:resumed` have the following payload
```js
{
  state // could be etiher `recording`, `idle` or `paused`
  modifiedBy // user's decrypted ID who made an action
  lastModified // when the action was made
}
```

### Event Caveats
##### Remote screen share is not displayed if started before participant joins

If you notice that the remote screen share is not being displayed to a participant when they join
after a screen has already been shared, double-check that you are following the standard plugin-meeting workflow.

Standard plugin-meeting workflow is as follows:
1. Set event listener for `media:ready`
2. Call `join()`
3. Call `addMedia()` with `options.mediaSettings.receiveShare=true`
4. Wait to receive an event from `media:ready` with payload `type=remoteShare` that contains the remote share media stream
5. Set `srcObject` of a `video` element in the application to the previously obtained media stream
(e.g. `document.getElementById('remote-screen').srcObject = media.stream`)

In most cases this will resolve the issue though an extra step could be to
use `meeting.shareStatus` to control whether to show the video element or not.

This may be necessary as you can only register for events like `meeting:startedSharingRemote` on the
meeting object, however, you can only do that after you've received the `meeting:added` event notification
with the meeting payload. In the case when a host has already begun sharing before a participant joins,
the registration for `meeting:startedSharingRemote` happens too late (after the SDK code that would send
that event is already executed). Thus, you can check the value of `meeting.shareStatus` when you join the meeting
to control whether to show that video element (the one that has srcObject set to the remote share stream) on the screen or not.

### Members Events

```js
meeting.members.on(...)
```

There are several events submitted by this package that you can subscribe to.
| Event Name | Description |
|---|---|
| `members:update` | Fired when a member in the collection has been updated |
| `members:content:update` | Fired when a member in the collection has a changed content stream (share screen) |
| `members:host:update` | Fired when a member in the collection has a changed host value |
| `members:self:update` | Fired when a member in the collection has a changed self value |
|---|---|


`members:update` has the following payload
```js
{
  delta: { // the changes to the members list
    updated // array only the updates, includes removals, as they will have updated status and member properties
    added // array added members to the meeting
  }
  full: // array the full members collection
}
```

`members:content:update` has the following payload
```js
{
  activeContentSharingId // the member id
  endedContentSharingId // the member id
}
```

`members:host:update` has the following payload
```js
{
  activeHostId // the member id
  endedHostId // the member id
}
```

`members:self:update` has the following payload
```js
{
  activeSelfId // the member id
  endedSelfId // the member id
}
```

## Development

To use `webpack-dev-server` to load this package, run `yarn run samples:serve`.


Files placed in the `docs/samples/browser-plugin-meetings` folder will be served statically.

Files in the `src` folder will be compiled, bundled, and served as a static asset at `bundle.js` inside that directory.

## Maintainers

This package is maintained by [Cisco Webex for Developers](https://developer.webex.com/).

## Contribute

Pull requests welcome. Please see [CONTRIBUTING.md](https://github.com/webex/webex-js-sdk/blob/master/CONTRIBUTING.md) for more details.

## License

© 2016-2020 Cisco and/or its affiliates. All Rights Reserved.
