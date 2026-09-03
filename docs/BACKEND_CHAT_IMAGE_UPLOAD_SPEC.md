# Backend: Chat Image (and File) Upload — Exact Requirements

**Audience:** Backend team  
**Purpose:** So the frontend can send real images (and later other files) in direct and group chat instead of the literal text `"image"`.  
**Last updated:** 2026-02-28

---

## 1. What the frontend does (you must support this)

1. User selects an image in chat → frontend calls **GraphQL `getUploadUrl`** with `contentType` (e.g. `image/jpeg`) and **`category: "chat"`**.
2. Frontend receives **`uploadUrl`** (signed upload URL) and **`publicUrl`** (URL to read the file after upload).
3. Frontend **PUTs the file** to `uploadUrl` with header `Content-Type: <contentType>`.
4. Frontend calls **GraphQL `sendMessage`** with:
   - `messageType: "IMAGE"`
   - **`content: <publicUrl>`** (the exact string returned in step 2).
5. For display, frontend uses **`getMessages`** and shows the image from **`mediaMetadata.gcsPath`** or, if missing, from **`content`** when it looks like a URL (e.g. starts with `http`).

You must implement the backend so this flow works end-to-end.

---

## 2. GraphQL: `getUploadUrl` — support category `"chat"`

### 2.1 Current usage

The frontend already uses:

```graphql
query GetUploadUrl($contentType: String!, $category: String!) {
  getUploadUrl(contentType: $contentType, category: $category) {
    uploadUrl
    publicUrl
    objectKey
    expiresAt
  }
}
```

Today you may support only `category: "avatar"` and/or `"group_avatar"`. The frontend now also sends **`category: "chat"`** for chat image uploads.

### 2.2 What you must do

- **Accept `category: "chat"`** in `getUploadUrl`.
- **Return exactly**:
  - **`uploadUrl`** (string): Signed URL for a **single PUT** upload (e.g. GCS signed PUT). The client will send the file body with `Content-Type: <contentType>`.
  - **`publicUrl`** (string): URL that is **publicly readable** (or readable by your app / CDN) after the upload. The frontend stores this in the message `content` and uses it (or `mediaMetadata.gcsPath`) to render the image.
  - **`objectKey`** (string): GCS object key/path; frontend does not rely on it for display.
  - **`expiresAt`** (number): Unix timestamp in milliseconds when the signed URL expires.

### 2.3 Constraints you may enforce

- **Allowed categories:** `"avatar"`, `"group_avatar"`, **`"chat"`**.
- **Content types for chat:** e.g. `image/*` (e.g. `image/jpeg`, `image/png`, `image/gif`, `image/webp`). Reject non-image if you want chat to be image-only for now.
- **Max file size:** e.g. 5 MB for chat images (frontend suggests 5 MB).
- **Signed URL expiry:** e.g. 15–60 minutes.

### 2.4 CORS

- The **`uploadUrl`** (signed upload URL) is used by the **browser** with `fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } })`.
- So the storage bucket (or proxy) that serves the signed URL must allow **PUT** from the frontend origin and expose any CORS headers required for that request.

---

## 3. GraphQL: `sendMessage` — store and return the image URL

### 3.1 What the frontend sends for images

For an **image** message the frontend sends:

- `conversationId`: string (UUID)
- **`messageType: "IMAGE"`**
- **`content`: the exact `publicUrl` string** from `getUploadUrl` (step 2 above)
- `idempotencyKey`: string (optional)
- `mentions`: array or null (optional)
- `replyToId`: string or null (optional)

So for IMAGE messages, **`content` is the URL of the uploaded file**, not the literal text `"image"` or `"Image"`.

### 3.2 What you must do

- **Persist the message** with:
  - `type` = IMAGE (or your internal equivalent).
  - **`content`** = the received string (the `publicUrl`).
