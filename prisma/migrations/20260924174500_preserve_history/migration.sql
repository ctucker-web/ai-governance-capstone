-- Ordinary application operations must never rewrite governance history.
CREATE FUNCTION governance_history_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Governance history is append-only: %', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_event_append_only BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION governance_history_is_append_only();
CREATE TRIGGER assessment_append_only BEFORE UPDATE OR DELETE ON "RiskAssessment"
FOR EACH ROW EXECUTE FUNCTION governance_history_is_append_only();
CREATE TRIGGER assessment_factor_append_only BEFORE UPDATE OR DELETE ON "RiskAssessmentFactor"
FOR EACH ROW EXECUTE FUNCTION governance_history_is_append_only();
CREATE TRIGGER decision_append_only BEFORE UPDATE OR DELETE ON "Decision"
FOR EACH ROW EXECUTE FUNCTION governance_history_is_append_only();
CREATE TRIGGER configuration_append_only BEFORE UPDATE OR DELETE ON "RiskConfiguration"
FOR EACH ROW EXECUTE FUNCTION governance_history_is_append_only();
CREATE TRIGGER reassessment_append_only BEFORE UPDATE OR DELETE ON "Reassessment"
FOR EACH ROW EXECUTE FUNCTION governance_history_is_append_only();
