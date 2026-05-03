// ============================================
// DIRECT MESSAGE CHAT - REDESIGNED UI
// ============================================
// File: components/chats/DirectMessageChat.tsx

import { Check, ChevronRight, Loader2, MoreVertical, Sun, X } from "lucide-react";
import { ArrowLeft } from "iconsax-reactjs";
import { useEffect, useRef, useState, useCallback } from "react";
import { MessageInput } from "./MessageInput";
import { MessageAttachments } from "./MessageAttachments";
import { LinkPreviewCard, isLinkOnlyContent } from "./LinkPreviewCard";
import { getFirstUrlInText } from "@/lib/urlPreview";
import { SendingFilesBubble } from "./SendingFilesBubble";
import { useChatStore, ApiMessage } from "@/store/ChatStore";
import { useTranslations } from 'next-intl';
import { ButtonType3 } from "../custom/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ChatInfo } from "@/app/[locale]/(protected)/(main)/chat/page";
import { useRouter } from "@/i18n/navigation";
import { useMutation, useQuery, useLazyQuery } from "@apollo/client/react";
import { CREATE_CONVERSATION, SEND_MESSAGE, GET_CONVERSATIONS, GET_MESSAGES, MARK_CONVERSATION_AS_READ } from "@/services/gql/messaging";
import { BLOCK_USER } from "@/services/gql/users";
import type { BlockUserResponse } from "@/services/gql/types/users";
import { GET_USER_PROFILE } from "@/services/gql/profile";
import type { GetProfileResponse } from "@/services/gql/profile";
import { GET_UPLOAD_URL, chatMediaContentType } from "@/services/gql/upload";
import { ConfirmationModal } from "@/components/custom/confirmationModal";
import type { GetUploadUrlResponse } from "@/services/gql/upload";
import type { Message, MessageMention, CreateConversationData, SendMessageData, GetConversationsData, GetMessagesData, MarkConversationAsReadData } from "@/services/gql/types/messaging";
import { GET_MY_CONNECTIONS } from "@/services/gql/connection";
import { useUserStore } from "@/store/useUserStore";
import { messageService } from "@/services/websocket/messageService";
import { toast } from "sonner";

// ---- Helpers ----

// Alpha-3 → Alpha-2 for the subset that Intl.DisplayNames doesn't accept directly
const ALPHA3_TO_ALPHA2: Record<string, string> = {
    AFG:'AF',AGO:'AO',ALB:'AL',AND:'AD',ARE:'AE',ARG:'AR',ARM:'AM',AUS:'AU',AUT:'AT',AZE:'AZ',
    BDI:'BI',BEL:'BE',BEN:'BJ',BFA:'BF',BGD:'BD',BGR:'BG',BHR:'BH',BHS:'BS',BIH:'BA',BLR:'BY',
    BLZ:'BZ',BOL:'BO',BRA:'BR',BRB:'BB',BRN:'BN',BTN:'BT',BWA:'BW',CAF:'CF',CAN:'CA',CHE:'CH',
    CHL:'CL',CHN:'CN',CIV:'CI',CMR:'CM',COD:'CD',COG:'CG',COL:'CO',COM:'KM',CPV:'CV',CRI:'CR',
    CUB:'CU',CYP:'CY',CZE:'CZ',DEU:'DE',DJI:'DJ',DNK:'DK',DOM:'DO',DZA:'DZ',ECU:'EC',EGY:'EG',
    ERI:'ER',ESP:'ES',EST:'EE',ETH:'ET',FIN:'FI',FJI:'FJ',FRA:'FR',FSM:'FM',GAB:'GA',GBR:'GB',
    GEO:'GE',GHA:'GH',GIN:'GN',GMB:'GM',GNB:'GW',GNQ:'GQ',GRC:'GR',GTM:'GT',GUY:'GY',HND:'HN',
    HRV:'HR',HTI:'HT',HUN:'HU',IDN:'ID',IND:'IN',IRL:'IE',IRN:'IR',IRQ:'IQ',ISL:'IS',ISR:'IL',
    ITA:'IT',JAM:'JM',JOR:'JO',JPN:'JP',KAZ:'KZ',KEN:'KE',KGZ:'KG',KHM:'KH',KIR:'KI',KOR:'KR',
    KWT:'KW',LAO:'LA',LBN:'LB',LBR:'LR',LBY:'LY',LCA:'LC',LIE:'LI',LKA:'LK',LSO:'LS',LTU:'LT',
    LUX:'LU',LVA:'LV',MAR:'MA',MDA:'MD',MDG:'MG',MDV:'MV',MEX:'MX',MKD:'MK',MLI:'ML',MLT:'MT',
    MMR:'MM',MNE:'ME',MNG:'MN',MOZ:'MZ',MRT:'MR',MUS:'MU',MWI:'MW',MYS:'MY',NAM:'NA',NER:'NE',
    NGA:'NG',NIC:'NI',NLD:'NL',NOR:'NO',NPL:'NP',NRU:'NR',NZL:'NZ',OMN:'OM',PAK:'PK',PAN:'PA',
    PER:'PE',PHL:'PH',PLW:'PW',PNG:'PG',POL:'PL',PRT:'PT',PRY:'PY',PSE:'PS',QAT:'QA',ROU:'RO',
    RUS:'RU',RWA:'RW',SAU:'SA',SDN:'SD',SEN:'SN',SGP:'SG',SLB:'SB',SLE:'SL',SLV:'SV',SMR:'SM',
    SOM:'SO',SRB:'RS',SSD:'SS',STP:'ST',SUR:'SR',SVK:'SK',SVN:'SI',SWE:'SE',SWZ:'SZ',SYC:'SC',
    SYR:'SY',TCD:'TD',TGO:'TG',THA:'TH',TJK:'TJ',TKM:'TM',TLS:'TL',TON:'TO',TTO:'TT',TUN:'TN',
    TUR:'TR',TUV:'TV',TZA:'TZ',UGA:'UG',UKR:'UA',URY:'UY',USA:'US',UZB:'UZ',VCT:'VC',VEN:'VE',
    VNM:'VN',VUT:'VU',WSM:'WS',YEM:'YE',ZAF:'ZA',ZMB:'ZM',ZWE:'ZW',
};

