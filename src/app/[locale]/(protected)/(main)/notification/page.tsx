/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { NotificationCard } from "@/components/cards/notification/NotificationCard";
import { ConfirmationModal } from "@/components/custom/confirmationModal";
import { Check, Settings } from "lucide-react";
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from '@apollo/client/react';
import {
    GET_NOTIFICATIONS,
    MARK_AS_READ,
    DELETE_NOTIFICATION,
    Notification as ApiNotification,
    GetNotificationsResponse,
    MarkAsReadResponse,
    DeleteNotificationResponse,
} from "@/services/gql/notification";

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

    const tCommon = useTranslations('common');
    const [filter, setFilter] = useState<'all' | 'associations' | 'opportunities' | 'events'>('all');
    const [notifications, setNotifications] = useState<UiNotification[]>([]);
    const [filteredNotifications, setFilteredNotifications] = useState<UiNotification[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [removeModalOpen, setRemoveModalOpen] = useState(false);
    const [notificationIdToRemove, setNotificationIdToRemove] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    const TABS: Tab[] = useMemo(() => ([
        { label: t('allnotifications'), value: 'all' },
        { label: t('opportunities'), value: 'opportunities' },
        { label: t('events'), value: 'events' },
        { label: t('associations'), value: 'associations' },
    ]), [t]);

    const { data, loading, error, refetch } = useQuery<GetNotificationsResponse>(GET_NOTIFICATIONS, {
        variables: { limit: 50, offset: 0 },
    });

    const [markAsReadMutation] = useMutation<MarkAsReadResponse>(MARK_AS_READ);
    const [deleteNotificationMutation] = useMutation<DeleteNotificationResponse>(DELETE_NOTIFICATION);

    const mapApiNotification = (notification: ApiNotification): UiNotification => {
        const type = notification.type === 'opportunities' || notification.type === 'events'
            ? notification.type
            : 'associations';

        return {
            id: notification.id,
            title: notification.title,
            description: notification.body,
            type,
            read: notification.isRead,
            date: notification.createdAt,
        };
    };

    useEffect(() => {
        if (data?.getNotifications) {
            setNotifications(data.getNotifications.map(mapApiNotification));
        }
    }, [data]);

    useEffect(() => {
        if (error) {
            setErrorMessage('Unable to load notifications.');
        }
    }, [error]);

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

    const markAsRead = async (id: string) => {
        try {
            await markAsReadMutation({
                variables: { notificationId: id },
            });
            const updatedNotifications = notifications.map(notification =>
                notification.id === id
                    ? { ...notification, read: true }
                    : notification
            );
            setNotifications(updatedNotifications);
        } catch (error) {
            console.error('Error marking as read:', error);
            setErrorMessage('Unable to update notifications.');
        }
    };

    const requestRemoveNotification = (id: string) => {
        setNotificationIdToRemove(id);
        setRemoveModalOpen(true);
    };

    const removeNotificationConfirm = async () => {
        if (!notificationIdToRemove) return;
        setIsRemoving(true);
        try {
            await deleteNotificationMutation({
                variables: { notificationId: notificationIdToRemove },
            });
            const updatedNotifications = notifications.filter(notification => notification.id !== notificationIdToRemove);
            setNotifications(updatedNotifications);
            setRemoveModalOpen(false);
            setNotificationIdToRemove(null);
        } catch (error) {
            console.error('Error removing notification:', error);
            setErrorMessage('Unable to update notifications.');
        } finally {
            setIsRemoving(false);
        }
    };

    const markAllAsRead = async () => {
        try {
            await Promise.all(
                notifications
                    .filter(n => !n.read)
                    .map(n => markAsReadMutation({ variables: { notificationId: n.id } }))
            );
            const updatedNotifications = notifications.map(notification => ({
                ...notification,
                read: true,
            }));
            setNotifications(updatedNotifications);
        } catch (error) {
            console.error('Error marking all as read:', error);
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
        

            {loading ? (
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
                            onRemove={() => requestRemoveNotification(not.id)}
                        />
                    ))}
                </div>
            )}

            <ConfirmationModal
                open={removeModalOpen}
                onCancel={() => { setRemoveModalOpen(false); setNotificationIdToRemove(null); }}
                onConfirm={removeNotificationConfirm}
                title={t('removeNotificationTitle') || 'Remove notification?'}
                description={t('removeNotificationConfirm') || 'This notification will be removed from your list.'}
                confirmText={t('remove') || tCommon('remove') || 'Remove'}
                confirmVariant="destructive"
                isLoading={isRemoving}
            />
        </div>
    );
}