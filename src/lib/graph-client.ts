
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client"
const cache = new InMemoryCache();
const httpLink = new HttpLink({
  uri: "https://api.diasporaconnectglobal.com/graphql", 
});
const gqlClient = new ApolloClient({
    cache: cache,
    link: httpLink,
    queryDeduplication: false,
    defaultOptions: {
        watchQuery: {
            fetchPolicy: "cache-and-network",
        },
    },
});

export default gqlClient