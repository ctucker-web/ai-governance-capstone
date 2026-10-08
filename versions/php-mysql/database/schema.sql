CREATE TABLE IF NOT EXISTS governance_organizations (
 id CHAR(36) PRIMARY KEY, name VARCHAR(160) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS governance_users (
 id CHAR(36) PRIMARY KEY, organization_id CHAR(36) NOT NULL, name VARCHAR(160) NOT NULL,
 roles LONGTEXT NOT NULL, FOREIGN KEY (organization_id) REFERENCES governance_organizations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS governance_cases (
 id CHAR(36) PRIMARY KEY, organization_id CHAR(36) NOT NULL, requester_id CHAR(36) NOT NULL,
 revision INT NOT NULL DEFAULT 0, status VARCHAR(32) NOT NULL, payload LONGTEXT NOT NULL,
 updated_at DATETIME(6) NOT NULL, INDEX organization_status(organization_id,status),
 FOREIGN KEY (organization_id) REFERENCES governance_organizations(id),
 FOREIGN KEY (requester_id) REFERENCES governance_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS governance_policies (
 id CHAR(36) PRIMARY KEY, organization_id CHAR(36) NOT NULL, version INT NOT NULL,
 settings LONGTEXT NOT NULL, routing LONGTEXT NOT NULL, created_at DATETIME(6) NOT NULL,
 UNIQUE KEY organization_version(organization_id,version),
 FOREIGN KEY (organization_id) REFERENCES governance_organizations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS governance_audit (
 sequence_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, id CHAR(36) NOT NULL UNIQUE,
 organization_id CHAR(36) NOT NULL, use_case_id CHAR(36) NULL, actor_id CHAR(36) NOT NULL,
 payload LONGTEXT NOT NULL, previous_hash CHAR(64) NOT NULL, event_hash CHAR(64) NOT NULL,
 INDEX record_events(use_case_id,sequence_id), FOREIGN KEY (organization_id) REFERENCES governance_organizations(id),
 FOREIGN KEY (actor_id) REFERENCES governance_users(id), FOREIGN KEY (use_case_id) REFERENCES governance_cases(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS governance_snapshots (
 id CHAR(36) PRIMARY KEY, use_case_id CHAR(36) NOT NULL, kind VARCHAR(24) NOT NULL,
 version INT NOT NULL, payload LONGTEXT NOT NULL, created_at DATETIME(6) NOT NULL,
 UNIQUE KEY record_kind_version(use_case_id,kind,version),
 FOREIGN KEY (use_case_id) REFERENCES governance_cases(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
