'use client';

import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
} from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import UploadHttpLink from 'apollo-upload-client/UploadHttpLink.mjs';

import { useAuthStore } from '@/store/useAuthStore';

/* ------------------------------------------------------------------ */
/* Auth + Device Fingerprint Link */
/* ------------------------------------------------------------------ */
const authLink = new SetContextLink((prevContext) => {
  const { tokens, deviceMetadata } = useAuthStore.getState();

  return {
    headers: {
      ...prevContext.headers,
      authorization: tokens?.sessionToken
        ? `Bearer ${tokens.sessionToken}`
        : '',
      'x-device-fingerprint': deviceMetadata?.fingerprint ?? '',
    },
  };
});

/* ------------------------------------------------------------------ */
/* Upload-capable terminating link */
/* ------------------------------------------------------------------ */
const uploadLink = new UploadHttpLink({
  uri: 'https://api.diasporaconnectglobal.com/graphql',
  credentials: 'include',
});

/* ------------------------------------------------------------------ */
/* Combine links (ORDER MATTERS) */
/* ------------------------------------------------------------------ */
const link = ApolloLink.from([
  authLink,
  uploadLink,
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
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'network-only',
    },
    mutate: {
      fetchPolicy: 'no-cache',
    },
  },
});

export default gqlClient;