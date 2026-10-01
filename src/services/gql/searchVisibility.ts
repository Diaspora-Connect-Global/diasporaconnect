import { gql } from '@apollo/client';

/**
 * Settings → Privacy → "Show me in search results". Both operations act on the
 * signed-in user only: the gateway takes the id from the JWT and neither takes
 * a user id. A failed read is an error, never a default — the switch must not
 * show "on" unless the server says so.
 */

export interface SearchVisibility {
  /** Off: left out of people search, people pickers and suggestions. */
  searchable: boolean;
}

export interface MySearchVisibilityData {
  mySearchVisibility: SearchVisibility | null;
}

export interface UpdateSearchVisibilityData {
  updateSearchVisibility: SearchVisibility | null;
}

export interface UpdateSearchVisibilityVariables {
  searchable: boolean;
}

export const MY_SEARCH_VISIBILITY = gql`
  query MySearchVisibility {
    mySearchVisibility {
      searchable
    }
  }
`;

export const UPDATE_SEARCH_VISIBILITY = gql`
  mutation UpdateSearchVisibility($searchable: Boolean!) {
    updateSearchVisibility(searchable: $searchable) {
      searchable
    }
  }
`;
