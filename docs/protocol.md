# Minecraft Classic Protocol

The multiplayer communication in Minecraft Classic is primarily done peer-to-peer. However, before this P2P link can be set up, communication with a server is done to orchestrate the P2P creation. The protocol is split into 3 parts: HTTP, WebSocket and P2P.

<ul>
  <li><a href="#http">HTTP</a></li>
  <li><a href="#websocket">WebSocket</a></li>
  <li><a href="#p2p">P2P</a></li>
</ul>

## HTTP

This step mostly consists of fetching various configuration options from a web server. Request data is passed as part of the URL, responses are passed in JSON. All URLs are prefixed with `https://9p1bb7fwdf.execute-api.us-east-1.amazonaws.com/prod/`, but this is left out here for the sake of brevity.

The requests that are made are, in order:

<table>
  <thead>
    <tr>
      <th>Endpoint</th>
      <th>Request parameters</th>
      <th>Response</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan=2><b>/game/multiplayer-enabled</b></td>
      <td>None</td>
      <td><pre><code>{ "multiplayerEnabled": "true" }</code></pre></td>
      </tr>
      <tr><td colspan=2>
        If <code>multiplayerEnabled</code> is anything other than the string `"true"`, protocol ends.
      </td>
    </tr>
    <tr>
      <td rowspan=2><b>/game/:id</b></td>
      <td>If joining an existing game, <code>:id</code> is the ID of said game.<br>Otherwise it is empty.</td>
      <td><pre><code>{ "code": "abcdefg" }</code></pre></td>
      </tr>
      <tr><td colspan=2>
        The returned code is used in subsequent requests to identify the game.
      </td>
    </tr>
    <tr>
      <td rowspan=2><b>/create-channel/:code</b></td>
      <td><code>:code</code> is the code returned in the previous request.</td>
      <td>None</td>
      </tr>
      <tr><td colspan=2>
        Request is not made if joining an existing game.
      </td>
    </tr>
    <tr>
      <td rowspan=2><b>/get-ice-candidates/:code</b></td>
      <td><code>:code</code> is the code returned in a previous request.</td>
      <td><pre><code>{
  "v": {
    "iceServers": {
      "urls": "stun:stun.l.google.com:19302"
    }
  }
}</code></pre></td>
      </tr>
      <tr><td colspan=2>
        Request is only made if joining an existing game.<br>The returned <code>urls</code> is used as a STUN server when creating the P2P connection. Note that the <code>urls</code> field is not an array, despite the name.
      </td>
    </tr>
    <tr>
      <td rowspan=2><b>/get-signaling-token/:code/:id</b></td>
      <td><code>:code</code> is the code returned in a previous request. <code>:id</code> is either <code>host</code> (if creating a new game) or a random string.</td>
      <td><pre><code>{ "v": "some-token" }</code></pre></td>
      </tr>
      <tr><td colspan=2>
        The returned token is used when creating a WebSocket connection to the server.
      </td>
    </tr>
    <tr>
      <td rowspan=2><b>/get-signaling-host/:code/:id</b></td>
      <td><code>:code</code> is the code returned in a previous request. <code>:id</code> is the same as in previous request.</td>
      <td><pre><code>{ "v": "wss://example.com" }</code></pre></td>
      </tr>
      <tr><td colspan=2>
        The returned host is used when creating a WebSocket connection to the server.
      </td>
    </tr>
  </tbody>
</table>

## WebSocket

After the HTTP part is finished, a WebSocket connection is opened to `<signaling-host>/v2/<signaling-token>`, where `<signaling-host>` and `<signaling-token>` are the values received from the web server.

A message containing the data `ping` is sent every 800ms. All other messages are of the format

    {
      "t": "u",
      "m": {
        "f": "<game-code>/<id>",
        "t": "<recipient-id>",
        "o": "message"
      },
      "p": {
        "signal": "<signal-data>"
      }
    }

where `<game-code>` is the code returned by the `/game/:id` endpoint, `<id>` is the ID used in the `/get-signaling-token/:code/:id` endpoint, `<recipient-id>` is the ID of the intended recipient, and `<signal-data>` is the signaling data required to create a WebRTC connection.

