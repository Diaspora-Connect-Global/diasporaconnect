import type { CircleProjectGoal } from '@/services/gql/types/circles';

/**
 * The goal whose progress represents a project.
 *
 * A SHARED goal belongs to the circle; an INDIVIDUAL goal is one member's
 * slice. Leading with an individual goal would show one person's progress under
 * the project's name, so shared wins — and an open shared goal wins over a met
 * or cancelled one, because that is the one still being worked on.
 *
 * Shared by the inline `ProjectCard` and the "What's live" panel so the two
 * never disagree about which number represents the same project: a sidebar
 * saying 60% beside a card saying 20% is worse than either being absent.
 */
export function pickHeadlineGoal(
  goals: CircleProjectGoal[],
): CircleProjectGoal | null {
  return (
    goals.find((g) => g.scope === 'SHARED' && g.status === 'OPEN') ??
    goals.find((g) => g.scope === 'SHARED') ??
    goals[0] ??
    null
  );
}
