/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Video,
  FileText,
  Smile,
  Hash,
  AtSign,
  MapPin,
  Globe,
  Users,
  Lock,
  Plus,
  X,
  ChevronDown,
  Paperclip,
  Camera,
  FolderOpen,
  RotateCcw,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ButtonType2, ButtonType3, ButtonType4Pill } from '@/components/custom/button';
import { toast } from 'sonner';
import { useUserStore } from '@/store/useUserStore';
import { MyAvatar } from '@/components/custom/header';
import { useMutation } from '@apollo/client/react';
import { CREATE_POST, CreatePostData, GET_FEED, REQUEST_UPLOAD_URL, RequestUploadUrlData } from '@/services/gql/postsFeed';
import { useRouter } from 'next/navigation';
import RichTextarea, { type RichTextareaHandle, type MentionedUser } from '@/components/custom/RichTextarea';
import { AttachmentInput } from '@/services/gql/types/postsFeed';
import { usePostDraft } from '@/hooks/usePostDraft';
import { buildMentionInputsFromText } from '@/components/custom/richTextRenderer';
import { LinkPreviewCard } from '@/components/chats/LinkPreviewCard';
import { getFirstUrlInText } from '@/lib/urlPreview';

// Types
type Visibility = 'PUBLIC' | 'PRIVATE' | 'CONNECTIONS';
type AttachmentType = 'Photo' | 'Video' | 'Document';

interface Attachment {
  id: string;
  type: AttachmentType;
  name?: string;
  file?: File;
  preview?: string;
}

