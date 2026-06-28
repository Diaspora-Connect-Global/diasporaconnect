/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ImageIcon,
  X,
  Smile,
  Globe,
  Users,
  Lock,
  ChevronDown,
  Loader2,
  Send,
  Hash,
  AtSign,
} from 'lucide-react';
import { useMutation } from '@apollo/client/react';
import {
  CREATE_POST,
  REQUEST_UPLOAD_URL,
  GET_FEED,
} from '@/services/gql/postsFeed';
import type {
  CreatePostData,
  RequestUploadUrlData,
  AttachmentInput,
} from '@/services/gql/types/postsFeed';
import { toast } from 'sonner';
import { resizeImage } from '@/lib/resizeImage';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useUserStore } from '@/store/useUserStore';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Visibility = 'EVERYONE' | 'FRIENDS' | 'ONLY_ME';

interface FilePreview {
  file: File;
  preview: string; // data URL for images, empty for other types
  objectKey?: string; // set after upload
  uploading: boolean;
  error?: string;
}

interface CreatePostFormProps {
  /** Callback after a post is successfully created */
  onPostCreated?: () => void;
  /** Placeholder text */
  placeholder?: string;
}

/* ------------------------------------------------------------------ */
/*  Visibility options                                                 */
/* ------------------------------------------------------------------ */
const VISIBILITY_OPTIONS: {
  value: Visibility;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: 'EVERYONE', label: 'Everyone', icon: <Globe className="w-4 h-4" /> },
  { value: 'FRIENDS', label: 'Friends', icon: <Users className="w-4 h-4" /> },
  { value: 'ONLY_ME', label: 'Only Me', icon: <Lock className="w-4 h-4" /> },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function CreatePostForm({
  onPostCreated,
  placeholder = "What's on your mind?",
}: CreatePostFormProps) {
  const { user } = useUserStore();
  const { resolvedTheme } = useTheme();

  /* — state — */
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('EVERYONE');
  const [showVisibility, setShowVisibility] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [submitting, setSubmitting] = useState(false);

  /* — refs — */
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const visRef = useRef<HTMLDivElement>(null);

  /* — mutations — */
  const [createPost] = useMutation<CreatePostData>(CREATE_POST, {
    refetchQueries: [
      {
        query: GET_FEED,
        variables: { input: { type: 'FOR_YOU', limit: 20, offset: 0, includeDiscovery: true } },
      },
    ],
  });
  const [requestUploadUrl] = useMutation<RequestUploadUrlData>(REQUEST_UPLOAD_URL);

  /* — auto-resize textarea — */
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, [text]);

  /* — close dropdowns on outside click — */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (visRef.current && !visRef.current.contains(e.target as Node)) {
        setShowVisibility(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* — file selection — */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: FilePreview[] = [];
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10 MB limit`);
        continue;
      }
      const preview = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : '';
      newFiles.push({ file, preview, uploading: false });
    }

    setFiles((prev) => [...prev, ...newFiles]);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const copy = [...prev];
      if (copy[index].preview) URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  };

  /* — upload a single file and return its objectKey — */
  const uploadFile = useCallback(
    async (fp: FilePreview, idx: number): Promise<AttachmentInput | null> => {
      try {
        setFiles((prev) => {
          const c = [...prev];
          c[idx] = { ...c[idx], uploading: true };
          return c;
        });

        const isImage = fp.file.type.startsWith('image/');

        // For images, resize + recompress to WebP before uploading (smaller
        // payload, faster decode, no pop-in). Also yields the LQIP blur-up from
        // the same decode. Non-images pass through untouched.
        const { file: uploadFileBody, width, height, blurDataUrl } = isImage
          ? await resizeImage(fp.file, { maxDimension: 1600 })
          : { file: fp.file, width: 0, height: 0, blurDataUrl: undefined };

        const uploadContentType = isImage ? uploadFileBody.type : fp.file.type;

        // Generate object key (use the resized file's .webp name for images)
        const objectKey = `posts/${Date.now()}-${uploadFileBody.name}`;

        // 1. Get pre-signed URL
        const { data } = await requestUploadUrl({
          variables: {
            fileName: uploadFileBody.name,
            fileType: isImage ? 'IMAGE' : 'FILE',
            contentType: uploadContentType,
            vendorId: user?.userId || 'anonymous',
          },
        });

        if (!data?.requestUploadUrl) throw new Error('Failed to get upload URL');

        const { uploadUrl } = data.requestUploadUrl;

        // 2. PUT file to pre-signed URL. The immutable Cache-Control header is
        // required by the signed URL so the CDN can cache the object forever.
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': uploadContentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
          body: uploadFileBody,
        });

        setFiles((prev) => {
          const c = [...prev];
          c[idx] = { ...c[idx], uploading: false, objectKey };
          return c;
        });

        return {
          objectKey,
          type: isImage ? 'IMAGE' : 'FILE',
          mimeType: uploadContentType,
          size: uploadFileBody.size,
          ...(width && { width }),
          ...(height && { height }),
          ...(blurDataUrl && { blurDataUrl }),
        };
      } catch (err) {
        console.error('Upload failed:', err);
        setFiles((prev) => {
          const c = [...prev];
          c[idx] = { ...c[idx], uploading: false, error: 'Upload failed' };
          return c;
        });
        return null;
      }
    },
    [requestUploadUrl, user?.userId],
  );

  /* — submit post — */
  const handleSubmit = async () => {
    if (!text.trim() && files.length === 0) return;

    setSubmitting(true);

    try {
      // Upload all files in parallel
      let attachments: AttachmentInput[] = [];
      if (files.length > 0) {
        const results = await Promise.all(files.map((f, i) => uploadFile(f, i)));
        attachments = results.filter(Boolean) as AttachmentInput[];

        // If any upload failed, abort
        if (attachments.length !== files.length) {
          toast.error('Some files failed to upload. Please try again.');
          setSubmitting(false);
          return;
        }
      }

      await createPost({
        variables: {
          input: {
            text: text.trim(),
            visibility,
            publishImmediately: true,
            idempotencyKey: crypto.randomUUID(),
            ...(attachments.length > 0 && { attachments }),
          },
        },
      });

      toast.success('Post created!');
      setText('');
      setFiles([]);
      onPostCreated?.();
    } catch (err) {
      console.error('Create post failed:', err);
      toast.error('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  /* — helpers — */
  const insertText = (insertion: string) => {
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => prev + insertion);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = text.slice(0, start);
    const after = text.slice(end);
    const newText = before + insertion + after;
    const newCursorPos = start + insertion.length;
    
    setText(newText);
    
    // Use setTimeout to ensure state update completes first
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    insertText(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const addHashtag = () => {
    const needsSpace = text.length > 0 && !text.endsWith(' ') && !text.endsWith('\n');
    insertText((needsSpace ? ' ' : '') + '#');
    textareaRef.current?.focus();
  };

  const addMention = () => {
    const needsSpace = text.length > 0 && !text.endsWith(' ') && !text.endsWith('\n');
    insertText((needsSpace ? ' ' : '') + '@');
    textareaRef.current?.focus();
  };

  const currentVisOption =
    VISIBILITY_OPTIONS.find((o) => o.value === visibility) ?? VISIBILITY_OPTIONS[0];

  const canSubmit = (text.trim().length > 0 || files.length > 0) && !submitting;

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <div className="w-full bg-surface-default border border-border-subtle rounded-lg p-4">
      {/* Top row: avatar + textarea */}
      <div className="flex gap-3">
        <Image
          src={user?.avatarUrl || '/PROFILE.png'}
          alt="avatar"
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover border border-border-subtle flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="w-full bg-transparent resize-none focus:outline-none text-text-primary placeholder:text-text-secondary body-medium"
            style={{ lineHeight: '1.5rem' }}
            disabled={submitting}
          />
        </div>
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((fp, idx) => (
            <div key={idx} className="relative group">
              {fp.preview ? (
                <img
                  src={fp.preview}
                  alt={fp.file.name}
                  className="w-20 h-20 rounded-lg object-cover border border-border-subtle"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-surface-subtle flex items-center justify-center border border-border-subtle">
                  <span className="text-xs text-text-secondary truncate px-1">
                    {fp.file.name.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
              )}
              {fp.uploading && (
                <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
              {fp.error && (
                <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-red-500 font-medium">!</span>
                </div>
              )}
              <ButtonType2
                onClick={() => removeFile(idx)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 min-w-0 p-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </ButtonType2>
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-border-subtle mt-3 pt-3" />

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {/* Image upload - input overlays button for mobile tap */}
          <div className="relative group">
            <ButtonType3
              type="button"
              disabled={submitting}
              className="p-2 rounded-full group-hover:bg-surface-subtle text-text-secondary group-hover:text-text-primary transition-colors disabled:opacity-50 pointer-events-none border-0 bg-transparent min-w-0"
              title="Attach files"
              aria-hidden
            >
              <ImageIcon className="w-5 h-5 text-text-brand" />
            </ButtonType3>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept="image/*,video/*,.pdf,.doc,.docx"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:pointer-events-none"
              disabled={submitting}
              title="Attach files"
            />
          </div>

          {/* Emoji picker */}
          <div ref={emojiRef} className="relative">
            <ButtonType3
              onClick={() => setShowEmojiPicker((v) => !v)}
              disabled={submitting}
              className="p-2 rounded-full hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 border-0 bg-transparent min-w-0"
              title="Add emoji"
            >
              <Smile className="w-5 h-5 text-text-brand" />
            </ButtonType3>
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 z-50 shadow-xl rounded-lg overflow-hidden">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={resolvedTheme === 'dark' ? Theme.DARK : Theme.LIGHT}
                  width={320}
                  height={400}
                />
              </div>
            )}
          </div>

          {/* Hashtag shortcut */}
          <ButtonType3
            onClick={addHashtag}
            disabled={submitting}
            className="p-2 rounded-full hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 border-0 bg-transparent min-w-0"
            title="Add hashtag"
          >
            <Hash className="w-5 h-5 text-text-brand" />
          </ButtonType3>

          {/* Mention shortcut */}
          <ButtonType3
            onClick={addMention}
            disabled={submitting}
            className="p-2 rounded-full hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 border-0 bg-transparent min-w-0"
            title="Mention someone"
          >
            <AtSign className="w-5 h-5 text-blue-500" />
          </ButtonType3>

          {/* Visibility selector */}
          <div ref={visRef} className="relative ml-1">
            <ButtonType3
              onClick={() => setShowVisibility((v) => !v)}
              disabled={submitting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border border-border-subtle hover:bg-surface-subtle transition-colors disabled:opacity-50"
            >
              {currentVisOption.icon}
              <span className="hidden sm:inline">{currentVisOption.label}</span>
              <ChevronDown className="w-3 h-3" />
            </ButtonType3>
            {showVisibility && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-surface-default border border-border-subtle rounded-lg shadow-lg z-50 overflow-hidden">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <ButtonType3
                    key={opt.value}
                    onClick={() => {
                      setVisibility(opt.value);
                      setShowVisibility(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-surface-subtle rounded-none border-0 bg-transparent ${
                      visibility === opt.value ? 'text-text-brand font-medium' : 'text-text-primary'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </ButtonType3>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Post button */}
        <ButtonType2
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>{submitting ? 'Posting…' : 'Post'}</span>
        </ButtonType2>
      </div>
    </div>
  );
}
