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
  Sparkles,
  X,
  ChevronDown,
  Paperclip,
  Camera,
  FolderOpen,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ButtonType2 } from '@/components/custom/button';
import { toast } from 'sonner';

// Types
type Visibility = 'public' | 'connections' | 'private';
type AttachmentType = 'Photo' | 'Video' | 'Document';

interface Attachment {
  id: string;
  type: AttachmentType;
  name?: string;
  file?: File;
  preview?: string;
}

// Avatar Component
const Avatar: React.FC<{ src?: string; alt: string; size?: number }> = ({ 
  src, 
  alt, 
  size = 56 
}) => {
  const initials = alt.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  return (
    <div className="relative">
      <div 
        className="rounded-full ring-4 ring-primary/20 shadow-lg overflow-hidden bg-surface-brand flex items-center justify-center text-text-white font-semibold"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {src ? (
          <Image src={src} alt={alt} width={size} height={size} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {/* Online indicator */}
      <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#00a73e] border-2 border-surface-default"></div>
    </div>
  );
};

// Dropdown Menu Component
const VisibilityDropdown: React.FC<{
  value: Visibility;
  onChange: (value: Visibility) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('actions');

  const options = [
    {
      key: 'public' as Visibility,
      label: t('anyone'),
      description: 'Visible to everyone',
      icon: Globe
    },
    {
      key: 'connections' as Visibility,
      label: t('connections'),
      description: 'Only your connections',
      icon: Users
    },
    {
      key: 'private' as Visibility,
      label: t('onlyMe'),
      description: 'Only visible to you',
      icon: Lock
    }
  ];

  const selected = options.find(opt => opt.key === value);
  const SelectedIcon = selected?.icon || Globe;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 h-8 border border-border-subtle bg-surface-subtle hover:bg-surface-hover rounded-lg text-sm transition-colors"
      >
        <SelectedIcon className="w-3.5 h-3.5" />
        <span>{selected?.label}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

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
                <button
                  key={option.key}
                  onClick={() => {
                    onChange(option.key);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-3 hover:bg-surface-hover transition-colors ${
                    isActive ? 'bg-surface-hover' : ''
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
                </button>
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
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [showMobileAttachMenu, setShowMobileAttachMenu] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const t = useTranslations('actions');
  const userName = 'John Doe';
  const charLimit = 3000;
  const charCount = postContent.length;

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

  // Function to insert text at cursor position
  const insertAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = 
      postContent.substring(0, start) + 
      textToInsert + 
      postContent.substring(end);
    
    setPostContent(newContent);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + textToInsert.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleAddEmoji = () => {
    // You can integrate an emoji picker library here
    const emojis = ['😊', '❤️', '👍', '🎉', '🔥', '✨', '💯', '🚀'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    insertAtCursor(randomEmoji);
    toast.success('Emoji added');
  };

  const handleAddHashtag = () => {
    insertAtCursor('#');
    toast.success('Add your hashtag', {
      description: 'Type your hashtag after the # symbol'
    });
  };

  const handleAddMention = () => {
    insertAtCursor('@');
    toast.success('Mention someone', {
      description: 'Type the name after the @ symbol'
    });
  };

  const handleAddLocation = () => {
    // You can integrate a location picker here
    const sampleLocations = [
      'New York, NY',
      'Los Angeles, CA',
      'San Francisco, CA',
      'London, UK',
      'Tokyo, Japan'
    ];
    const location = sampleLocations[Math.floor(Math.random() * sampleLocations.length)];
    insertAtCursor(`📍 ${location}`);
    toast.success('Location added');
  };

  const handleAddAttachment = (type: AttachmentType) => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    
    // Set accept attribute based on type
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
    
    // Handle file selection
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
      
      toast.success(`${files.length} ${type}(s) added`);
    };
    
    // Trigger file dialog
    input.click();
  };

  // Mobile-specific handlers
  const handleMobileGallery = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = true;
    // Remove capture attribute to go directly to gallery
    
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
      
      toast.success(`${files.length} file(s) added from gallery`);
      setShowMobileAttachMenu(false);
    };
    
    input.click();
  };

  const handleMobileCamera = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.capture = 'environment'; // Use back camera by default
    
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
      
      toast.success(`${isVideo ? 'Video' : 'Photo'} captured`);
      setShowMobileAttachMenu(false);
    };
    
    input.click();
  };

  const handleMobileDocument = () => {
    const input = document.createElement('input');
    input.type = 'file';
    // No accept attribute - opens file manager with all files
    input.multiple = true;
    
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      
      Array.from(files).forEach(file => {
        // Determine type based on file MIME type
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
      
      toast.success(`${files.length} file(s) added`);
      setShowMobileAttachMenu(false);
    };
    
    input.click();
  };

  const handleRemoveAttachment = (id: string) => {
    const attachment = attachments.find(a => a.id === id);
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const handlePost = async () => {
    if (!postContent.trim() && attachments.length === 0) {
      toast.error('Cannot post empty content');
      return;
    }

    setIsPosting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsPosting(false);
    toast.success('Post published successfully!');
    
    // Reset form
    setTimeout(() => {
      setPostContent('');
      setAttachments([]);
    }, 1000);
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
    if (charCount > 2500) return 'text-text-danger';
    if (charCount > 2000) return 'text-[#cb3500]';
    return 'text-surface-brand';
  };

  const getCharIndicatorColor = () => {
    if (charCount > 2500) return 'bg-text-danger';
    if (charCount > 2000) return 'bg-[#cb3500]';
    return 'bg-surface-brand';
  };

  return (
    <div className="lg:w-[60vw] h-app-inner overflow-y-auto scrollbar-hide p-4">
      <div className="w-full max-w-3xl mx-auto">
        {/* Main Composer Card */}
        <div className="bg-surface-default/80 backdrop-blur-md rounded-2xl border border-border-subtle shadow-xl">
          {/* User Header */}
          <div className="p-6 pb-0">
            <div className="flex items-start justify-between mb-6">
              <div className="flex gap-4">
                <Avatar
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=John"
                  alt={userName}
                  size={56}
                />
                <div className="flex flex-col gap-1">
                  <h2 className="heading-small text-text-primary">{userName}</h2>
                  <VisibilityDropdown value={visibility} onChange={setVisibility} />
                </div>
              </div>

              {/* Post Button */}
              <ButtonType2
                onClick={handlePost}
                disabled={isPosting || (!postContent.trim() && attachments.length === 0)}
                className="flex items-center gap-2 px-6 py-2 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:hover:scale-100"
              >
                {isPosting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-text-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t('post')}</span>
                  </>
                )}
              </ButtonType2>
            </div>
          </div>

          {/* Text Area */}
          <div className="px-6 py-6">
            <textarea
              ref={textareaRef}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder={`What's on your mind, ${userName.split(' ')[0]}?`}
              className="w-full min-h-[200px] body-large leading-relaxed bg-transparent border-none outline-none resize-none placeholder:text-text-secondary text-text-primary"
              maxLength={charLimit}
            />
          </div>

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

                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => handleRemoveAttachment(attachment.id)}
                          className="w-10 h-10 rounded-full bg-text-danger hover:bg-text-danger/80 text-text-white flex items-center justify-center transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

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
                  <button
                    onClick={() => setShowMobileAttachMenu(!showMobileAttachMenu)}
                    className="p-2 hover:bg-surface-brand/10 rounded-lg transition-colors group"
                    title="Add Attachment"
                  >
                    <div className="p-1.5 rounded-lg bg-surface-brand/10 group-hover:bg-surface-brand/20 transition-colors">
                      <Paperclip className="w-5 h-5 text-surface-brand" />
                    </div>
                  </button>

                  {/* Mobile Attachment Menu */}
                  {showMobileAttachMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowMobileAttachMenu(false)}
                      ></div>
                      <div className="absolute left-0 bottom-full mb-2 w-64 bg-surface-default border border-border-subtle rounded-xl shadow-xl overflow-hidden z-50 animate-slide-up">
                        <div className="p-2">
                          <button
                            onClick={handleMobileCamera}
                            className="w-full flex items-center gap-3 p-3 hover:bg-surface-hover rounded-lg transition-colors"
                          >
                            <div className="w-10 h-10 rounded-lg bg-surface-brand/10 flex items-center justify-center">
                              <Camera className="w-5 h-5 text-surface-brand" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-sm">Camera</p>
                              <p className="text-xs text-text-secondary">Take photo or video</p>
                            </div>
                          </button>

                          <button
                            onClick={handleMobileGallery}
                            className="w-full flex items-center gap-3 p-3 hover:bg-surface-hover rounded-lg transition-colors"
                          >
                            <div className="w-10 h-10 rounded-lg bg-text-danger/10 flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-text-danger" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-sm">Gallery</p>
                              <p className="text-xs text-text-secondary">Choose from gallery</p>
                            </div>
                          </button>

                          <button
                            onClick={handleMobileDocument}
                            className="w-full flex items-center gap-3 p-3 hover:bg-surface-hover rounded-lg transition-colors"
                          >
                            <div className="w-10 h-10 rounded-lg bg-[#cb3500]/10 flex items-center justify-center">
                              <FolderOpen className="w-5 h-5 text-[#cb3500]" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-sm">Files</p>
                              <p className="text-xs text-text-secondary">Choose document</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Desktop - Separate Buttons */}
                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={() => handleAddAttachment('Photo')}
                    className="p-2 hover:bg-surface-brand/10 rounded-lg transition-colors group"
                    title="Add Photo"
                  >
                    <div className="p-1.5 rounded-lg bg-surface-brand/10 group-hover:bg-surface-brand/20 transition-colors">
                      <ImageIcon className="w-5 h-5 text-surface-brand" />
                    </div>
                  </button>
                  <button
                    onClick={() => handleAddAttachment('Video')}
                    className="p-2 hover:bg-text-danger/10 rounded-lg transition-colors group"
                    title="Add Video"
                  >
                    <div className="p-1.5 rounded-lg bg-text-danger/10 group-hover:bg-text-danger/20 transition-colors">
                      <Video className="w-5 h-5 text-text-danger" />
                    </div>
                  </button>
                  <button
                    onClick={() => handleAddAttachment('Document')}
                    className="p-2 hover:bg-[#cb3500]/10 rounded-lg transition-colors group"
                    title="Add File"
                  >
                    <div className="p-1.5 rounded-lg bg-[#cb3500]/10 group-hover:bg-[#cb3500]/20 transition-colors">
                      <FileText className="w-5 h-5 text-[#cb3500]" />
                    </div>
                  </button>
                </div>

                {/* Secondary actions - hidden on mobile */}
                <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-border-subtle">
                  <button 
                    onClick={handleAddEmoji}
                    className="p-2 hover:bg-[#FFD700]/10 rounded-lg transition-colors group" 
                    title="Add Emoji"
                  >
                    <Smile className="w-5 h-5 text-[#FFD700] group-hover:scale-110 transition-transform" />
                  </button>
                  <button 
                    onClick={handleAddHashtag}
                    className="p-2 hover:bg-surface-brand/10 rounded-lg transition-colors group" 
                    title="Add Hashtag"
                  >
                    <Hash className="w-5 h-5 text-surface-brand group-hover:scale-110 transition-transform" />
                  </button>
                  <button 
                    onClick={handleAddMention}
                    className="p-2 hover:bg-[#9333EA]/10 rounded-lg transition-colors group" 
                    title="Mention Someone"
                  >
                    <AtSign className="w-5 h-5 text-[#9333EA] group-hover:scale-110 transition-transform" />
                  </button>
                  <button 
                    onClick={handleAddLocation}
                    className="p-2 hover:bg-[#00a73e]/10 rounded-lg transition-colors group" 
                    title="Add Location"
                  >
                    <MapPin className="w-5 h-5 text-[#00a73e] group-hover:scale-110 transition-transform" />
                  </button>
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
          className="mt-6 p-5 bg-gradient-to-r from-surface-brand/5 to-surface-brand/10 border border-surface-brand/20 rounded-xl"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-surface-brand to-surface-brand/80 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-text-white" />
            </div>
            <div>
              <h3 className="label-large mb-1">Pro Tips</h3>
              <p className="body-small text-text-secondary">
                Add images or videos to get more engagement. Use hashtags to reach a wider audience. Tag people to notify them.
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
