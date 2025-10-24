'use client';
import { NotificationCard } from "@/components/cards/notification/NotificationCard";
import { Check, Settings } from "lucide-react";
import { useTranslations } from 'next-intl';
import { useState, useEffect } from "react";

interface Notification {
    id: string;
    title: string;
    description: string;
    type: 'associations' | 'opportunities' | 'events';
    read: boolean;
    date: string; 
}

const notificationsFromApi: Notification[] = [
    {
        id: "1",
        title: "GhanaConnect:Global Monthly Meetup",
        description: "Join our virtual networking session with diaspora professionals this Friday at 6 PM GMT.",
        type: 'associations',
        read: true,
        date: new Date(Date.now() - 30 * 1000).toISOString(), // 30 seconds ago - "Just now"
    },
    {
        id: "2",
        title: "Senior Frontend Developer at FinTech Startup",
        description: "Remote position available for React/TypeScript developer with 5+ years experience.",
        type: 'opportunities',
        read: false,
        date: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago - "2m ago"
    },
    {
        id: "3",
        title: "African Tech Innovation Summit 2024",
        description: "Register for our annual conference featuring top innovators and investors across Africa.",
        type: 'events',
        read: true,
        date: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago - "45m ago"
    },
    {
        id: "4",
        title: "Diaspora Business Association Election",
        description: "Voting opens tomorrow for the new executive board members. Make your voice heard!",
        type: 'associations',
        read: false,
        date: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago - "3h ago"
    },
    {
        id: "5",
        title: "Marketing Manager - Remote Position",
        description: "Global company seeking marketing professional with African market experience.",
        type: 'opportunities',
        read: false,
        date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago - "12h ago"
    },
    {
        id: "6",
        title: "Cultural Exchange Festival",
        description: "Celebrate African heritage with food, music, and networking in London next month.",
        type: 'events',
        read: true,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago - "Yesterday"
    },
    {
        id: "7",
        title: "Ghanaian Professionals Network Update",
        description: "New membership benefits announced including mentorship programs and career resources.",
        type: 'associations',
        read: false,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago - "3d ago"
    },
    {
        id: "8",
        title: "Data Scientist Opportunity",
        description: "Join our AI research team working on solutions for African agricultural challenges.",
        type: 'opportunities',
        read: true,
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago - "1w ago"
    },
    {
        id: "9",
        title: "Startup Pitch Competition",
        description: "Submit your business idea for a chance to win $50,000 in funding and mentorship.",
        type: 'events',
        read: false,
        date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days ago - "3w ago"
    },
    {
        id: "10",
        title: "Diaspora Investment Group Meeting",
        description: "Quarterly meeting to discuss new investment opportunities in West Africa.",
        type: 'associations',
        read: true,
        date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago - "1mo ago"
    },
    {
        id: "11",
        title: "Product Manager - E-commerce Platform",
        description: "Lead product development for fast-growing African online marketplace.",
        type: 'opportunities',
        read: false,
        date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago - "3mo ago"
    },
    {
        id: "12",
        title: "Annual Diaspora Homecoming Gala",
        description: "Formal event celebrating diaspora achievements and fostering connections.",
        type: 'events',
        read: true,
        date: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(), // 400 days ago - "1y ago"
    },
    {
        id: "13",
        title: "Tech Conference 2025",
        description: "Save the date for our biggest tech conference next year.",
        type: 'events',
        read: false,
        date: new Date(Date.now() - 800 * 24 * 60 * 60 * 1000).toISOString(), // 800 days ago - "2y ago"
    }
];


interface Tab {
    label: string;
    value: 'all' | 'associations' | 'opportunities' | 'events';
}

