const REVIEW_ROLES = new Set(["Reviewer", "Administrator"]);
const FINAL_DECISIONS = new Set(["Approved", "Conditional", "Rejected"]);

export function canRecordDecision(role) {
  return REVIEW_ROLES.has(role);
}

export function validateDecision({
  role,
  requesterId,
  reviewerId,
  decision,
  rationale
}) {
  if (!canRecordDecision(role)) {
    return { ok: false, error: "Only a Reviewer or Administrator may record a decision." };
  }

  if (requesterId && reviewerId && requesterId === reviewerId) {
    return { ok: false, error: "A requester cannot approve or reject their own request." };
  }

  if (!FINAL_DECISIONS.has(decision)) {
    return { ok: false, error: "Decision must be Approved, Conditional, or Rejected." };
  }

  if (!String(rationale ?? "").trim()) {
    return { ok: false, error: "A reviewer rationale is required for a final decision." };
  }

  return { ok: true };
}

export function createDecisionRecord(input, now = new Date()) {
  const validation = validateDecision(input);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  return {
    requestId: input.requestId,
    decision: input.decision,
    rationale: input.rationale.trim(),
    reviewerId: input.reviewerId,
    recordedAt: now.toISOString()
  };
}

export function createAuditEvent({
  requestId,
  actorId,
  action,
  previousStatus = null,
  newStatus = null,
  context = null
}, now = new Date()) {
  if (!requestId || !actorId || !action) {
    throw new Error("requestId, actorId, and action are required for an audit event.");
  }

  return {
    requestId,
    actorId,
    action,
    previousStatus,
    newStatus,
    context,
    timestamp: now.toISOString()
  };
}