function resolveCountryName(code: string): string {
    if (!code) return '';
    const upper = code.trim().toUpperCase();
    // Convert alpha-3 to alpha-2 if needed
    const alpha2 = upper.length === 3 ? (ALPHA3_TO_ALPHA2[upper] ?? upper) : upper;
    try {
        const names = new Intl.DisplayNames(['en'], { type: 'region' });
        const name = names.of(alpha2);
        return name && name !== alpha2 ? name : code;
    } catch {
        return code;
    }
}

function getMessageDateKey(dateStr: string, timeZone: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { timeZone });
}

function getDateLabel(dateStr: string, timeZone: string): string {
    const date = new Date(dateStr);
    const todayKey = new Date().toLocaleDateString('en-US', { timeZone });
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = yesterdayDate.toLocaleDateString('en-US', { timeZone });
    const msgKey = getMessageDateKey(dateStr, timeZone);
    if (msgKey === todayKey) return 'Today';
    if (msgKey === yesterdayKey) return 'Yesterday';
    return date.toLocaleDateString('en-US', { timeZone, year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTimeOnly(dateStr: string, timeZone: string): string {
    return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone,
    });
}

function formatCurrentTime(timeZone: string): string {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone,
        timeZoneName: 'short',
    }).format(new Date());
}

// Country alpha-2 → representative IANA timezone
const COUNTRY_TIMEZONE: Record<string, string> = {
    // Africa
    GH:'Africa/Accra', NG:'Africa/Lagos', SN:'Africa/Dakar', CI:'Africa/Abidjan',
    CM:'Africa/Douala', BJ:'Africa/Porto-Novo', BF:'Africa/Ouagadougou', GN:'Africa/Conakry',
    TG:'Africa/Lome', ML:'Africa/Bamako', NE:'Africa/Niamey', MR:'Africa/Nouakchott',
    GM:'Africa/Banjul', SL:'Africa/Freetown', LR:'Africa/Monrovia', GW:'Africa/Bissau',
    CV:'Atlantic/Cape_Verde', ST:'Africa/Sao_Tome', GQ:'Africa/Malabo', GA:'Africa/Libreville',
    CG:'Africa/Brazzaville', CD:'Africa/Kinshasa', AO:'Africa/Luanda', ZM:'Africa/Lusaka',
    ZW:'Africa/Harare', BW:'Africa/Gaborone', NA:'Africa/Windhoek', MZ:'Africa/Maputo',
    TZ:'Africa/Dar_es_Salaam', KE:'Africa/Nairobi', UG:'Africa/Kampala', RW:'Africa/Kigali',
    BI:'Africa/Bujumbura', ET:'Africa/Addis_Ababa', ER:'Africa/Asmara', SO:'Africa/Mogadishu',
    DJ:'Africa/Djibouti', SD:'Africa/Khartoum', SS:'Africa/Juba', MW:'Africa/Blantyre',
    ZA:'Africa/Johannesburg', LS:'Africa/Maseru', SZ:'Africa/Mbabane', MG:'Indian/Antananarivo',
    MU:'Indian/Mauritius', SC:'Indian/Mahe', KM:'Indian/Comoro', EG:'Africa/Cairo',
    LY:'Africa/Tripoli', TN:'Africa/Tunis', DZ:'Africa/Algiers', MA:'Africa/Casablanca',
    // Europe
    GB:'Europe/London', IE:'Europe/Dublin', FR:'Europe/Paris', DE:'Europe/Berlin',
    IT:'Europe/Rome', ES:'Europe/Madrid', PT:'Europe/Lisbon', NL:'Europe/Amsterdam',
    BE:'Europe/Brussels', LU:'Europe/Luxembourg', CH:'Europe/Zurich', AT:'Europe/Vienna',
    PL:'Europe/Warsaw', CZ:'Europe/Prague', SK:'Europe/Bratislava', HU:'Europe/Budapest',
    RO:'Europe/Bucharest', BG:'Europe/Sofia', GR:'Europe/Athens', HR:'Europe/Zagreb',
    RS:'Europe/Belgrade', SI:'Europe/Ljubljana', BA:'Europe/Sarajevo', MK:'Europe/Skopje',
    AL:'Europe/Tirane', ME:'Europe/Podgorica', SE:'Europe/Stockholm', NO:'Europe/Oslo',
    DK:'Europe/Copenhagen', FI:'Europe/Helsinki', IS:'Atlantic/Reykjavik',
    EE:'Europe/Tallinn', LV:'Europe/Riga', LT:'Europe/Vilnius', BY:'Europe/Minsk',
    UA:'Europe/Kiev', MD:'Europe/Chisinau', RU:'Europe/Moscow', TR:'Europe/Istanbul',
    CY:'Asia/Nicosia', MT:'Europe/Malta',
    // Americas
    US:'America/New_York', CA:'America/Toronto', MX:'America/Mexico_City',
    BR:'America/Sao_Paulo', AR:'America/Argentina/Buenos_Aires', CL:'America/Santiago',
    CO:'America/Bogota', VE:'America/Caracas', PE:'America/Lima', EC:'America/Guayaquil',
    BO:'America/La_Paz', PY:'America/Asuncion', UY:'America/Montevideo', GY:'America/Guyana',
    SR:'America/Paramaribo', HT:'America/Port-au-Prince', DO:'America/Santo_Domingo',
    JM:'America/Jamaica', TT:'America/Port_of_Spain', BB:'America/Barbados',
    CU:'America/Havana', GT:'America/Guatemala', SV:'America/El_Salvador',
    HN:'America/Tegucigalpa', NI:'America/Managua', CR:'America/Costa_Rica',
    PA:'America/Panama',
    // Middle East
    AE:'Asia/Dubai', SA:'Asia/Riyadh', QA:'Asia/Qatar', KW:'Asia/Kuwait',
    BH:'Asia/Bahrain', OM:'Asia/Muscat', YE:'Asia/Aden', IQ:'Asia/Baghdad',
    IR:'Asia/Tehran', IL:'Asia/Jerusalem', JO:'Asia/Amman', LB:'Asia/Beirut',
    SY:'Asia/Damascus', PS:'Asia/Gaza',
    // Asia
    IN:'Asia/Kolkata', PK:'Asia/Karachi', BD:'Asia/Dhaka', LK:'Asia/Colombo',
    NP:'Asia/Kathmandu', BT:'Asia/Thimphu', MM:'Asia/Rangoon', TH:'Asia/Bangkok',
    VN:'Asia/Ho_Chi_Minh', KH:'Asia/Phnom_Penh', LA:'Asia/Vientiane', MY:'Asia/Kuala_Lumpur',
    SG:'Asia/Singapore', ID:'Asia/Jakarta', PH:'Asia/Manila', CN:'Asia/Shanghai',
    JP:'Asia/Tokyo', KR:'Asia/Seoul', MN:'Asia/Ulaanbaatar', KZ:'Asia/Almaty',
    UZ:'Asia/Tashkent', TM:'Asia/Ashgabat', TJ:'Asia/Dushanbe', KG:'Asia/Bishkek',
    AF:'Asia/Kabul', // Oceania
    AU:'Australia/Sydney', NZ:'Pacific/Auckland', PG:'Pacific/Port_Moresby',
    FJ:'Pacific/Fiji', WS:'Pacific/Apia',
};

