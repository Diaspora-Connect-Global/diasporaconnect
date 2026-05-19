'use client';

import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
} from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import UploadHttpLink from 'apollo-upload-client/UploadHttpLink.mjs';
import { toast } from 'sonner';

import { useAuthStore } from '@/store/useAuthStore';

/* ------------------------------------------------------------------ */
/* Track shown toasts to prevent duplicates */
/* ------------------------------------------------------------------ */
const shownToasts = new Set<string>();

const showToastOnce = (message: string, duration = 4000) => {
  if (!shownToasts.has(message)) {
    shownToasts.add(message);
    toast.error(message, { duration });
    
    // Clear from set after toast disappears
    setTimeout(() => {
      shownToasts.delete(message);
    }, duration);
  }
};

/* ------------------------------------------------------------------ */
/* Clear session and redirect to sign-in when session is invalid/revoked */
/* ------------------------------------------------------------------ */
const LOCALES = ['en', 'fr', 'it', 'de'] as const;

function clearSessionAndRedirectToSignIn() {
  const { clearAuth } = useAuthStore.getState();
  clearAuth();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const segment = pathname.split('/')[1];
  const locale = segment && LOCALES.includes(segment as (typeof LOCALES)[number]) ? segment : 'en';
  if (typeof window !== 'undefined') {
    window.location.href = `/${locale}/signin`;
  }
}

/* ------------------------------------------------------------------ */
/* Error Handling Link with Toast Notifications */
/* ------------------------------------------------------------------ */
const errorLink = new ErrorLink(({ error, operation }) => {
  if (CombinedGraphQLErrors.is(error)) {
    const isForbidden = error.errors.some(
      (e) =>
        e.message === 'Forbidden resource' ||
        (e.extensions as { code?: string } | undefined)?.code === 'FORBIDDEN'
    );
    if (isForbidden) {
      clearSessionAndRedirectToSignIn();
      return;
    }

    // GraphQL errors (validation, business logic errors)
    error.errors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]\n` +
        `  Message:    ${message}\n` +
        `  Operation:  ${operation.operationName ?? 'unknown'}\n` +
        `  Location:   ${JSON.stringify(locations)}\n` +
        `  Path:       ${JSON.stringify(path)}\n` +
        `  Variables:  ${JSON.stringify(operation.variables, null, 2)}`
      );
      
      // Show toast only if not already shown
      showToastOnce('Something went wrong. Please try again.');
    });
  } else if (CombinedProtocolErrors.is(error)) {
    // Protocol errors (malformed requests, etc.)
    error.errors.forEach(({ message, extensions }) => {
      console.error(
        `[Protocol error]: Message: ${message}, Extensions: ${JSON.stringify(
          extensions
        )}`
      );
    });
    
    showToastOnce('Something went wrong. Please try again.');
  } else {
    // Network errors (server down, connection refused, etc.)
    console.error(`[Network error]: ${error}`);
    
    const errorMessage = error?.message || '';
    
    // Check for specific network error types
    if (errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('ERR_CONNECTION_REFUSED')) {
      showToastOnce('Unable to connect. Please try again later.', 5000);
    } else if (errorMessage.includes('timeout')) {
      showToastOnce('This is taking longer than expected. Please try again.');
    } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      clearSessionAndRedirectToSignIn();
      return;
    } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      clearSessionAndRedirectToSignIn();
      return;
    } else if (errorMessage.includes('404')) {
      showToastOnce('We couldn\'t find what you\'re looking for.');
    } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
      showToastOnce('Something went wrong on our end. Please try again later.', 5000);
    } else {
      showToastOnce('Something went wrong. Please try again.');
    }
  }
});

/* ------------------------------------------------------------------ */
/* Auth + Device Fingerprint Link */
/* ------------------------------------------------------------------ */
const authLink = new SetContextLink((prevContext, operation) => {
  const { tokens, deviceMetadata } = useAuthStore.getState();

  // TEMP DEBUG: dump the outgoing auth header so we can verify which
  // user-id the gateway sees. Remove once like/save reliability is
  // confirmed. Decoded payload is logged separately so it's easy to
  // copy without the b64 noise.
  if (typeof window !== 'undefined') {
    const token = tokens?.sessionToken;
    if (token) {
      let payload: unknown = null;
      try {
        const body = token.split('.')[1];
        payload = JSON.parse(
          decodeURIComponent(
            atob(body.replace(/-/g, '+').replace(/_/g, '/'))
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join(''),
          ),
        );
      } catch {
        payload = '<undecodable>';
      }
      // eslint-disable-next-line no-console
      console.log(
        `[JWT][${operation?.operationName ?? 'unknown'}]`,
        '\n  token:', token,
        '\n  payload:', payload,
      );
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `[JWT][${operation?.operationName ?? 'unknown'}] NO TOKEN — request will be sent unauthenticated`,
      );
    }
  }

  return {
    headers: {
      ...prevContext.headers,
      authorization: tokens?.sessionToken
        ? `Bearer ${tokens.sessionToken}`
        : '',
      'x-device-fingerprint': deviceMetadata?.fingerprint ?? '',
      'apollo-require-preflight': 'true',
    },
  };
});

/* ------------------------------------------------------------------ */
/* Upload-capable terminating link */
/* ------------------------------------------------------------------ */
const uploadLink = new UploadHttpLink({
  uri: 'https://api.diaspoplug.net/graphql',
  credentials: 'include',
});

/* ------------------------------------------------------------------ */
/* Combine links (ORDER MATTERS: error → auth → upload) */
/* ------------------------------------------------------------------ */
const link = ApolloLink.from([
  errorLink,  // First: catch and log errors
  authLink,   // Second: add auth headers
  uploadLink, // Last: make the request
]);

/* ------------------------------------------------------------------ */
/* Apollo Client */
/* ------------------------------------------------------------------ */
const gqlClient = new ApolloClient({
  link,
  cache: new InMemoryCache(),
  queryDeduplication: false,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all', // Return both data and errors
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
  },
});

export default gqlClient;