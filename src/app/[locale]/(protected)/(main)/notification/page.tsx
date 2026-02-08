/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { NotificationCard } from "@/components/cards/notification/NotificationCard";
import { Check, Settings } from "lucide-react";
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from "react";
import {
    deleteNotification,
    getNotifications,
    markAllAsRead as markAllAsReadApi,
    markAsRead as markAsReadApi,
    Notification as ApiNotification,
} from "@/services/rest/notification";
import { useAuthStore } from '@/store/useAuthStore';

interface UiNotification {
    id: string;
    title: string;
    description: string;
    type: 'associations' | 'opportunities' | 'events';
    read: boolean;
    date: string;
}

interface Tab {
    label: string;
    value: 'all' | 'associations' | 'opportunities' | 'events';
}

export default function Notification() {
    const t = useTranslations('notification');

    const [filter, setFilter] = useState<'all' | 'associations' | 'opportunities' | 'events'>('all');
    const [notifications, setNotifications] = useState<UiNotification[]>([]);
    const [filteredNotifications, setFilteredNotifications] = useState<UiNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const TABS: Tab[] = useMemo(() => ([
        { label: t('allnotifications'), value: 'all' },
        { label: t('opportunities'), value: 'opportunities' },
        { label: t('events'), value: 'events' },
        { label: t('associations'), value: 'associations' },
    ]), [t]);

    const mapApiNotification = (notification: ApiNotification): UiNotification => {
        const type = notification.type === 'opportunities' || notification.type === 'events'
            ? notification.type
            : 'associations';

        return {
            id: notification.id,
            title: notification.title,
            description: notification.message,
            type,
            read: notification.isRead,
            date: notification.createdAt,
        };
    };

    // Check auth token on mount
    useEffect(() => {
        const token = useAuthStore.getState().tokens?.sessionToken;
        console.log('🔑 Auth Token Status:', token ? 'EXISTS' : 'MISSING');
        if (token) {
            console.log('🔑 Token Preview:', token.substring(0, 20) + '...');
        }
    }, []);

    useEffect(() => {
        const loadNotifications = async () => {
            console.log('🔵 Starting to load notifications...');
            console.log('🔵 Current URL:', window.location.href);
            
            try {
                setIsLoading(true);
                setErrorMessage(null);
                
                console.log('🔵 Calling getNotifications API with page=1, limit=50...');
                const response = await getNotifications(1, 50);
                
                console.log('✅ API Response received:', response);
                console.log('✅ Notifications count:', response.notifications?.length || 0);
                console.log('✅ Total:', response.total);
                
                setNotifications(response.notifications.map(mapApiNotification));
            } catch (error) {
                console.error('❌ Error loading notifications:', error);
                if (error instanceof Error) {
                    console.error('❌ Error message:', error.message);
                    console.error('❌ Error stack:', error.stack);
                }
                // Check if it's an axios error
                if ((error as any).response) {
                    console.error('❌ Response status:', (error as any).response.status);
                    console.error('❌ Response data:', (error as any).response.data);
                }
                setErrorMessage('Unable to load notifications.');
            } finally {
                setIsLoading(false);
                console.log('🔵 Finished loading notifications (isLoading set to false)');
            }
        };

        loadNotifications();
    }, []);

    // Use useEffect to handle filtering based on the current filter and notifications state
    useEffect(() => {
        console.log('🔍 Filter changed to:', filter);
        console.log('🔍 Total notifications:', notifications.length);
        
        if (filter === 'all') {
            setFilteredNotifications(notifications);
            console.log('🔍 Showing all notifications:', notifications.length);
        } else {
            const filtered = notifications.filter(notification => notification.type === filter);
            setFilteredNotifications(filtered);
            console.log(`🔍 Filtered ${filter} notifications:`, filtered.length);
        }
    }, [filter, notifications]);

    const handleFilterChange = (value: 'all' | 'associations' | 'opportunities' | 'events') => {
        console.log('🎯 Filter button clicked:', value);
        setFilter(value);
    };

    // Mark notification as read based on id
    const markAsRead = async (id: string) => {
        console.log('📖 Marking notification as read:', id);
        try {
            await markAsReadApi(id);
            const updatedNotifications = notifications.map(notification =>
                notification.id === id
                    ? { ...notification, read: true }
                    : notification
            );
            setNotifications(updatedNotifications);
            console.log('✅ Notification marked as read');
        } catch (error) {
            console.error('❌ Error marking as read:', error);
            setErrorMessage('Unable to update notifications.');
        }
    };

    // Remove notification based on id
    const removeNotification = async (id: string) => {
        console.log('🗑️ Removing notification:', id);
        try {
            await deleteNotification(id);
            const updatedNotifications = notifications.filter(notification => notification.id !== id);
            setNotifications(updatedNotifications);
            console.log('✅ Notification removed');
        } catch (error) {
            console.error('❌ Error removing notification:', error);
            setErrorMessage('Unable to update notifications.');
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        console.log('📖 Marking all notifications as read');
        try {
            await markAllAsReadApi();
            const updatedNotifications = notifications.map(notification => ({
                ...notification,
                read: true,
            }));
            setNotifications(updatedNotifications);
            console.log('✅ All notifications marked as read');
        } catch (error) {
            console.error('❌ Error marking all as read:', error);
            setErrorMessage('Unable to update notifications.');
        }
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

    console.log('🎨 Render state:', {
        isLoading,
        errorMessage,
        emptyStateMessage,
        notificationsCount: notifications.length,
        filteredCount: filteredNotifications.length,
        currentFilter: filter
    });

    return (
        <div className="lg:max-w-[63rem] mx-2 lg:mx-auto h-app-inner py-4">
            <div className="h-[30%] lg:h-[20%]">

                <div className="lg:flex justify-between items-center mb-4">
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
                    <div className="flex gap-2 mb-4 flex-wrap">
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

            </div>
        

            {isLoading ? (
                <div className="text-text-secondary font-medium">
                    Loading...
                </div>
            ) : errorMessage ? (
                <div className="text-text-danger font-medium">
                    {errorMessage}
                </div>
            ) : emptyStateMessage ? (
                <div className="">
                    <div className="text-text-secondary font-medium">
                        {emptyStateMessage}
                    </div>
                </div>
            ) : (
                <div className="bg-surface-default rounded-md lg:p-6 h-[70%] lg:h-[80%]  overflow-y-auto scrollbar-hide ">
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