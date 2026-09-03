import { gql } from '@apollo/client';

/**
 * @fileoverview The GraphQL surface behind "Report to DiaspoPlug".
 * @module components/circles/report/reportGql
 *
 * ── WHY THIS DOCUMENT LIVES HERE AND NOT IN `services/gql/circles*.ts` ──────
 * It is the only consumer, and it is deliberately narrow: this is the one
 * route OUT of a circle, and keeping its document beside the screen makes the
 * blast radius of a change to it obvious. Move it to
 * `services/gql/circles-report.ts` the moment a second screen needs it.
 *
 * ── WHAT THE SERVER ACTUALLY DOES WITH THIS ────────────────────────────────
 * `reportCircleToSupport` files a support case whose `ownerType` is **SYSTEM**,
 * with the circle carried in the generic `linked_entity_type='CIRCLE'` /
 * `linked_entity_id=<circleId>` pair. A circle is deliberately NOT a support
 * owner type: owners triage their own cases, so making the circle the owner
 * would route a complaint about a circle to that circle's own LEADs. A report
 * has to be able to escape the thing it is about.
 *
 * `CircleReportLink` — what comes back — is only the circle's local pointer at
 * the case. Note the fields it does NOT have: there is no `reporterUserId` on
 * the GraphQL type at all, so nothing this screen can render could identify
 * the reporter to the circle. The footer's confidentiality promise is a
 * property of the schema, not of this component's restraint.
 */
export const REPORT_CIRCLE_TO_SUPPORT = gql`
  mutation ReportCircleToSupport($input: ReportCircleToSupportInput!) {
    reportCircleToSupport(input: $input) {
      id
      circleId
      caseId
      subjectType
      createdAt
    }
  }
`;

/** `ReportCircleToSupportInput`. */
export interface ReportCircleToSupportInput {
  circleId: string;
  /**
   * Nullable in the gateway's GraphQL input and REQUIRED by circle-service's
   * handler (`requireId(input.caseTypeId, 'caseTypeId')`). Always send one —
   * omitting it costs a round trip and returns a refusal, not a default.
   */
  caseTypeId: string;
  /**
   * Required by the handler. The design has no title field, so the screen
   * derives it from the chosen reason: a Trust & Safety queue reading
   * "Harassment" is legible; one reading "" is not.
   */
  title: string;
  /** Required by the handler (`requireId`), despite being nullable in GraphQL. */
  description: string;
  /** What inside the circle is reported. 'CIRCLE' — the circle as a whole. */
  subjectType?: string;
  /** A UUID or nothing; circle-service refuses a non-UUID before filing. */
  subjectId?: string;
}

/**
 * The circle's local record that something was reported. Deliberately carries
 * no reporter — see the module doc.
 */
export interface CircleReportLink {
  id: string;
  circleId: string;
  caseId: string;
  subjectType?: string | null;
  createdAt?: string | null;
}

export interface ReportCircleToSupportData {
  reportCircleToSupport: CircleReportLink | null;
}

export interface ReportCircleToSupportVariables {
  input: ReportCircleToSupportInput;
}
