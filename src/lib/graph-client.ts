import { useAuthStore } from "@/store/useAuthStore";
import { ApolloClient, HttpLink, InMemoryCache, ApolloLink } from "@apollo/client";
import { SetContextLink } from '@apollo/client/link/context';

const cache = new InMemoryCache();

const httpLink = new HttpLink({
  uri: "https://api.diasporaconnectglobal.com/graphql", 
});



const authLink = new SetContextLink((prevContext, operation) => {
 const token = useAuthStore.getState().tokens?.accessToken;
 const fingerprint = useAuthStore.getState().deviceMetadata?.fingerprint;
   console.log("token passed with fingerprint", token , fingerprint)

  return {
    headers: {
      ...prevContext.headers,
      authorization: token ? `Bearer ${token}` : "",
      "x-device-fingerprint": fingerprint ,
    },
  };
});


// Combine the auth link and http link
const gqlClient = new ApolloClient({
  cache: cache,
  link: authLink.concat(httpLink),
  queryDeduplication: false,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
    },
  },
});

export default gqlClient;