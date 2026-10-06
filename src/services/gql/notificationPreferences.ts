import { gql } from '@apollo/client';

/**
 * Settings → Notifications (email / push / SMS). Both operations act on the
 * signed-in user only: the gateway takes the id from the JWT and neither takes
 * a user id. The switches cover optional notifications; security, account,
 * payment and legal messages are always sent. A failed read is an error, never
 * a default — a switch must not show "on" (or "off") unless the server says so.
 */

export type NotificationChannel = 'email' | 'push' | 'sms';

export interface NotificationChannelPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface MyNotificationPreferencesData {
  myNotificationPreferences: NotificationChannelPreferences | null;
}

export interface UpdateMyNotificationPreferencesData {
  updateMyNotificationPreferences: NotificationChannelPreferences | null;
}

export interface UpdateMyNotificationPreferencesVariables {
  input: Partial<NotificationChannelPreferences>;
}

export const MY_NOTIFICATION_PREFERENCES = gql`
  query MyNotificationPreferences {
    myNotificationPreferences {
      email
      push
      sms
    }
  }
`;

export const UPDATE_MY_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateMyNotificationPreferences($input: UpdateNotificationChannelPreferencesInput!) {
    updateMyNotificationPreferences(input: $input) {
      email
      push
      sms
    }
  }
`;
