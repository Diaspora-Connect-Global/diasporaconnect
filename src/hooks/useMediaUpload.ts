"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { toast } from "sonner";

import {
    GET_UPLOAD_URL,
    chatMediaContentType,
    type GetUploadUrlResponse,
} from "@/services/gql/upload";
import { useChatStore, type ApiMessage } from "@/store/ChatStore";

interface UploadFilesParams {
    files: File[];
    conversationId: string;
    senderId: string;
    /** Caption text shown inside the "sending..." placeholder while files upload. */
    messageText: string;
}

export interface UploadedAttachment {
    publicUrl: string;
    mimeType: string;
}

export interface UploadFilesResult {
    attachments: UploadedAttachment[];
    /** Placeholder message id. Pass to {@link UseMediaUploadResult.finalizeUpload} after the send mutation resolves (success OR failure). */
    placeholderId: string;
    /** Derived from the first uploaded attachment's mime type. */
    messageType: "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
}

interface UseMediaUploadResult {
    /**
     * Creates a "sending..." placeholder message, uploads each file via the GraphQL upload URL
     * + S3 PUT, and resolves with the uploaded attachments. On any failure the placeholder is
     * removed, blob URLs are revoked, and a toast is shown — null is returned.
     *
     * The caller is still responsible for the send-message mutation. After it resolves
     * (success or error), call `finalizeUpload(placeholderId)` to clean up the placeholder.
     */
    uploadFiles: (params: UploadFilesParams) => Promise<UploadFilesResult | null>;
    /** Remove the "sending..." placeholder from the store and revoke its blob URLs. */
    finalizeUpload: (placeholderId: string) => void;
}

function pickMessageType(mime: string): UploadFilesResult["messageType"] {
    if (mime.startsWith("image/")) return "IMAGE";
    if (mime.startsWith("video/")) return "VIDEO";
    if (mime.startsWith("audio/")) return "AUDIO";
    return "FILE";
}

export function useMediaUpload(): UseMediaUploadResult {
    const [getUploadUrl] = useLazyQuery<GetUploadUrlResponse>(GET_UPLOAD_URL);
    const addApiMessage = useChatStore((s) => s.addApiMessage);
    const removeApiMessage = useChatStore((s) => s.removeApiMessage);

    /** placeholderId → blob URLs that need URL.revokeObjectURL on cleanup. */
    const pendingRevokeRef = useRef<Record<string, string[]>>({});

    // Belt-and-suspenders: revoke any leftover blob URLs if the component unmounts mid-upload.
    useEffect(() => {
        const pending = pendingRevokeRef.current;
        return () => {
            Object.values(pending).forEach((urls) => urls.forEach(URL.revokeObjectURL));
            pendingRevokeRef.current = {};
        };
    }, []);

    const finalizeUpload = useCallback(
        (placeholderId: string) => {
            (pendingRevokeRef.current[placeholderId] ?? []).forEach(URL.revokeObjectURL);
            delete pendingRevokeRef.current[placeholderId];
            removeApiMessage(placeholderId);
        },
        [removeApiMessage],
    );

    const uploadFiles = useCallback(
        async ({ files, conversationId, senderId, messageText }: UploadFilesParams): Promise<UploadFilesResult | null> => {
            if (!files.length) return null;

            const placeholderId = `pending-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
            const sendingPreviews: Array<{ url?: string; mimeType: string }> = [];
            const urlsToRevoke: string[] = [];
            const firstFileMime = files[0]?.type || "";
            const placeholderType: ApiMessage["type"] = pickMessageType(firstFileMime);

            for (const file of files) {
                const mime = file.type || "application/octet-stream";
                if (mime.startsWith("image/") || mime.startsWith("video/")) {
                    const url = URL.createObjectURL(file);
                    sendingPreviews.push({ url, mimeType: mime });
                    urlsToRevoke.push(url);
                } else {
                    sendingPreviews.push({ mimeType: mime });
                }
            }

            // Track blob URLs *before* adding placeholder so an unmount/error mid-loop still cleans up
            pendingRevokeRef.current[placeholderId] = urlsToRevoke;
            addApiMessage({
                id: placeholderId,
                conversationId,
                senderId,
                type: placeholderType,
                content: messageText.trim(),
                createdAt: new Date().toISOString(),
                status: "sending",
                attachments: [],
                sendingPreviews,
            });

            const uploaded: UploadedAttachment[] = [];

            try {
                for (const file of files) {
                    const contentType = chatMediaContentType(file.type || "application/octet-stream");
                    const { data: uploadData } = await getUploadUrl({
                        variables: { contentType, category: "chat" },
                    });

                    if (!uploadData?.getUploadUrl?.uploadUrl) {
                        finalizeUpload(placeholderId);
                        toast.error("Could not get upload URL. Please try again.");
                        return null;
                    }

                    const { uploadUrl, publicUrl } = uploadData.getUploadUrl;
                    const uploadRes = await fetch(uploadUrl, {
                        method: "PUT",
                        body: file,
                        headers: { "Content-Type": contentType },
                    });

                    if (!uploadRes.ok) {
                        finalizeUpload(placeholderId);
                        toast.error(`Upload failed for ${file.name}. Please try again.`);
                        return null;
                    }

                    uploaded.push({ publicUrl, mimeType: contentType });
                }
            } catch (err) {
                console.error("Upload failed:", err);
                finalizeUpload(placeholderId);
                toast.error("Upload failed. Please try again.");
                return null;
            }

            const messageType = pickMessageType(uploaded[0]?.mimeType ?? "");
            return { attachments: uploaded, placeholderId, messageType };
        },
        [addApiMessage, finalizeUpload, getUploadUrl],
    );

    return { uploadFiles, finalizeUpload };
}
