# Backend instruction: Chat WebSocket (real-time messages & typing)

This document specifies what the backend must implement so the frontend chat works as designed: **incoming messages show real content without refresh** and **"Kofi typing..."** appears when the other user is typing and disappears when they stop or send.

---

## 1. Current frontend behavior (no backend changes needed for messages)

### 1.1 Real-time message content

- The frontend already receives `message:new` over the WebSocket and shows a placeholder.
- It then **refetches** the GraphQL query `getMessages(conversationId, limit, offset)` to load the latest list, including the new message with **decrypted content**.
- **Requirement:** The existing `message:new` WebSocket event and the GraphQL `getMessages` API must remain as they are. In particular:
  - **WebSocket `message:new`** must be emitted to all participants in the conversation when a new message is created (excluding the sender if you already do that). Payload must include at least: `messageId`, `conversationId`, `senderId`, `type`, `timestamp`; content can remain encrypted/opaque.
  - **GraphQL `getMessages`** must return the latest messages for that `conversationId` with **decrypted** `content` (and any other fields the UI needs). The frontend relies on this for real-time content after a new message.

No new backend work is required for real-time message content **unless** `message:new` is not yet sent to other participants or `getMessages` does not return decrypted content.

---

## 2. Typing indicator – what the backend must implement

The frontend is already implemented to **emit** and **listen for** typing events. The backend must accept these emissions and **broadcast** them to the right participants.

### 2.1 Events and payloads

| Direction | Event name     | Who sends        | Payload (JSON)                          |
|----------|----------------|------------------|-----------------------------------------|
| Client → Server | `typing:start` | Client (user typing) | `{ "conversationId": "<uuid>" }`         |
| Client → Server | `typing:stop`  | Client (user stopped/sent) | `{ "conversationId": "<uuid>" }`         |
| Server → Client | `typing:start` | Server (broadcast) | `{ "conversationId": "<uuid>", "userId": "<uuid>" }` |
| Server → Client | `typing:stop`  | Server (broadcast) | `{ "conversationId": "<uuid>", "userId": "<uuid>" }` |

- **conversationId:** UUID of the conversation (same as used in `message:new` and `getMessages`).
- **userId:** For **server → client** only. Must be the ID of the user who is typing (the one who sent the client → server event). The frontend uses this to show "Kofi typing..." and to ignore its own user.

The client does **not** send `userId` in the payload; the server must infer it from the authenticated session (e.g. JWT or socket auth) and add it when broadcasting.

### 2.2 Server behavior

1. **Authentication**  
   When a client connects (e.g. Socket.IO with `auth: { token }`), resolve the authenticated user and store `userId` for that socket.

2. **On `typing:start` (client → server)**  
   - Validate payload: `conversationId` is required and must be a valid conversation UUID.
   - Optionally verify that the authenticated user is a participant in that conversation (recommended).
   - **Broadcast** to **all other participants** in that conversation (do not send to the sender):
     - Emit event `typing:start` with payload:  
       `{ "conversationId": "<same>", "userId": "<authenticated user id>" }`.  
   - Only participants in the same conversation should receive this event.

3. **On `typing:stop` (client → server)**  
   - Same validation as for `typing:start`.
   - **Broadcast** to **all other participants** in that conversation (do not send to the sender):
     - Emit event `typing:stop` with payload:  
       `{ "conversationId": "<same>", "userId": "<authenticated user id>" }`.

4. **Conversation membership**  
   Use the same notion of “participants in conversation X” as you use for `message:new` (e.g. direct chat = 2 users, group = N members). Only those participants should receive typing events for that conversation.

### 2.3 Optional: throttling and cleanup

- **Throttling:** Clients may send `typing:start` on every keystroke. You may throttle per (userId, conversationId) on the server (e.g. at most one `typing:start` per 1–2 seconds) before re-broadcasting, to reduce traffic. The frontend will still show “typing…” as long as it receives at least one `typing:start` and then a `typing:stop` (or a timeout on the client).
- **Auto stop:** If the client disconnects or leaves the conversation without sending `typing:stop`, you may optionally broadcast a `typing:stop` for that user in that conversation so other clients clear the indicator. This is not strictly required because the frontend also clears “typing” after ~5 seconds without a new `typing:start` or `typing:stop`.

### 2.4 Summary checklist for backend

- [ ] Authenticate socket and know `userId` for each connection.
- [ ] Handle client event `typing:start` with payload `{ conversationId }`; validate conversation and membership.
- [ ] Handle client event `typing:stop` with payload `{ conversationId }`; same validation.
- [ ] For each event, broadcast to **other participants only** (not sender) with payload `{ conversationId, userId }` on the same event name (`typing:start` or `typing:stop`).
- [ ] (Optional) Throttle re-broadcast of `typing:start`.
- [ ] (Optional) On socket disconnect, emit `typing:stop` for that user in any conversation they were in.

---

## 3. Example flow (typing)

1. User A (Kofi) and User B are in a direct conversation.
2. Kofi types in the input → frontend emits `typing:start` with `{ conversationId: "conv-123" }`.
3. Backend receives it, resolves Kofi’s `userId` from auth, and emits to User B only:  
   `typing:start` with `{ conversationId: "conv-123", userId: "<Kofi's userId>" }`.
4. User B’s frontend receives it and shows “Kofi typing…”.
5. Kofi stops typing (or sends a message) → frontend emits `typing:stop` with `{ conversationId: "conv-123" }`.
6. Backend broadcasts to User B: `typing:stop` with `{ conversationId: "conv-123", userId: "<Kofi's userId>" }`.
7. User B’s frontend receives it and hides “Kofi typing…”.

---

## 4. Reference: frontend usage

- **Client emit (Socket.IO):**  
  `socket.emit('typing:start', { conversationId })`  
  `socket.emit('typing:stop', { conversationId })`
- **Client listen:**  
  `socket.on('typing:start', (data) => ...)` where `data` is `{ conversationId, userId }`  
  `socket.on('typing:stop', (data) => ...)` where `data` is `{ conversationId, userId }`

The frontend ignores events where `userId` is the current user and only shows typing for other participants in the current conversation.