export default function Notification() {
    const t = useTranslations('notification');

    const [filter, setFilter] = useState<'all' | 'associations' | 'opportunities' | 'events'>('all');
    const [notifications, setNotifications] = useState<Notification[]>(notificationsFromApi);
    const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>(notificationsFromApi);

    const TABS: Tab[] = [
        { label: t('allnotifications'), value: 'all' },
        { label: t('opportunities'), value: 'opportunities' },
        { label: t('events'), value: 'events' },
        { label: t('associations'), value: 'associations' },
    ];

    // Use useEffect to handle filtering based on the current filter and notifications state
    useEffect(() => {
        if (filter === 'all') {
            setFilteredNotifications(notifications);
        } else {
            const filtered = notifications.filter(notification => notification.type === filter);
            setFilteredNotifications(filtered);
        }
    }, [filter, notifications]);

    const handleFilterChange = (value: 'all' | 'associations' | 'opportunities' | 'events') => {
        setFilter(value);
    };

    // Mark notification as read based on id
    const markAsRead = (id: string) => {
        const updatedNotifications = notifications.map(notification =>
            notification.id === id
                ? { ...notification, read: true }
                : notification
        );
        setNotifications(updatedNotifications);
    };

    // Remove notification based on id
    const removeNotification = (id: string) => {
        const updatedNotifications = notifications.filter(notification => notification.id !== id);
        setNotifications(updatedNotifications);
    };

    // Mark all as read based on current filter
    const markAllAsRead = () => {
        const updatedNotifications = notifications.map(notification => {
            // If filter is 'all', mark all notifications as read
            if (filter === 'all') {
                return { ...notification, read: true };
            }
            // If filter is specific, only mark notifications of that type as read
            if (notification.type === filter) {
                return { ...notification, read: true };
            }
            // Keep other notifications unchanged
            return notification;
        });
        setNotifications(updatedNotifications);
    };



    // Get empty state message based on current filter
    const getEmptyStateMessage = () => {
        if (filteredNotifications.length === 0) {
            switch (filter) {
                case 'all':
                    return t('none.all');
                case 'opportunities':
                    return t('none.opportunities');
                case 'events':
                    return t('none.events');
                case 'associations':
                    return t('none.associations');
                default:
                    return t('none.all');
            }
        }
        return null;
    };

    const emptyStateMessage = getEmptyStateMessage();

    return (
        <div className="lg:max-w-[63rem] mx-2 lg:mx-auto h-[calc(100vh-4rem)] py-4">
            <div className="flex justify-between items-center mb-4">
                <p className="text-2xl font-heading-large">
                    {t('notifications')}
                </p>

                <div className="flex items-center gap-4">
                    <button
                        className="flex items-center gap-2 text-text-brand hover:text-text-brand-dark transition-colors cursor-pointer"
                        onClick={markAllAsRead}
                    >
                        <Check size={16} />
                        <span className="text-sm">{t('markall')}</span>
                    </button>

                    <div className="w-px h-4 bg-border-subtle"></div>

                    <button className="flex items-center gap-2 text-text-brand hover:text-text-brand-dark transition-colors cursor-pointer">
                        <Settings size={16} />
                        <span className="text-sm">{t('preference')}</span>
                    </button>
                </div>
            </div>

            <div>
                <div className="flex gap-2 mb-4">
                    {TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => handleFilterChange(tab.value)}
                            className={`cursor-pointer px-4 py-2 rounded-full transition-all duration-300 ${tab.value === filter
                                    ? 'bg-surface-brand text-white'
                                    : 'bg-surface-default text-text-secondary hover:bg-surface-tertiary'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {emptyStateMessage ? (
                <div className="">
                    <div className="text-text-secondary font-medium">
                        {emptyStateMessage}
                    </div>
                </div>
            ) : (
                <div className="bg-surface-default rounded-md p-6 overflow-y-auto scrollbar-hide lg:max-h-[calc(100vh-12rem)]">
                    {filteredNotifications.map((not) => (
                        <NotificationCard
                            key={not.id}
                            title={not.title}
                            description={not.description}
                            time={not.date}
                            read={not.read}
                            onMarkAsRead={() => markAsRead(not.id)}
                            onRemove={() => removeNotification(not.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}