function getCountryTimezone(countryCode: string): string | null {
    if (!countryCode) return null;
    const upper = countryCode.trim().toUpperCase();
    const alpha2 = upper.length === 3 ? (ALPHA3_TO_ALPHA2[upper] ?? upper) : upper;
    return COUNTRY_TIMEZONE[alpha2] ?? null;
}

function isGoodTimeToMessage(timezone: string): boolean {
    try {
        const hourStr = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric', hour12: false, timeZone: timezone,
        }).format(new Date());
        const hour = parseInt(hourStr, 10);
        return hour >= 8 && hour < 21;
    } catch {
        return false;
    }
}

// ---- Date Separator ----

function DateSeparator({ label }: { label: string }) {
    return (
        <div className="flex items-center justify-center my-3">
            <span className="text-xs text-text-secondary bg-surface-hover px-3 py-1 rounded-full">
                {label}
            </span>
        </div>
    );
}

// ---- Main Component ----

export default function DirectMessageChat({ chat, onBack }: { chat: ChatInfo; onBack?: () => void }) {
    const router = useRouter();
    const t = useTranslations('chat.direct');
    const tCommon = useTranslations('common');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pendingRevokeRef = useRef<Record<string, string[]>>({});
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [blockModalOpen, setBlockModalOpen] = useState(false);
    const [deleteConversationModalOpen, setDeleteConversationModalOpen] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);
    const [isOnline, setIsOnline] = useState(chat.online ?? false);

    const { addApiMessage, removeApiMessage, getApiMessagesByConversation, getRealConversation, setRealConversation, setApiMessages, clearApiMessages } = useChatStore();

    const user = useUserStore((state) => state.user);
    const currentUserId = user?.userId;
    const userTimeZone = user?.timezone || user?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const apiMessages = getApiMessagesByConversation(conversationId || '');

    const [createConversation] = useMutation<CreateConversationData>(CREATE_CONVERSATION);
    const [sendMessageMutation] = useMutation<SendMessageData>(SEND_MESSAGE, {
        refetchQueries: [{ query: GET_CONVERSATIONS, variables: { limit: 100, offset: 0 } }],
    });
    const [getUploadUrl] = useLazyQuery<GetUploadUrlResponse>(GET_UPLOAD_URL);
    const [markConversationAsRead] = useMutation<MarkConversationAsReadData>(MARK_CONVERSATION_AS_READ, {
        refetchQueries: [{ query: GET_CONVERSATIONS, variables: { limit: 100, offset: 0 } }],
    });
    const [blockUserMutation] = useMutation<BlockUserResponse>(BLOCK_USER, {
        refetchQueries: [{ query: GET_CONVERSATIONS, variables: { limit: 100, offset: 0 } }],
    });

    const { data: conversationsData } = useQuery<GetConversationsData>(GET_CONVERSATIONS, {
        variables: { limit: 100, offset: 0 },
    });

    const { data: connectionsData } = useQuery<{ getConnections?: { connections?: Array<{
        requester: { userId: string; firstName?: string; lastName?: string; avatarUrl?: string };
        receiver: { userId: string; firstName?: string; lastName?: string; avatarUrl?: string };
    }> } }>(GET_MY_CONNECTIONS, { variables: { limit: 200, offset: 0 }, skip: !chat.id });

    const otherUser = connectionsData?.getConnections?.connections?.find(
        (c: { requester: { userId: string }; receiver: { userId: string } }) =>
            c.requester.userId === chat.id || c.receiver.userId === chat.id
    );
    const { data: otherUserProfileData } = useQuery<GetProfileResponse>(GET_USER_PROFILE, {
        variables: { userId: chat.id },
        skip: !chat.id,
        fetchPolicy: 'cache-first',
    });

    const otherProfile = otherUser
        ? (otherUser.requester.userId === chat.id ? otherUser.requester : otherUser.receiver)
        : null;
    const profileFallback = otherUserProfileData?.getProfile?.profile;

    const displayName = otherProfile
        ? [otherProfile.firstName, otherProfile.lastName].filter(Boolean).join(' ').trim() || chat.name || t('unknownUser')
        : (
            [profileFallback?.firstName, profileFallback?.lastName].filter(Boolean).join(' ').trim() ||
            (chat.name && chat.name !== chat.id ? chat.name : t('unknownUser'))
        );
    const otherAvatar = otherProfile?.avatarUrl ?? profileFallback?.avatarUrl ?? chat.avatar ?? '';

    // Location: prefer free-text `location`, then resolve country codes to full names
    const otherLocation = profileFallback?.location ||
        (profileFallback?.residenceCountry ? resolveCountryName(profileFallback.residenceCountry) : '') ||
        (profileFallback?.countryOfOrigin ? resolveCountryName(profileFallback.countryOfOrigin) : '') ||
        '';

    // Derive timezone from their residence or origin country
    const otherCountryCode = profileFallback?.residenceCountry || profileFallback?.countryOfOrigin || '';
    const otherTimezone = getCountryTimezone(otherCountryCode);
    const goodTimeToMessage = otherTimezone ? isGoodTimeToMessage(otherTimezone) : false;
    const otherLocalTime = otherTimezone ? formatCurrentTime(otherTimezone) : null;

    // Initialize or retrieve conversation
    useEffect(() => {
        if (!chat.id || !currentUserId) return;

        const existing = getRealConversation(chat.id);
        if (existing) {
            setConversationId(existing.conversationId);
            return;
        }

        if (conversationsData?.getConversations) {
            const isDirectConv = (conv: { type?: string; groupId?: string | null; participantIds?: string[] }) =>
                (conv.type === 'DIRECT' || conv.type === 'direct') ||
                ((conv.type === 'GROUP' || conv.type === 'group') && (conv.groupId == null || conv.groupId === '') && (conv.participantIds?.length === 2));
            const existingConv = conversationsData.getConversations.find(
                (conv) => isDirectConv(conv) && conv.participantIds?.includes(chat.id)
            );
            if (existingConv) {
                setConversationId(existingConv.id);
                setRealConversation(chat.id, {
                    conversationId: existingConv.id,
                    type: 'DIRECT',
                    participantIds: existingConv.participantIds || [currentUserId, chat.id],
                });
                return;
            }
        }

        const initConversation = async () => {
            try {
                const { data } = await createConversation({
                    variables: { type: 'DIRECT', participantIds: [chat.id] },
                });
                if (data?.createConversation) {
                    const convId = data.createConversation;
                    setConversationId(convId);
                    setRealConversation(chat.id, {
                        conversationId: convId,
                        type: 'DIRECT',
                        participantIds: [currentUserId, chat.id],
                    });
                }
            } catch (error: unknown) {
                const err = error as { graphQLErrors?: Array<{ message?: string }> };
                const isDuplicate = err?.graphQLErrors?.some(
                    (e: { message?: string }) => e.message?.includes('duplicate key')
                );
                if (!isDuplicate) {
                    console.error('Failed to create conversation:', error);
                }
            }
        };

        initConversation();
    }, [chat.id, currentUserId, conversationsData, getRealConversation, setRealConversation, createConversation]);

    const { data: messagesData, refetch: refetchMessages } = useQuery<GetMessagesData>(GET_MESSAGES, {
        variables: { conversationId: conversationId || '', limit: 50, offset: 0 },
        skip: !conversationId,
        fetchPolicy: 'network-only',
    });

    useEffect(() => {
        const messages = messagesData?.getMessages?.messages;
        if (!messages?.length || !conversationId) return;
        const firstConvId = messages[0]?.conversationId;
        if (firstConvId && firstConvId !== conversationId) return;

        const history = messages.map((m: Message): ApiMessage => ({
            id: m.id,
            conversationId: m.conversationId,
            senderId: m.senderId,
            type: (m.type || 'TEXT').toUpperCase() as ApiMessage['type'],
            content: m.content || '',
            createdAt: m.createdAt,
            mentions: m.mentions?.map((mn: MessageMention) => mn.userId) || [],
            replyToId: m.replyToId,
            status: m.status ? (m.status.toLowerCase() as ApiMessage['status']) : 'sent',
            attachments: m.attachments ?? [],
        }));
        setApiMessages(conversationId, history);
    }, [messagesData, conversationId, setApiMessages]);

    useEffect(() => {
        if (conversationId) {
            markConversationAsRead({ variables: { conversationId } }).catch((err) => {
                console.warn('markConversationAsRead failed:', err);
            });
        }
    }, [conversationId, markConversationAsRead]);

    useEffect(() => {
        if (!conversationId) return;
        const unsubMessage = messageService.onMessage((wsMessage) => {
            if (wsMessage.conversationId === conversationId) {
                refetchMessages();
            }
        });
        return () => { unsubMessage(); };
    }, [conversationId, refetchMessages]);

    useEffect(() => {
        if (!conversationId || !chat.id) return;
        const otherUserId = chat.id;
        let typingTimeout: ReturnType<typeof setTimeout> | null = null;

        const unsubStart = messageService.onTypingStart((data) => {
            if (data.conversationId !== conversationId || data.userId !== otherUserId) return;
            if (typingTimeout) clearTimeout(typingTimeout);
            setOtherUserTyping(true);
            typingTimeout = setTimeout(() => setOtherUserTyping(false), 5000);
        });
        const unsubStop = messageService.onTypingStop((data) => {
            if (data.conversationId !== conversationId || data.userId !== otherUserId) return;
            if (typingTimeout) clearTimeout(typingTimeout);
            typingTimeout = null;
            setOtherUserTyping(false);
        });

        return () => {
            if (typingTimeout) clearTimeout(typingTimeout);
            unsubStart();
            unsubStop();
        };
    }, [conversationId, chat.id]);

    // Track real-time presence for the other user
    useEffect(() => {
        if (!chat.id) return;
        const unsubPresence = messageService.onPresenceUpdate((data) => {
            if (data.userId === chat.id) setIsOnline(data.isOnline);
        });
        const unsubConnect = messageService.onConnect(() => {
            messageService.queryOnlineUsers([chat.id]);
        });
        if (messageService.isConnected) messageService.queryOnlineUsers([chat.id]);
        return () => { unsubPresence(); unsubConnect(); };
    }, [chat.id]);

    const handleTyping = useCallback((isTyping: boolean) => {
        if (!conversationId) return;
        if (isTyping) messageService.emitTypingStart(conversationId);
        else messageService.emitTypingStop(conversationId);
    }, [conversationId]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [apiMessages]);

    const handleSendMessage = useCallback(async (messageText: string, files?: File[]) => {
        const hasText = !!messageText.trim();
        const hasFiles = !!files?.length;
        if ((!hasText && !hasFiles) || !conversationId || !currentUserId) return;

        const idempotencyKey = crypto.randomUUID();
        setIsSending(true);
        const placeholderId = `pending-${Date.now()}-${idempotencyKey.slice(0, 8)}`;

        try {
            let content: string;
            let messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' = 'TEXT';
            let attachments: Array<{ publicUrl: string; mimeType: string }> = [];

            if (hasFiles && files) {
                const sendingPreviews: Array<{ url?: string; mimeType: string }> = [];
                const urlsToRevoke: string[] = [];
                const firstFileMime = files[0]?.type || '';
                const placeholderType: ApiMessage['type'] = firstFileMime.startsWith('video/')
                    ? 'VIDEO'
                    : firstFileMime.startsWith('audio/')
                        ? 'AUDIO'
                        : firstFileMime.startsWith('image/')
                            ? 'IMAGE'
                            : 'FILE';
                for (const file of files) {
                    const mime = file.type || 'application/octet-stream';
                    if (mime.startsWith('image/') || mime.startsWith('video/')) {
                        const url = URL.createObjectURL(file);
                        sendingPreviews.push({ url, mimeType: mime });
                        urlsToRevoke.push(url);
                    } else {
                        sendingPreviews.push({ mimeType: mime });
                    }
                }
                pendingRevokeRef.current[placeholderId] = urlsToRevoke;
                addApiMessage({
                    id: placeholderId,
                    conversationId,
                    senderId: currentUserId,
                    type: placeholderType,
                    content: messageText.trim(),
                    createdAt: new Date().toISOString(),
                    status: 'sending',
                    attachments: [],
                    sendingPreviews,
                });

                for (const file of files) {
                    const contentType = chatMediaContentType(file.type || 'application/octet-stream');
                    const { data: uploadData } = await getUploadUrl({
                        variables: { contentType, category: 'chat' },
                    });
                    if (!uploadData?.getUploadUrl?.uploadUrl) {
                        (pendingRevokeRef.current[placeholderId] ?? []).forEach(URL.revokeObjectURL);
                        delete pendingRevokeRef.current[placeholderId];
                        removeApiMessage(placeholderId);
                        toast.error('Could not get upload URL. Please try again.');
                        setIsSending(false);
                        return;
                    }
                    const { uploadUrl, publicUrl } = uploadData.getUploadUrl;
                    const uploadRes = await fetch(uploadUrl, {
                        method: 'PUT',
                        body: file,
                        headers: { 'Content-Type': contentType },
                    });
                    if (!uploadRes.ok) {
                        (pendingRevokeRef.current[placeholderId] ?? []).forEach(URL.revokeObjectURL);
                        delete pendingRevokeRef.current[placeholderId];
                        removeApiMessage(placeholderId);
                        toast.error(`Upload failed for ${file.name}. Please try again.`);
                        setIsSending(false);
                        return;
                    }
                    attachments.push({ publicUrl, mimeType: contentType });
                }

                const firstMime = attachments[0]?.mimeType ?? '';
                if (firstMime.startsWith('image/')) messageType = 'IMAGE';
                else if (firstMime.startsWith('video/')) messageType = 'VIDEO';
                else if (firstMime.startsWith('audio/')) messageType = 'AUDIO';
                else messageType = 'FILE';
                content = messageText.trim() || (attachments[0]?.publicUrl ?? '');
            } else {
                content = messageText.trim();
            }

            const { data } = await sendMessageMutation({
                variables: {
                    conversationId,
                    messageType,
                    content,
                    ...(attachments.length && {
                        attachments: attachments.map((a) => ({ publicUrl: a.publicUrl, mimeType: a.mimeType })),
                    }),
                    idempotencyKey,
                },
            });

            if (data?.sendMessage) {
                if (hasFiles && files) {
                    (pendingRevokeRef.current[placeholderId] ?? []).forEach(URL.revokeObjectURL);
                    delete pendingRevokeRef.current[placeholderId];
                    removeApiMessage(placeholderId);
                }
                const sentMsg: ApiMessage = {
                    id: data.sendMessage,
                    conversationId,
                    senderId: currentUserId,
                    type: messageType,
                    content,
                    createdAt: new Date().toISOString(),
                    status: 'sent',
                    ...(attachments.length && {
                        attachments: attachments.map((a, i) => ({
                            gcsPath: a.publicUrl,
                            mimeType: a.mimeType,
                            fileName: files?.[i]?.name,
                            fileSize: files?.[i]?.size,
                        })),
                    }),
                };
                addApiMessage(sentMsg);
            }
        } catch (error) {
            if (hasFiles && files) {
                (pendingRevokeRef.current[placeholderId] ?? []).forEach(URL.revokeObjectURL);
                delete pendingRevokeRef.current[placeholderId];
                removeApiMessage(placeholderId);
            }
            console.error('❌ Failed to send message:', error);
            toast.error('Failed to send message. Please try again.');
        } finally {
            setIsSending(false);
        }
    }, [conversationId, currentUserId, sendMessageMutation, addApiMessage, removeApiMessage, getUploadUrl]);

    const handleBlockConfirm = async () => {
        setIsBlocking(true);
        try {
            const { data } = await blockUserMutation({
                variables: { input: { blockedId: chat.id } },
            });
            if (data?.blockUser?.success) {
                toast.success(t('blockSuccess') || 'User blocked.');
                setBlockModalOpen(false);
                onBack?.();
            } else {
                toast.error(data?.blockUser?.message || 'Failed to block user.');
            }
        } catch (err) {
            console.error('Block user error:', err);
            toast.error('Failed to block user.');
        } finally {
            setIsBlocking(false);
        }
    };

    const handleDeleteConversationConfirm = () => {
        if (conversationId) clearApiMessages(conversationId);
        toast.success(t('conversationCleared') || 'Conversation cleared from this device.');
        setDeleteConversationModalOpen(false);
        onBack?.();
    };

    const handleViewProfile = () => {
        if (!chat.id) return;
        router.push(`/${chat.id}`);
        setSidebarOpen(false);
    };

    // ---- Message bubble renderer ----
    const renderMessage = (message: ApiMessage) => {
        const isMe = message.senderId === currentUserId;
        const timeLabel = formatTimeOnly(message.createdAt, userTimeZone);

        const statusIcon = isMe && message.status !== 'sending' && (
            <span className={message.status === 'read' ? 'text-[#34B7F1]' : 'text-gray-400'}>
                {message.status === 'read' || message.status === 'delivered' ? (
                    <span className="inline-flex">
                        <Check className="w-3 h-3 -ml-0.5" />
                        <Check className="w-3 h-3 -ml-1" />
                    </span>
                ) : (
                    <Check className="w-3 h-3" />
                )}
            </span>
        );

        const myTimestampRow = (
            <div className="flex items-center justify-end gap-1 mt-1.5">
                <span className="text-[10px] text-gray-400 leading-none">{timeLabel}</span>
                {statusIcon}
            </div>
        );

        const theirTimestampRow = (
            <p className="text-[10px] text-text-tertiary mt-1 ml-1 leading-none">{timeLabel}</p>
        );

        // Sending state
        if (message.status === 'sending') {
            if (message.sendingPreviews?.length) {
                return (
                    <>
                        <SendingFilesBubble sendingPreviews={message.sendingPreviews} />
                        {message.content && (
                            <div className="mt-2 bg-[#EEEEFF] dark:bg-indigo-950/40 rounded-2xl px-4 py-2.5">
                                <p className="text-sm text-[#2d2d8e] dark:text-indigo-100 break-words">{message.content}</p>
                                <div className="flex items-center justify-end gap-1 mt-1.5">
                                    <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                                    <span className="text-[10px] text-gray-400">Sending…</span>
                                </div>
                            </div>
                        )}
                    </>
                );
            }
            return (
                <div className="bg-[#EEEEFF]/80 dark:bg-indigo-950/30 rounded-2xl px-4 py-2.5">
                    <p className="text-sm text-[#2d2d8e] dark:text-indigo-100 break-words">{message.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1.5">
                        <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                        <span className="text-[10px] text-gray-400">Sending…</span>
                    </div>
                </div>
            );
        }

        // Attachments
        if (message.attachments?.length) {
            const attachmentUrls = (message.attachments ?? []).map((a) => a.gcsPath).filter(Boolean) as string[];
            const contentUrl = message.content?.trim();
            const firstUrl = getFirstUrlInText(message.content);
            const contentIsAttachmentUrl = contentUrl && attachmentUrls.some((u) => u === contentUrl);
            const firstUrlIsAttachmentUrl = firstUrl && attachmentUrls.some((u) => u === firstUrl);

            return (
                <div>
                    <MessageAttachments attachments={message.attachments} />
                    {isLinkOnlyContent(message.content) && !contentIsAttachmentUrl && (
                        <div className="mt-2"><LinkPreviewCard url={message.content!.trim()} /></div>
                    )}
                    {message.content && !isLinkOnlyContent(message.content) && (
                        <div className={`mt-2 rounded-2xl px-4 py-2.5 ${isMe ? 'bg-[#EEEEFF] dark:bg-indigo-950/40' : 'bg-[#EDFBF0] dark:bg-green-950/30'}`}>
                            <p className={`text-sm break-words ${isMe ? 'text-[#2d2d8e] dark:text-indigo-100' : 'text-text-primary'}`}>
                                {message.content}
                            </p>
                            {firstUrl && !firstUrlIsAttachmentUrl && (
                                <div className="mt-2"><LinkPreviewCard url={firstUrl} /></div>
                            )}
                            {isMe ? myTimestampRow : null}
                        </div>
                    )}
                    {isMe ? (
                        !message.content && (
                            <div className="flex justify-end gap-1 mt-1">
                                <span className="text-[10px] text-gray-400">{timeLabel}</span>
                                {statusIcon}
                            </div>
                        )
                    ) : theirTimestampRow}
                </div>
            );
        }

        // Link-only content
        if (isLinkOnlyContent(message.content)) {
            return (
                <div>
                    <LinkPreviewCard url={message.content.trim()} />
                    {isMe ? myTimestampRow : theirTimestampRow}
                </div>
            );
        }

        // Plain text message
        if (isMe) {
            return (
                <div className="bg-[#EEEEFF] dark:bg-indigo-950/40 rounded-2xl px-4 py-2.5">
                    <p className="text-sm text-[#2d2d8e] dark:text-indigo-100 break-words">{message.content}</p>
                    {getFirstUrlInText(message.content) && (
                        <div className="mt-2"><LinkPreviewCard url={getFirstUrlInText(message.content)!} /></div>
                    )}
                    {myTimestampRow}
                </div>
            );
        }

        return (
            <div>
                <div className="bg-[#EDFBF0] dark:bg-green-950/30 rounded-2xl px-4 py-2.5">
                    <p className="text-sm text-text-primary dark:text-green-50 break-words">{message.content}</p>
                    {getFirstUrlInText(message.content) && (
                        <div className="mt-2"><LinkPreviewCard url={getFirstUrlInText(message.content)!} /></div>
                    )}
                </div>
                {theirTimestampRow}
            </div>
        );
    };

    return (
        <div className="flex flex-row h-full w-full">
            {/* ---- Main Chat Area ---- */}
            <div className={`flex-1 bg-surface-default rounded-none md:rounded-lg border-0 md:border md:border-border-subtle flex flex-col h-full ${isMobile && sidebarOpen ? 'hidden' : 'flex'}`}>

                {/* ---- Header ---- */}
                <div className="flex-shrink-0 border-b border-border-subtle px-3 md:px-4 py-3">
                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Back button */}
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors flex-shrink-0"
                                aria-label={tCommon('backToChats')}
                            >
                                <ArrowLeft className="w-5 h-5 text-text-primary" />
                            </button>
                        )}

                        {/* Avatar with online dot */}
                        <div className="relative flex-shrink-0">
                            <Avatar className="w-12 h-12 md:w-14 md:h-14">
                                <AvatarImage src={otherAvatar || undefined} alt="" />
                                <AvatarFallback className="text-base font-semibold">
                                    {displayName.slice(0, 1).toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            {isOnline && (
                                <div className="absolute bottom-0.5 right-0.5 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 rounded-full border-2 border-white" />
                            )}
                        </div>

                        {/* Name + location + badge */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <h2 className="font-bold text-text-primary text-sm md:text-base leading-tight truncate">
                                    {displayName}
                                </h2>
                                {isOnline && (
                                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                                )}
                            </div>
                            {(otherLocation || otherLocalTime) && (
                                <p className="text-xs text-text-secondary truncate mt-0.5">
                                    {otherLocation}
                                    {otherLocation && otherLocalTime && <span className="mx-1">&bull;</span>}
                                    {otherLocalTime && <span className="text-text-brand font-medium">{otherLocalTime}</span>}
                                </p>
                            )}
                            {otherTimezone && (
                                goodTimeToMessage ? (
                                    <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 text-[11px] font-medium">
                                        <Sun className="w-3 h-3" />
                                        Good time to message
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-surface-hover dark:bg-surface-hover text-text-secondary text-[11px] font-medium">
                                        🌙 Not a good time
                                    </div>
                                )
                            )}
                        </div>

                        {/* Three-dot menu */}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-surface-hover rounded-full transition-colors flex-shrink-0"
                            aria-label="More options"
                        >
                            <MoreVertical className="w-5 h-5 text-text-secondary" />
                        </button>
                    </div>
                </div>

                {/* ---- Messages Area ---- */}
                <div className="flex-1 overflow-y-auto px-3 md:px-4 py-4">
                    {/* Empty state */}
                    {apiMessages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-text-secondary">
                            <Avatar className="w-20 h-20">
                                <AvatarImage src={otherAvatar || undefined} alt="" />
                                <AvatarFallback className="text-2xl font-semibold">
                                    {displayName.slice(0, 1).toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="text-center">
                                <p className="font-semibold text-text-primary">{displayName}</p>
                                <p className="text-sm mt-1">{t('typeMessage')}</p>
                            </div>
                        </div>
                    )}

                    {/* Messages with date separators */}
                    {(() => {
                        const nodes: React.ReactNode[] = [];
                        let lastDateKey = '';

                        apiMessages.forEach((message) => {
                            const isMe = message.senderId === currentUserId;
                            const dateKey = getMessageDateKey(message.createdAt, userTimeZone);

                            if (dateKey !== lastDateKey) {
                                lastDateKey = dateKey;
                                nodes.push(
                                    <DateSeparator key={`sep-${dateKey}`} label={getDateLabel(message.createdAt, userTimeZone)} />
                                );
                            }

                            nodes.push(
                                <div
                                    key={message.id}
                                    className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className="max-w-[75%] sm:max-w-sm lg:max-w-md">
                                        {renderMessage(message)}
                                    </div>
                                </div>
                            );
                        });

                        return nodes;
                    })()}

                    <div ref={messagesEndRef} />
                </div>

                {/* ---- Typing Indicator ---- */}
                {otherUserTyping && (
                    <div className="flex-shrink-0 px-4 py-2 flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-[#EDFBF0] dark:bg-green-950/30 px-3 py-2.5 rounded-2xl">
                            <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                        <span className="text-xs text-text-secondary">{displayName} {t('typing')}</span>
                    </div>
                )}

                {/* ---- Message Input ---- */}
                <div className="flex-shrink-0">
                    <MessageInput
                        onSendMessage={handleSendMessage}
                        placeholder={t('typeMessage')}
                        conversationId={conversationId || chat.id}
                        senderId={currentUserId || 'current-user'}
                        disabled={isSending || !conversationId}
                        onTyping={handleTyping}
                    />
                </div>

                {/* ---- Timezone Bar ---- */}
                <div className="flex-shrink-0 bg-[#EEF2FF] dark:bg-indigo-950/30 px-4 py-2 text-center border-t border-indigo-100 dark:border-indigo-900">
                    <p className="text-[11px] text-text-secondary leading-tight">
                        Your time: <span className="font-medium text-text-primary">{formatCurrentTime(userTimeZone)}</span>
                        {otherLocalTime && (
                            <> &bull; <span className="font-medium text-text-primary">{displayName}</span>&apos;s time: {otherLocalTime}</>
                        )}
                    </p>
                </div>
            </div>

            {/* ---- Sidebar Panel ---- */}
            {sidebarOpen && (
                <>
                    {isMobile && (
                        <div
                            className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                    <div className={`
                        ${isMobile ? 'fixed inset-y-0 right-0 z-50 w-[85%] max-w-sm animate-in slide-in-from-right duration-300' : 'w-80'}
                        bg-surface-default border-l border-border-subtle flex flex-col h-full
                        ${isMobile ? 'rounded-l-2xl shadow-2xl' : 'rounded-lg'}
                    `}>
                        {/* Sidebar header */}
                        <div className="flex justify-between items-center p-4 border-b border-border-subtle">
                            <h3 className="font-semibold text-text-primary text-base">{t('viewProfile')}</h3>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4">
                                <div className="flex flex-col items-center mb-6">
                                    <Avatar className="w-20 h-20 mb-3">
                                        <AvatarImage src={otherAvatar || undefined} alt="avatar" />
                                        <AvatarFallback className="text-2xl font-semibold">
                                            {displayName.slice(0, 1).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <h4 className="font-semibold text-text-primary text-lg">{displayName}</h4>
                                    {isOnline && (
                                        <p className="text-sm text-green-600 font-medium mt-0.5">{t('online')}</p>
                                    )}
                                    {otherLocation && (
                                        <p className="text-sm text-text-secondary mt-1">{otherLocation}</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-center mb-6">
                                    <ButtonType3 size="lg" onClick={handleViewProfile}>
                                        {t('viewProfile')}
                                    </ButtonType3>
                                </div>
                            </div>
                        </div>

                        <div className="flex-shrink-0 border-t border-border-subtle p-4 bg-surface-default">
                            <div className="space-y-1">
                                <div className="text-text-danger flex justify-between items-center p-3 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors">
                                    <p className="text-sm font-medium">{t('report')}</p>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                                <div
                                    className="text-text-danger flex justify-between items-center p-3 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors"
                                    onClick={() => setBlockModalOpen(true)}
                                >
                                    <p className="text-sm font-medium">{t('block')}</p>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                                <div
                                    className="text-text-danger flex justify-between items-center p-3 hover:bg-surface-hover rounded-lg cursor-pointer transition-colors"
                                    onClick={() => setDeleteConversationModalOpen(true)}
                                >
                                    <p className="text-sm font-medium">{t('deleteConversation')}</p>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ---- Confirmation Modals ---- */}
            <ConfirmationModal
                open={blockModalOpen}
                onCancel={() => setBlockModalOpen(false)}
                onConfirm={handleBlockConfirm}
                title={t('blockConfirmTitle') || 'Block this user?'}
                description={t('blockConfirmDescription') || 'They will no longer be able to message you or see your profile.'}
                confirmText={t('block') || 'Block'}
                confirmVariant="destructive"
                isLoading={isBlocking}
            />
            <ConfirmationModal
                open={deleteConversationModalOpen}
                onCancel={() => setDeleteConversationModalOpen(false)}
                onConfirm={handleDeleteConversationConfirm}
                title={t('clearConversationConfirmTitle') || 'Clear this conversation on this device?'}
                description={t('clearConversationConfirmDescription') || 'This only clears messages locally. It does not delete the server conversation.'}
                confirmText={t('clearConversation') || 'Clear'}
                confirmVariant="destructive"
            />
        </div>
    );
}
