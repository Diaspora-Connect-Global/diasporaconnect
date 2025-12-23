import { useContext, createContext } from 'react';
import { useTranslations } from 'next-intl';
import { useFriendActions } from '@/hooks/friends/useFriendActions';
import { ButtonType1, ButtonType2, ButtonType3 } from '@/components/custom/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DotsThree } from '@phosphor-icons/react';

// Context for loading state (shared with FriendListModal)
const FriendActionContext = createContext<{
  loadingUserId: string | null;
  setLoadingUserId: (userId: string | null) => void;
} | null>(null);

export type FriendButtonType = 
  | 'addFriend' 
  | 'message' 
  | 'accept' 
  | 'ignore' 
  | 'cancelRequest' 
  | 'dropdown';

interface DropdownOption {
  type: 'removeFriend' | 'blockFriend';
  separator?: boolean;
}

interface FriendActionButtonsProps {
  userId: string;
  buttonsToShow: FriendButtonType[];
  dropdownOptions?: DropdownOption[];
  connectionId: string;
  className?: string;
}

export const FriendActionButtons = ({
  userId,
  buttonsToShow,
  dropdownOptions = [],
  connectionId,
  className = "",
}: FriendActionButtonsProps) => {
  const t = useTranslations('friends');
  const friendActions = useFriendActions();

  // Try to access loading context (will be null if not in FriendListModal)
  let loadingContext = null;
  try {
    loadingContext = useContext(FriendActionContext);
  } catch {
    // Not in loading context, component works normally
  }

  // Helper to wrap actions with loading state
  const withLoading = async (actionFn: () => Promise<void>) => {
    if (loadingContext) loadingContext.setLoadingUserId(userId);
    try {
      await actionFn();
    } finally {
      if (loadingContext) {
        setTimeout(() => loadingContext.setLoadingUserId(null), 500);
      }
    }
  };

  // Action handlers
  const handleAddFriend = async () => {
    await withLoading(() => friendActions.addFriend(userId));
  };

  const handleAcceptFriend = async () => {
    await withLoading(() => friendActions.acceptRequest(connectionId));
  };

  const handleIgnoreFriend = async () => {
    await withLoading(() => friendActions.ignoreRequest(connectionId));
  };

  const handleCancelRequest = async () => {
    await withLoading(() => friendActions.cancelRequest(connectionId));
  };

  const handleRemoveFriend = async () => {
    await withLoading(() => friendActions.removeFriend(connectionId));
  };

  const handleBlockFriend = async () => {
    await withLoading(() => friendActions.blockFriend(userId));
  };

  const handleMessage = async () => {
    await friendActions.sendMessage(userId);
  };

  // Render button based on type
  const renderButton = (buttonType: FriendButtonType) => {
    switch (buttonType) {
      case 'addFriend':
        return (
          <ButtonType2
            key="addFriend"
            onClick={handleAddFriend}
            className="px-4 py-2 text-sm"
          >
            {t('addFriend')}
          </ButtonType2>
        );

      case 'message':
        return (
          <ButtonType1
            key="message"
            onClick={handleMessage}
            className="px-4 py-2 text-sm"
          >
            {t('message')}
          </ButtonType1>
        );

      case 'accept':
        return (
          <ButtonType2
            key="accept"
            onClick={handleAcceptFriend}
            className="px-4 py-2 text-sm"
          >
            {t('accept')}
          </ButtonType2>
        );

      case 'ignore':
        return (
          <ButtonType3
            key="ignore"
            onClick={handleIgnoreFriend}
            className="px-4 py-2 text-sm"
          >
            {t('ignore')}
          </ButtonType3>
        );

      case 'cancelRequest':
        return (
          <ButtonType3
            key="cancelRequest"
            onClick={handleCancelRequest}
            className="px-4 py-2 text-sm"
          >
            {t('cancelRequest')}
          </ButtonType3>
        );

      case 'dropdown':
        return (
          <DropdownMenu key="dropdown">
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-surface-hover rounded-full transition-colors">
                <DotsThree size={20} className="text-text-secondary" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {dropdownOptions.map((option, index) => (
                <div key={index}>
                  {option.separator && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={() => {
                      if (option.type === 'removeFriend') {
                        handleRemoveFriend();
                      } else if (option.type === 'blockFriend') {
                        handleBlockFriend();
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {option.type === 'removeFriend' 
                      ? t('removeFriend') 
                      : t('blockFriend')}
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {buttonsToShow.map((buttonType) => renderButton(buttonType))}
    </div>
  );
};
