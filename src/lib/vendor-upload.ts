/**
 * Vendor file upload: PUT file to a signed URL from requestVendorUploadUrl.
 * Use the readUrl returned by the mutation in product.images, logoUrl, or downloadUrl.
 *
 * Flow:
 * 1. requestVendorUploadUrl({ vendorId, fileName, contentType, fileType }) → { uploadUrl, readUrl }
 * 2. uploadFileToVendorSignedUrl(uploadUrl, file) (this function)
 * 3. Pass readUrl into createProduct.images, updateVendor logoUrl, or downloadUrl
 */

/**
 * Uploads a file directly to GCS using a signed upload URL.
 * No auth header is sent to the upload URL.
 *
 * @param uploadUrl - Signed URL from requestVendorUploadUrl
 * @param file - File to upload
 * @param contentType - Optional; defaults to file.type
 * @throws If the PUT request fails (non-2xx)
 */
export async function uploadFileToVendorSignedUrl(
  uploadUrl: string,
  file: File,
  contentType?: string
): Promise<void> {
  // The signed URL is generated with an immutable Cache-Control header
  // (SignedHeaders=cache-control;content-type;host), so the PUT must send the
  // exact same value or GCS rejects it with 400 (signature mismatch).
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType ?? file.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body: file,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vendor upload failed: ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
  }
}
