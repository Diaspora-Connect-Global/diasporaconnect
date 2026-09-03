# Frontend: getUploadUrl media upload flow

**Audience:** Frontend  
**Purpose:** Single source of truth for the signed-URL upload flow. File goes from browser → GCS (not through the API). After upload, use `publicUrl` in your message/post payload.

---

## Overview

1. **Request** a signed upload URL (GraphQL, authenticated).
2. **PUT** the file directly to `uploadUrl` (browser → GCS; no API gateway, no `Authorization` header).
3. **Use** `publicUrl` in your payload (e.g. chat message `content`, post media).

---

## Step 1 — Request a signed upload URL

**Requires:** Bearer token (authenticated).

```graphql
query GetUploadUrl($contentType: String!, $category: String!) {
  getUploadUrl(contentType: $contentType, category: $category) {
    uploadUrl    # signed GCS URL to PUT the file to
    publicUrl    # public URL of the file after upload
    objectKey    # GCS object key/path
    expiresAt    # Unix timestamp (Float) when the signed URL expires (ms)
  }
}
```

**Variables example:**

```json
{
  "contentType": "image/jpeg",
  "category": "chat"
}
```

**Response example:**

```json
{
  "data": {
    "getUploadUrl": {
      "uploadUrl": "https://storage.googleapis.com/.../...?X-Goog-Signature=...",
      "publicUrl": "https://storage.googleapis.com/.../chat-media/{userId}/{uuid}.jpg",
      "objectKey": "chat-media/{userId}/{uuid}.jpg",
      "expiresAt": 1740859200000
    }
  }
}
```

- `expiresAt` is a **Unix timestamp in milliseconds** (number). The signed URL is typically valid for **60 minutes**. Do not treat it as an ISO date string.

---

## Step 2 — Upload the file directly to GCS

PUT the file to `uploadUrl`. This is a **direct browser-to-GCS** request — do not send it through the API gateway.

```ts
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': contentType },  // must match what you passed in Step 1
  body: file,                                 // the raw File/Blob object
});
```

- **No `Authorization` header** — the signed URL is already authenticated.
- **`Content-Type`** must **exactly match** the `contentType` used in Step 1 or GCS may reject the upload.

---

## Step 3 — Use publicUrl in your payload

After a successful PUT (expect 200), pass **`publicUrl`** as the image reference wherever needed (e.g. chat message attachment, post media).

- **Chat:** `sendMessage` with `messageType: "IMAGE"`, `content: publicUrl`, and **`mimeType`** (must match the `contentType` used in `getUploadUrl`). Allowed per type: IMAGE → image/jpeg, image/png, image/gif, image/webp; VIDEO → video/mp4, video/webm, video/quicktime; AUDIO → audio/mpeg, audio/wav, audio/ogg, audio/mp4; FILE → application/pdf, application/msword, Office MIME types, text/plain.
- **Posts:** use `publicUrl` in the post media payload as required by your API.

---

## Supported categories and content types

### Allowed types for category: `"chat"`

| Type       | MIME types |
|-----------|----------------------------------------------------------------|
| Images    | `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml` |
| Video     | `video/mp4`, `video/quicktime`, `video/x-msvideo`, `video/webm` |
| Audio     | `audio/mpeg`, `audio/mp4`, `audio/aac`, `audio/wav`, `audio/ogg` |
| Documents | `application/pdf`, `application/msword`, .docx, .xls, .xlsx, .ppt, .pptx (backend accepts the equivalent MIME types for Office formats) |
| Text      | `text/plain`, `text/csv` |

Use `chatMediaContentType(file.type)` from `@/services/gql/upload` so the value passed to `getUploadUrl` and the PUT header is one of the allowed types (fallback: `application/octet-stream`).

### Other categories

| category           | Allowed contentType values (examples) |
|--------------------|--------------------------------------|
| avatar             | standard image types                 |
| cover              | standard image types                 |
| group_avatar       | standard image types                 |
| community_avatar   | standard image types                 |
| community_cover    | standard image types                 |
| association_avatar | standard image types                 |
| event_cover        | standard image types                 |
| event_media        | standard image types                 |

---

## Implementation reference

- **Query and types:** `src/services/gql/upload.ts` (`GET_UPLOAD_URL`, `GetUploadUrlResponse`).
- **Chat (DM):** `DirectMessageChat.tsx` — get signed URL → PUT with same Content-Type → send message with `content: publicUrl`.
- **Chat (group):** `GroupChat.tsx` — same flow.
- **Avatar / group avatar:** `useImageUpload.tsx` — get URL → PUT cropped blob with same Content-Type → `onSuccess(publicUrl)`.
