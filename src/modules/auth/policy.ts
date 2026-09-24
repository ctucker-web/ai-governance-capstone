import type { Role, Status } from "@prisma/client";
export type Actor = {
  id: string;
  organizationId: string;
  name: string;
  roles: Role[];
};
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function requireRole(actor: Actor, ...roles: Role[]) {
  if (!roles.some((r) => actor.roles.includes(r)))
    throw new AppError(403, "Your role cannot perform this action.");
}
export function canReview(actor: Actor, ownerId: string, reviewerId: string) {
  return (
    actor.roles.includes("REVIEWER") &&
    actor.id !== ownerId &&
    actor.id === reviewerId
  );
}
export const approved: Status[] = [
  "APPROVED",
  "CONDITIONALLY_APPROVED",
  "REASSESSMENT_DUE",
];
export const pending: Status[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_INFORMATION",
];
export function effectiveStatus(
  record: { status: Status; nextReviewAt: Date | string | null },
  now = new Date(),
): Status {
  return approved.includes(record.status) &&
    record.nextReviewAt &&
    new Date(record.nextReviewAt) < now
    ? "REASSESSMENT_DUE"
    : record.status;
}
