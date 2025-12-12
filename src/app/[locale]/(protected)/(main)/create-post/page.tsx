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

  const t = useTranslations('actions');
  const userName = 'John Doe';
  const charLimit = 3000;
  const charCount = postContent.length;

  const handleAddAttachment = (type: AttachmentType) => {
    const newAttachment: Attachment = {
      id: `${type}-${Date.now()}`,
      type
    };
    setAttachments([...attachments, newAttachment]);
    toast.success(`${type} added`);
  };

  const handleRemoveAttachment = (id: string) => {
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
      <div className="max-w-3xl mx-auto">
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
              <div className="flex flex-wrap gap-2 mt-6">
                {attachments.map((attachment) => {
                  const { Icon, color, bg } = getAttachmentIcon(attachment.type);
                  return (
                    <div
                      key={attachment.id}
                      className="group relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-surface-subtle to-surface-subtle/50 rounded-xl border border-border-subtle"
                    >
                      <div className={`p-1.5 rounded-lg ${bg}`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <span className="body-small">{attachment.type}</span>
                      <button
                        onClick={() => handleRemoveAttachment(attachment.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-surface-default/80 hover:bg-text-danger hover:text-text-white border border-border-subtle flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
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
                {/* Primary attachment buttons */}
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

                {/* Secondary actions - hidden on mobile */}
                <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-border-subtle">
                  <button className="p-2 hover:bg-surface-subtle rounded-lg transition-colors" title="Add Emoji">
                    <Smile className="w-5 h-5 text-text-secondary" />
                  </button>
                  <button className="p-2 hover:bg-surface-subtle rounded-lg transition-colors" title="Add Hashtag">
                    <Hash className="w-5 h-5 text-text-secondary" />
                  </button>
                  <button className="p-2 hover:bg-surface-subtle rounded-lg transition-colors" title="Mention Someone">
                    <AtSign className="w-5 h-5 text-text-secondary" />
                  </button>
                  <button className="p-2 hover:bg-surface-subtle rounded-lg transition-colors" title="Add Location">
                    <MapPin className="w-5 h-5 text-text-secondary" />
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

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <button
            onClick={() => handleAddAttachment('Photo')}
            className="flex items-center gap-3 p-4 bg-surface-default/60 backdrop-blur-md border border-border-subtle hover:border-surface-brand/30 rounded-xl transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-brand/10 flex items-center justify-center group-hover:bg-surface-brand/20 transition-colors">
              <ImageIcon className="w-5 h-5 text-surface-brand" />
            </div>
            <span className="caption-large font-medium">Photo Gallery</span>
          </button>

          <button
            onClick={() => handleAddAttachment('Video')}
            className="flex items-center gap-3 p-4 bg-surface-default/60 backdrop-blur-md border border-border-subtle hover:border-text-danger/30 rounded-xl transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-text-danger/10 flex items-center justify-center group-hover:bg-text-danger/20 transition-colors">
              <Video className="w-5 h-5 text-text-danger" />
            </div>
            <span className="caption-large font-medium">Go Live</span>
          </button>

          <button className="flex items-center gap-3 p-4 bg-surface-default/60 backdrop-blur-md border border-border-subtle hover:border-[#cb3500]/30 rounded-xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#cb3500]/10 flex items-center justify-center group-hover:bg-[#cb3500]/20 transition-colors">
              <Smile className="w-5 h-5 text-[#cb3500]" />
            </div>
            <span className="caption-large font-medium">Feeling</span>
          </button>

          <button className="flex items-center gap-3 p-4 bg-surface-default/60 backdrop-blur-md border border-border-subtle hover:border-[#00a73e]/30 rounded-xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#00a73e]/10 flex items-center justify-center group-hover:bg-[#00a73e]/20 transition-colors">
              <MapPin className="w-5 h-5 text-[#00a73e]" />
            </div>
            <span className="caption-large font-medium">Check In</span>
          </button>
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
    </div>
  );
}