If joining an existing game, a [`simple-peer`](https://github.com/feross/simple-peer) instance is immediately created. Once the signaling data is available for it, a message is sent to the recipient `"host"`. The host will in turn create its own `simple-peer` instance, set its signaling to the received data, and send any generated signaling data back.

This process creates the needed P2P connection using `simple-peer`.

## P2P

All P2P messages are stringified JSON objects, with the required key `"type"` being used to identify its type. The messages are split into host-to-player and player-to-host types.

### Host-to-player

<table>
  <thead>
    <tr>
      <th>Format</th>
      <th>Comment</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><pre><code>{
  "type": "welcomeInfo",
  "hostName": "temp",
  "gameFull": false,
  "playerCount": 2,
  "maxPlayers": 10,
  "worldSeed": 123456,
  "worldSize": 128,
  "spawnPoint": null,
  "numberOfChangedBlocks": 1234
}</code></pre></td>
      <td>Sent once when the player connects to the host.</td>
    </tr>
    <tr>
      <td><pre><code>{
  "type": "chatLog",
  "chatLog": [
    {
      "message": "message entered by the player",
      "timestamp": 12345678,
      "from": "player-name",
      "type": "message"     // "message", "local", "left" or "joined"
    }
  ]
}</code></pre></td>
      <td>Sent whenever any player sends a chat message. <code>chatLog</code> array is a list of new messages to add to the player's chat log. Messages of type <code>"local"</code> are displayed in yellow without sender name, <code>"left"</code> are appended with <code>" left the game"</code>, and <code>"joined"</code> are appended with <code>" joined the game"</code></td>
    </tr>
    <tr>
      <td><pre><code>{
  "type": "fireEvent",
  "data": {
    "targetedBlockBlockID": 1,
    "targetedBlockPosition": [0, 0, 0],
    "targetedBlockAdjacentPosition": [0, 0, 0],
    "chosenBlock": 1,   // the currently selected block in the player's hotbar
    "addMode": false    // whether we're adding or removing blocks
  }
}</code></pre></td>
      <td>Sent whenever any player clicks.</td>
    </tr>
    <tr>
      <td><pre><code>{
  "type": "players",
  "players": [
    {
      "name": "player-name",
      "id": "player-id",
      "state": {
        "name": "player-name",
        "position": { "x": 0, "y": 0, "z": 0 },
        "rotation": { "x": 0, "y": 0, "z": 0 },
        "walking": false,
        "spawned": true
      }
    }
  ]
}</code></pre></td>
      <td>Sent every time the host updates (multiple times per second).</td>
    </tr>
    <tr>
      <td><pre><code>{
  "type": "kicked"
}</code></pre></td>
      <td>Sent when the player is kicked.</td>
    </tr>
    <tr>
      <td><pre><code>{
  "type": "changedBlocks",
  "blocks": [
    {
      "p": [0, 0, 0],
      "add": false,
      "bt": 0
    }
  ],
  "from": 0
}</code></pre></td>
      <td>Sent in response to a <code>"requestChanges"</code> message. Never contains more than 1000 blocks.</td>
    </tr>
  </tbody>
</table>

### Player-to-host

<table>
  <thead>
    <tr>
      <th>Format</th>
      <th>Comment</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><pre><code>{
  "type": "connected",
}</code></pre></td>
      <td>Sent once when the player connects to the host.</td>
    </tr>
    <tr>
      <td><pre><code>{
  "type": "playerState",
  "data": {
    "state": ? // untested
  }
}</code></pre></td>
      <td>Untested</td>
    </tr>
    <tr>
      <td><pre><code>{
  "type": "setBlockTypeAt",
  "data": {
    "blockTypeId": 1,
    "position": [0, 0, 0]
  }
}</code></pre></td>
      <td>Untested. Never actually used.</td>
    </tr>
    <tr>
      <td><pre><code>{
  "type": "fireEvent",
  "data": {
    "targetedBlockBlockID": 1,
    "targetedBlockPosition": [0, 0, 0],
    "targetedBlockAdjacentPosition": [0, 0, 0],
    "chosenBlock": 1,   // the currently selected block in the player's hotbar
    "addMode": false    // whether we're adding or removing blocks
  }
}</code></pre></td>
      <td>Untested. Will be immediately sent to all other players too.</td>
    </tr>
    <tr>
      <td><pre><code>{
  "type": "message",
  "message": {
    "message": "message entered by the player",
    "timestamp": 12345678,
    "from": "player-name",
    "type": "message"     // "message", "local", "left" or "joined"
  }
}</code></pre></td>
      <td>Untested. Causes the <code>"chatLog"</code> message to be sent to all players.</td>
    </tr>
    <tr>
      <td><pre><code>{
  "type": "requestChanges",
  "from": 0
}</code></pre></td>
      <td>Untested. Causes the <code>"changedBlocks"</code> message to be sent to the player, containing up to 1000 changed blocks starting from index <code>from</code>.</td>
    </tr>
  </tbody>
</table>
