import { gql } from '@apollo/client';

/* ============================================================================
   RESOURCE-SERVICE (via api-gateway GraphQL)

   Resources are scoped PER OWNER (ownerType + ownerEntityId). For an embassy
   community we pass ownerType: COMMUNITY and the community id. The
   `publishedResources` query returns only resources visible to the current
   viewer; `recordResourceDownload` returns a signed download URL (String).
   ============================================================================ */

/** File type of a resource — drives the icon shown in the UI. */
export type ResourceFileType =
  | 'PDF'
  | 'DOC'
  | 'XLS'
  | 'PPT'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'OTHER';

export const PUBLISHED_RESOURCES = gql`
  query PublishedResources($ownerType: ResourceOwnerType!, $ownerEntityId: ID!) {
    publishedResources(ownerType: $ownerType, ownerEntityId: $ownerEntityId) {
      id
      resourceNumber
      title
      fileType
      status
      visibility
      categoryIds
      tags
      featured
      pinned
      viewCount
      downloadCount
      publishedAt
      updatedAt
    }
  }
`;

/** Returns a signed download URL (String) for the given resource. */
export const RECORD_RESOURCE_DOWNLOAD = gql`
  mutation RecordResourceDownload($resourceId: ID!) {
    recordResourceDownload(resourceId: $resourceId)
  }
`;

/** A published resource summary as returned by PUBLISHED_RESOURCES. */
export interface ResourceSummary {
  id: string;
  resourceNumber: string;
  title: string;
  fileType: ResourceFileType | string;
  status: string;
  visibility: string;
  categoryIds?: string[] | null;
  tags?: string[] | null;
  featured?: boolean | null;
  pinned?: boolean | null;
  viewCount?: number | null;
  downloadCount?: number | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

export interface PublishedResourcesResponse {
  publishedResources: ResourceSummary[];
}

export interface RecordResourceDownloadResponse {
  recordResourceDownload: string;
}
