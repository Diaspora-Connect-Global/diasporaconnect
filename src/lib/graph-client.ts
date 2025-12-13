import { useAuthStore } from "@/store/useAuthStore";
import { ApolloClient, HttpLink, InMemoryCache, ApolloLink } from "@apollo/client";
import { SetContextLink } from '@apollo/client/link/context';

const cache = new InMemoryCache();

const httpLink = new HttpLink({
  uri: "https://api.diasporaconnectglobal.com/graphql", 
});



const authLink = new SetContextLink((prevContext, operation) => {
  const token = useAuthStore((s) => s.tokens?.accessToken);

  return {
    headers: {
      ...prevContext.headers,
      authorization: token ? `Bearer ${token}` : "",
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