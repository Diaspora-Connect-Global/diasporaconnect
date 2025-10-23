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
}

const notificationsFromApi: Notification[] = [
    {
        id: "1",
        title: "GhanaConnect:Global",
        description: "Connect with professionals and businesses across Ghana and abroad.",
        type: 'associations',
        read: true
    },
    {
        id: "2",
        title: "New Job Opportunity at TechCorp",
        description: "TechCorp is hiring a Senior Software Engineer. Apply now to join our innovative team!",
        type: 'opportunities',
        read: false
    },
    {
        id: "3",
        title: "Upcoming Webinar: The Future of Tech in Africa",
        description: "Join us for an insightful webinar discussing the future of technology in Africa with industry experts.",
        type: 'events',
        read: true
    },
    {
        id: "4",
        title: "Upcoming Webinar: The Future of Tech in Africa",
        description: "Join us for an insightful webinar discussing the future of technology in Africa with industry experts.",
        type: 'events',
        read: true
    },
    {
        id: "5",
        title: "Upcoming Webinar: The Future of Tech in Africa",
        description: "Join us for an insightful webinar discussing the future of technology in Africa with industry experts.",
        type: 'events',
        read: true
    },
    {
        id: "6",
        title: "Upcoming Webinar: The Future of Tech in Africa",
        description: "Join us for an insightful webinar discussing the future of technology in Africa with industry experts.",
        type: 'events',
        read: true
    },
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
        <div className="lg:max-w-[63rem] mx-2 lg:mx-[15%] h-[calc(100vh-4rem)] py-4">
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
                            className={`cursor-pointer px-4 py-2 rounded-full transition-all duration-300 ${
                                tab.value === filter
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
                            time="4d"
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