// Dropdown Menu Component
const VisibilityDropdown: React.FC<{
  value: Visibility;
  onChange: (value: Visibility) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('createPost.visibility');

  const options = [
    {
      key: 'PUBLIC' as Visibility,
      label: t('public'),
      description: t('publicDescription'),
      icon: Globe
    },
    {
      key: 'CONNECTIONS' as Visibility,
      label: t('connections'),
      description: t('connectionsDescription'),
      icon: Users
    },
    {
      key: 'PRIVATE' as Visibility,
      label: t('private'),
      description: t('privateDescription'),
      icon: Lock
    }
  ];

  const selected = options.find(opt => opt.key === value);
  const SelectedIcon = selected?.icon || Globe;

  return (
    <div className="relative">
      <ButtonType3
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 h-8 border border-border-subtle bg-surface-subtle hover:bg-surface-hover rounded-lg text-sm"
      >
        <SelectedIcon className="w-3.5 h-3.5" />
        <span>{selected?.label}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </ButtonType3>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute left-0 top-full mt-2 w-64 bg-surface-default border border-border-subtle rounded-lg shadow-lg overflow-hidden z-50">
            {options.map((option) => {
              const Icon = option.icon;
              const isActive = option.key === value;

              return (
                <ButtonType3
                  key={option.key}
                  onClick={() => {
                    onChange(option.key);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-3 hover:bg-surface-hover rounded-lg border-0 ${isActive ? 'bg-surface-hover' : ''
                    }`}
                >
                  <Icon className="w-5 h-5 mt-0.5 text-text-secondary" />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{option.label}</span>
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-surface-brand"></div>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </ButtonType3>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// Main Component
export default function CreatePostPage() {
  const [postContent, setPostContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showMobileAttachMenu, setShowMobileAttachMenu] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<MentionedUser[]>([]);
  const [draftRestored, setDraftRestored] = useState(false);
  const [dismissedPreviewUrl, setDismissedPreviewUrl] = useState<string | null>(null);
  const textareaRef = React.useRef<RichTextareaHandle>(null);
  const submittingRef = React.useRef(false);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { saveDraft, loadDraft, clearDraft } = usePostDraft();

  const t = useTranslations('createPost');
  const tActions = useTranslations('actions');
  const router = useRouter();
  const currentUser = useUserStore(state => state.user);
  const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'User';

  const charLimit = 5000; // Backend max; send raw text with \n preserved
  const charCount = postContent.length;

  // Create Post Mutation
  const [createPost, { loading: isPosting }] = useMutation<CreatePostData>(CREATE_POST, {
    refetchQueries: [
      {
        query: GET_FEED,
        variables: {
          input: {
            type: 'FOR_YOU',
            limit: 20,
            offset: 0,
            includeDiscovery: true,
          },
        },
      }
    ]
  });

  // Request Upload URL Mutation
  const [requestUploadUrl] = useMutation<RequestUploadUrlData>(REQUEST_UPLOAD_URL);

  // Cleanup object URLs on unmount
  React.useEffect(() => {
    return () => {
      attachments.forEach(attachment => {
        if (attachment.preview) {
          URL.revokeObjectURL(attachment.preview);
        }
      });
    };
  }, [attachments]);

  // Restore draft on mount
  React.useEffect(() => {
    loadDraft().then(draft => {
      if (!draft) return;
      if (draft.text) setPostContent(draft.text);
      if (draft.visibility) setVisibility(draft.visibility as Visibility);
      if (draft.attachments.length > 0) {
        const restored: Attachment[] = draft.attachments.map(a => ({
          id: a.id,
          type: a.type,
          name: a.name,
          file: a.file,
          preview: (a.file.type.startsWith('image/') || a.file.type.startsWith('video/'))
            ? URL.createObjectURL(a.file)
            : undefined,
        }));
        setAttachments(restored);
      }
      setDraftRestored(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft with debounce
  React.useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDraft(postContent, visibility, attachments);
    }, 600);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [postContent, visibility, attachments, saveDraft]);

  // Function to insert text at cursor position
  const insertAtCursor = (textToInsert: string) => {
    if (textareaRef.current) {
      textareaRef.current.insertAtCursor(textToInsert);
    } else {
      setPostContent(prev => prev + textToInsert);
    }
  };

  const handleAddEmoji = () => {
    const emojis = ['😊', '❤️', '👍', '🎉', '🔥', '✨', '💯', '🚀'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    insertAtCursor(randomEmoji);
    toast.success(t('actions.emojiAdded'));
  };

  const handleAddHashtag = () => {
    const needsSpace = postContent.length > 0 && !postContent.endsWith(' ') && !postContent.endsWith('\n');
    insertAtCursor((needsSpace ? ' ' : '') + '#');
    textareaRef.current?.focus();
  };

  const handleAddMention = () => {
    const needsSpace = postContent.length > 0 && !postContent.endsWith(' ') && !postContent.endsWith('\n');
    insertAtCursor((needsSpace ? ' ' : '') + '@');
    textareaRef.current?.focus();
  };

  const handleAddLocation = () => {
    const sampleLocations = [
      'New York, NY',
      'Los Angeles, CA',
      'San Francisco, CA',
      'London, UK',
      'Tokyo, Japan'
    ];
    const location = sampleLocations[Math.floor(Math.random() * sampleLocations.length)];
    insertAtCursor(`📍 ${location}`);
    toast.success(t('actions.locationAdded'));
  };

  const handleAddAttachment = (type: AttachmentType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;

    switch (type) {
      case 'Photo':
        input.accept = 'image/*';
        break;
      case 'Video':
        input.accept = 'video/*';
        break;
      case 'Document':
        input.accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx';
        break;
    }

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      Array.from(files).forEach(file => {
        const preview = (file.type.startsWith('image/') || file.type.startsWith('video/'))
          ? URL.createObjectURL(file)
          : undefined;

        const newAttachment: Attachment = {
          id: `${type}-${Date.now()}-${Math.random()}`,
          type,
          name: file.name,
          file,
          preview
        };
        setAttachments(prev => [...prev, newAttachment]);
      });

      toast.success(t('attachments.filesAdded', { count: files.length }));
    };

    input.click();
  };

  const handleMobileGallery = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = true;

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      Array.from(files).forEach(file => {
        const isVideo = file.type.startsWith('video/');
        const preview = URL.createObjectURL(file);

        const newAttachment: Attachment = {
          id: `${isVideo ? 'Video' : 'Photo'}-${Date.now()}-${Math.random()}`,
          type: isVideo ? 'Video' : 'Photo',
          name: file.name,
          file,
          preview
        };
        setAttachments(prev => [...prev, newAttachment]);
      });

      toast.success(t('attachments.filesAddedFromGallery', { count: files.length }));
      setShowMobileAttachMenu(false);
    };

    input.click();
  };

  const handleMobileCamera = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.capture = 'environment';

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const isVideo = file.type.startsWith('video/');
      const preview = URL.createObjectURL(file);

      const newAttachment: Attachment = {
        id: `${isVideo ? 'Video' : 'Photo'}-${Date.now()}-${Math.random()}`,
        type: isVideo ? 'Video' : 'Photo',
        name: file.name,
        file,
        preview
      };
      setAttachments(prev => [...prev, newAttachment]);

      toast.success(isVideo ? t('attachments.videoCaptured') : t('attachments.photoCaptured'));
      setShowMobileAttachMenu(false);
    };

    input.click();
  };

  const handleMobileDocument = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      Array.from(files).forEach(file => {
        let type: AttachmentType = 'Document';
        if (file.type.startsWith('image/')) {
          type = 'Photo';
        } else if (file.type.startsWith('video/')) {
          type = 'Video';
        }

        const preview = (file.type.startsWith('image/') || file.type.startsWith('video/'))
          ? URL.createObjectURL(file)
          : undefined;

        const newAttachment: Attachment = {
          id: `${type}-${Date.now()}-${Math.random()}`,
          type,
          name: file.name,
          file,
          preview
        };
        setAttachments(prev => [...prev, newAttachment]);
      });

      toast.success(t('attachments.filesAdded', { count: files.length }));
      setShowMobileAttachMenu(false);
    };

    input.click();
  };

  const handleDiscardDraft = async () => {
    attachments.forEach(a => { if (a.preview) URL.revokeObjectURL(a.preview); });
    await clearDraft();
    setPostContent('');
    setAttachments([]);
    setVisibility('PUBLIC');
    setMentionedUsers([]);
    setDraftRestored(false);
  };

  const handleRemoveAttachment = (id: string) => {
    const attachment = attachments.find(a => a.id === id);
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const handlePost = async () => {
    if (submittingRef.current) return;
    if (!postContent.trim() && attachments.length === 0) {
      toast.error(t('emptyError'));
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      let attachmentInputs: AttachmentInput[] = [];

      // Upload attachments if any
      if (attachments.length > 0) {
        const uploadPromises = attachments.map(async (attachment) => {
          if (!attachment.file) return null;

          // Request upload URL (backend returns uploadUrl + objectKey for the GCS path)
          const { data: uploadData } = await requestUploadUrl({
            variables: {
              fileName: attachment.file.name,
              fileType: attachment.file.type,
              contentType: attachment.file.type,
              vendorId: 'default'
            }
          });

          const uploadResult = uploadData?.requestUploadUrl;
          if (!uploadResult?.uploadUrl) {
            throw new Error('Failed to get upload URL');
          }

          // Upload file to GCS via signed URL
          const uploadResponse = await fetch(uploadResult.uploadUrl, {
            method: 'PUT',
            body: attachment.file,
            headers: {
              'Content-Type': attachment.file.type
            }
          });

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload file');
          }

          // Use backend's objectKey so it can store and return the correct GCS URL in the feed
          const objectKey = uploadResult.objectKey ?? `uploads/${Date.now()}-${attachment.file.name}`;

          return {
            objectKey,
            type: attachment.file.type.startsWith('image/') ? 'IMAGE' : 
                  attachment.file.type.startsWith('video/') ? 'VIDEO' : 'DOCUMENT',
            mimeType: attachment.file.type,
            size: attachment.file.size
          };
        });

        const uploadResults = await Promise.all(uploadPromises);
        attachmentInputs = uploadResults.filter(Boolean) as AttachmentInput[];
      }

      const visibilityMap: Record<Visibility, string> = {
        PUBLIC: 'EVERYONE',
        CONNECTIONS: 'FRIENDS',
        PRIVATE: 'ONLY_ME',
      };

      const { data } = await createPost({
        variables: {
          input: {
            text: postContent,
            visibility: visibilityMap[visibility],
            idempotencyKey: crypto.randomUUID(),
            ...(attachmentInputs.length > 0 && { attachments: attachmentInputs }),
            ...(mentionedUsers.length > 0 && {
              mentionedUserIds: mentionedUsers.map((m) => m.userId),
            }),
            ...(mentionedUsers.length > 0 && (() => {
              const mentionMap = Object.fromEntries(mentionedUsers.map((m) => [m.name, m.userId]));
              const mentions = buildMentionInputsFromText(postContent, mentionMap).map((mi) => ({
                ...mi,
                displayName: mentionedUsers.find((u) => u.userId === mi.entityId)?.displayName ?? mi.displayName,
              }));
              return mentions.length > 0 ? { mentions } : {};
            })()),
          }
        }
      });

      if (data?.createPost) {
        toast.success(t('successMessage'));

        // Hand the just-created post id to the home feed via sessionStorage.
        // useFeed reads + clears this on mount, fetches the post, and
        // prepends it so the user sees their post at the top immediately —
        // before the Kafka projection has had time to land in the
        // recommendation index. Best-effort; failures are harmless (the
        // post will still appear in the feed naturally on the next refresh
        // once recommendation-service catches up, usually within seconds).
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('justCreatedPostId', data.createPost.id);
          }
        } catch {
          /* sessionStorage can throw in privacy modes — ignore */
        }

        // Clear draft and reset form
        await clearDraft();
        setPostContent('');
        setAttachments([]);
        setVisibility('PUBLIC');
        setMentionedUsers([]);
        setDraftRestored(false);

        // Redirect to home after short delay
        setTimeout(() => {
          router.push('/');
        }, 1000);
      }
    } catch (error: any) {
      console.error('Failed to create post:', error);
      toast.error(error?.message || t('errorMessage'));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const getAttachmentIcon = (type: AttachmentType) => {
    switch (type) {
      case 'Photo':
        return { Icon: ImageIcon, color: 'text-surface-brand', bg: 'bg-surface-brand/10' };
      case 'Video':
        return { Icon: Video, color: 'text-text-danger', bg: 'bg-surface-danger/10' };
      case 'Document':
        return { Icon: FileText, color: 'text-[#cb3500]', bg: 'bg-surface-warning/10' };
    }
  };

  const getCharCountColor = () => {
    if (charCount > 4500) return 'text-text-danger';
    if (charCount > 4000) return 'text-[#cb3500]';
    return 'text-surface-brand';
  };

  const getCharIndicatorColor = () => {
    if (charCount > 4500) return 'bg-text-danger';
    if (charCount > 4000) return 'bg-[#cb3500]';
    return 'bg-surface-brand';
  };

  return (
    <div className="lg:w-[60vw] h-app-inner overflow-y-auto scrollbar-hide py-4 flex justify-center mx-auto ">
      <div className="w-full max-w-3xl mb-2">
        {/* Draft restored banner */}
        {draftRestored && (
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 bg-surface-brand/10 border border-surface-brand/30 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-text-primary">
              <RotateCcw className="w-4 h-4 text-surface-brand flex-shrink-0" />
              <span>Draft restored — pick up where you left off.</span>
            </div>
            <button
              onClick={handleDiscardDraft}
              className="text-xs text-text-secondary hover:text-text-danger transition-colors flex-shrink-0"
            >
              Discard
            </button>
          </div>
        )}

        {/* Main Composer Card */}
        <div className="bg-surface-default/80 backdrop-blur-md rounded-2xl border border-border-subtle shadow-xl">
          {/* User Header */}
          <div className="p-6 pb-0">
            <div className="flex items-start justify-between mb-6">
              <div className="flex gap-4">
                <MyAvatar />
                <div className="flex flex-col gap-1">
                  <VisibilityDropdown value={visibility} onChange={setVisibility} />
                </div>
              </div>

              {/* Post Button */}
              <ButtonType2
                onClick={handlePost}
                disabled={isSubmitting || (!postContent.trim() && attachments.length === 0)}
                className="flex items-center gap-2 px-6 py-2 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-text-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('posting')}</span>
                  </>
                ) : (
                  <div className='px-2 py-1 flex items-center gap-1'>
                    <Plus className="w-4 h-4" strokeWidth={5} />
                    <span>{tActions('post')}</span>
                  </div>
                )}
              </ButtonType2>
            </div>
          </div>

          {/* Text Area */}
          <div className="px-6 py-6">
            <RichTextarea
              ref={textareaRef}
              value={postContent}
              onChange={setPostContent}
              onMentionsChange={setMentionedUsers}
              placeholder={t('placeholder', { name: userName.split(' ')[0] })}
              maxLength={charLimit}
              disabled={isPosting}
              className="body-large leading-relaxed placeholder:text-text-secondary text-text-primary"
              minHeight="200px"
            />
          </div>

          {/* Live link preview for the first URL in the post text (dismissible) */}
          {(() => {
            const previewUrl = getFirstUrlInText(postContent);
            if (!previewUrl || previewUrl === dismissedPreviewUrl) return null;
            return (
              <div className="px-6 pb-4">
                <div className="relative inline-block max-w-full">
                  <LinkPreviewCard url={previewUrl} />
                  <button
                    type="button"
                    onClick={() => setDismissedPreviewUrl(previewUrl)}
                    aria-label={t('attachments.removePreview')}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-surface-default/90 border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-default shadow-sm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="px-6 pb-6 pt-0 border-t border-border-subtle">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
                {attachments.map((attachment) => {
                  const { Icon, color, bg } = getAttachmentIcon(attachment.type);

                  return (
                    <div
                      key={attachment.id}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-surface-subtle border border-border-subtle"
                    >
                      {/* Preview Content */}
                      {attachment.type === 'Photo' && attachment.preview ? (
                        <Image
                          src={attachment.preview}
                          alt={attachment.name || 'Photo'}
                          fill
                          className="object-cover"
                        />
                      ) : attachment.type === 'Video' && attachment.preview ? (
                        <video
                          src={attachment.preview}
                          className="w-full h-full object-cover"
                          controls={false}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4">
                          <div className={`p-3 rounded-xl ${bg} mb-2`}>
                            <Icon className={`w-8 h-8 ${color}`} />
                          </div>
                          <p className="caption-small text-center text-text-secondary line-clamp-2">
                            {attachment.name}
                          </p>
                        </div>
                      )}

                      {/* Remove Button */}
                      <ButtonType4Pill
                        onClick={() => handleRemoveAttachment(attachment.id)}
                        className="absolute top-2 right-2 w-8 h-8 min-w-0 p-0 rounded-full hover:bg-text-danger/80 text-text-white flex items-center justify-center transition-all shadow-lg hover:scale-110 z-10"
                      >
                        <X className="w-4 h-4" />
                      </ButtonType4Pill>

                      {/* Type Badge */}
                      <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
                        <span className="caption-small text-text-white font-medium">
                          {attachment.type}
                        </span>
                      </div>

                      {/* Video Play Icon */}
                      {attachment.type === 'Video' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="px-6 py-4 bg-surface-subtle/30 border-t border-border-subtle rounded-b-2xl">
            <div className="flex items-center justify-between">
              {/* Left Actions */}
              <div className="flex items-center gap-2">
                {/* Mobile - Single Attachment Button */}
                <div className="md:hidden relative">
                  <ButtonType3
                    onClick={() => setShowMobileAttachMenu(!showMobileAttachMenu)}
                    className="p-2 hover:bg-surface-brand/10 rounded-lg border-0 bg-transparent min-w-0"
                    title={t('attachments.addAttachment')}
                  >
                    <div className="p-1.5 rounded-lg bg-surface-brand/10 group-hover:bg-surface-brand/20 transition-colors">
                      <Paperclip className="w-5 h-5 text-surface-brand" />
                    </div>
                  </ButtonType3>

                  {/* Mobile Attachment Menu */}
                  {showMobileAttachMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMobileAttachMenu(false)}
                      ></div>
                      <div className="absolute left-0 bottom-full mb-2 w-64 bg-surface-default border border-border-subtle rounded-xl shadow-xl overflow-hidden z-50 animate-slide-up">
                        <div className="p-2">
                          <ButtonType3
                            onClick={handleMobileCamera}
                            className="w-full flex items-center gap-3 p-3 hover:bg-surface-hover rounded-lg border-0 bg-transparent"
                          >
                            <div className="w-10 h-10 rounded-lg bg-surface-brand/10 flex items-center justify-center">
                              <Camera className="w-5 h-5 text-surface-brand" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-sm">{t('mobile.camera')}</p>
                              <p className="text-xs text-text-secondary">{t('mobile.cameraDescription')}</p>
                            </div>
                          </ButtonType3>

                          <ButtonType3
                            onClick={handleMobileGallery}
                            className="w-full flex items-center gap-3 p-3 hover:bg-surface-hover rounded-lg border-0 bg-transparent"
                          >
                            <div className="w-10 h-10 rounded-lg bg-text-danger/10 flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-text-danger" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-sm">{t('mobile.gallery')}</p>
                              <p className="text-xs text-text-secondary">{t('mobile.galleryDescription')}</p>
                            </div>
                          </ButtonType3>

                          <ButtonType3
                            onClick={handleMobileDocument}
                            className="w-full flex items-center gap-3 p-3 hover:bg-surface-hover rounded-lg border-0 bg-transparent"
                          >
                            <div className="w-10 h-10 rounded-lg bg-[#cb3500]/10 flex items-center justify-center">
                              <FolderOpen className="w-5 h-5 text-[#cb3500]" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-sm">{t('mobile.files')}</p>
                              <p className="text-xs text-text-secondary">{t('mobile.filesDescription')}</p>
                            </div>
                          </ButtonType3>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Desktop - Separate Buttons */}
                <div className="hidden md:flex items-center gap-2">
                  <ButtonType3
                    onClick={() => handleAddAttachment('Photo')}
                    className="p-2 hover:bg-surface-brand/10 rounded-lg border-0 bg-transparent min-w-0"
                    title={t('attachments.addPhoto')}
                  >
                    <div className="p-1.5 rounded-lg bg-surface-brand/10 group-hover:bg-surface-brand/20 transition-colors">
                      <ImageIcon className="w-5 h-5 text-surface-brand" />
                    </div>
                  </ButtonType3>
                  <ButtonType3
                    onClick={() => handleAddAttachment('Video')}
                    className="p-2 hover:bg-text-danger/10 rounded-lg border-0 bg-transparent min-w-0"
                    title={t('attachments.addVideo')}
                  >
                    <div className="p-1.5 rounded-lg bg-text-danger/10 group-hover:bg-text-danger/20 transition-colors">
                      <Video className="w-5 h-5 text-text-danger" />
                    </div>
                  </ButtonType3>
                  <ButtonType3
                    onClick={() => handleAddAttachment('Document')}
                    className="p-2 hover:bg-[#cb3500]/10 rounded-lg border-0 bg-transparent min-w-0"
                    title={t('attachments.addFile')}
                  >
                    <div className="p-1.5 rounded-lg bg-[#cb3500]/10 group-hover:bg-[#cb3500]/20 transition-colors">
                      <FileText className="w-5 h-5 text-[#cb3500]" />
                    </div>
                  </ButtonType3>
                </div>

                {/* Secondary actions - hidden on mobile */}
                <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-border-subtle">
                  <ButtonType3
                    onClick={handleAddEmoji}
                    className="p-2 hover:bg-[#FFD700]/10 rounded-lg border-0 bg-transparent min-w-0"
                    title={t('actions.addEmoji')}
                  >
                    <Smile className="w-5 h-5 text-[#FFD700] group-hover:scale-110 transition-transform" />
                  </ButtonType3>
                  <ButtonType3
                    onClick={handleAddHashtag}
                    className="p-2 hover:bg-surface-brand/10 rounded-lg border-0 bg-transparent min-w-0"
                    title={t('actions.addHashtag')}
                  >
                    <Hash className="w-5 h-5 text-surface-brand group-hover:scale-110 transition-transform" />
                  </ButtonType3>
                  <ButtonType3
                    onClick={handleAddMention}
                    className="p-2 hover:bg-[#9333EA]/10 rounded-lg border-0 bg-transparent min-w-0"
                    title={t('actions.addMention')}
                  >
                    <AtSign className="w-5 h-5 text-[#9333EA] group-hover:scale-110 transition-transform" />
                  </ButtonType3>
                  <ButtonType3
                    onClick={handleAddLocation}
                    className="p-2 hover:bg-[#00a73e]/10 rounded-lg border-0 bg-transparent min-w-0"
                    title={t('actions.addLocation')}
                  >
                    <MapPin className="w-5 h-5 text-[#00a73e] group-hover:scale-110 transition-transform" />
                  </ButtonType3>
                </div>
              </div>

              {/* Character Count */}
              <div className={`hidden md:flex items-center gap-2 caption-medium ${getCharCountColor()}`}>
                <div className={`w-2 h-2 rounded-full ${getCharIndicatorColor()}`}></div>
                <span>{charCount} / {charLimit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tips Section */}
        <div
          className="my-6 p-5 bg-gradient-to-r from-surface-brand/5 to-surface-brand/10 border border-surface-brand/20 rounded-xl"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-surface-brand to-surface-brand/80 flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 text-text-white" strokeWidth={5} />
            </div>
            <div>
              <h3 className="label-large mb-1">{t('proTips.title')}</h3>
              <p className="body-small text-text-secondary">
                {t('proTips.description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}