- Optionally also store **media metadata** (fileName, fileSize, mimeType, storage path or URL) so you can return **`mediaMetadata`** in `getMessages` (see below). If you do, **`mediaMetadata.gcsPath`** must be a URL (or path) that the frontend can use to display the image (same as `content` or a CDN URL).

- **Authorization:** Only participants of the conversation may send messages (same as for TEXT).
- **Idempotency:** If `idempotencyKey` is provided, deduplicate by that key so the same key does not create duplicate messages.

---

## 4. GraphQL: `getMessages` — return image URL so the UI can display it

### 4.1 What the frontend expects

The frontend calls:

```graphql
query GetMessages($conversationId: String!, $limit: Int, $offset: Int) {
  getMessages(conversationId: $conversationId, limit: $limit, offset: $offset) {
    messages {
      id
      conversationId
      senderId
      type
      content
      mentions { userId, username }
      replyToId
      mediaMetadata {
        fileName
        fileSize
        mimeType
        gcsPath
      }
      isEdited
      editedAt
      isDeleted
      createdAt
    }
    total
    hasMore
  }
}
```

For an **IMAGE** message the frontend will display the image if **either**:

- **`mediaMetadata.gcsPath`** is set and is a valid URL (or path that you resolve to a URL), **or**
- **`content`** looks like a URL (e.g. starts with `http`).

So you have two ways to satisfy the UI:

1. **Option A:** Return **`content`** = the stored URL (the `publicUrl` you were given in `sendMessage`), and optionally **`mediaMetadata.gcsPath`** = the same URL (or a CDN variant).
2. **Option B:** Return **`mediaMetadata.gcsPath`** = the readable URL; **`content`** can be the same or empty for IMAGE.

The important part: **at least one of `content` or `mediaMetadata.gcsPath` must be a URL the frontend can use in `<img src="...">`.**

### 4.2 Summary for getMessages

- For **TEXT** messages: `content` is the text; `mediaMetadata` can be null/omitted.
- For **IMAGE** messages: `content` must be the stored image URL (the `publicUrl`); **and/or** `mediaMetadata.gcsPath` must be a URL that serves the image. Both can be the same URL.

---

## 5. WebSocket (optional but recommended)

The frontend may also emit over Socket.IO:

- Event: **`message:send`**
- Payload: `{ conversationId, type: "image", content: "<publicUrl>", idempotencyKey?, mentions?, replyToId? }`

So when the client sends an image, **`content`** is again the **URL string** (the same `publicUrl`), not the word `"image"`.

- If you accept this event and create the message on the server, store **`content`** as that URL and (if you use it) set **`mediaMetadata.gcsPath`** to a displayable URL as in section 4.
- Emit **`message:new`** to participants so they get real-time updates; the frontend will then refetch **`getMessages`** to get decrypted content and metadata.

---

## 6. Checklist for backend

- [ ] **getUploadUrl** accepts **`category: "chat"`** and returns **`uploadUrl`** (signed PUT) and **`publicUrl`** (readable URL).
- [ ] Signed **PUT** endpoint allows the frontend origin (CORS) and accepts the file upload.
- [ ] **sendMessage** accepts **messageType IMAGE** with **content = publicUrl** and stores it.
- [ ] **getMessages** returns IMAGE messages with **content** and/or **mediaMetadata.gcsPath** set to a URL that can be used for `<img src="...">`.
- [ ] (Optional) **message:send** over WebSocket with **type `"image"`** and **content = URL** is handled and stored the same way.

---

## 7. Optional: other media types (FILE, VIDEO, AUDIO)

The same pattern can be used later:

- **getUploadUrl** with **`category: "chat"`** and appropriate **`contentType`** (e.g. `application/pdf`, `video/mp4`).
- **sendMessage** with **messageType: "FILE"** (or VIDEO/AUDIO) and **content: publicUrl**.
- **getMessages** returning **content** and/or **mediaMetadata.gcsPath** for display or download links.

No frontend change is required in the contract; only **getUploadUrl** supporting the relevant content types and **sendMessage**/getMessages handling those types.

---

*End of backend instruction.*
