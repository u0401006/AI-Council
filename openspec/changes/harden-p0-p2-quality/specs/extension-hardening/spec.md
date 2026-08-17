## ADDED Requirements

### Requirement: Repository secret hygiene
The repository SHALL NOT track files stored under secret or credential directories.

#### Scenario: Secret files exist locally
- **WHEN** a developer stores local credentials under `temp-secret/`
- **THEN** Git SHALL ignore the files and SHALL NOT include them in the index

### Requirement: Least-privilege website access
The extension SHALL request arbitrary website access only when a user invokes a feature requiring that access.

#### Scenario: Extension is installed
- **WHEN** the extension is installed but page capture has not been invoked
- **THEN** arbitrary website access SHALL NOT be a required host permission

### Requirement: Stable model result identity
Council failures and peer-review rankings SHALL remain associated with their originating model independent of filtering or sorting.

#### Scenario: Non-adjacent models fail
- **WHEN** multiple non-adjacent Council requests reject
- **THEN** each failure SHALL report the correct model identifier

#### Scenario: Reviewer returns reordered ranks
- **WHEN** review rankings are returned in an order different from Council responses
- **THEN** aggregation SHALL score the explicit ranked model identifiers

### Requirement: Safe generated content rendering
Generated Markdown and Content Script notifications SHALL NOT create executable markup or unsafe navigation targets.

#### Scenario: Generated Markdown contains an unsafe link
- **WHEN** model output contains a `javascript:`, `data:`, or other non-allowlisted link
- **THEN** the rendered link SHALL use a non-executable fallback target

### Requirement: Local API credential storage
API credentials SHALL be stored in local extension storage and old synchronized credentials SHALL be migrated and removed.

#### Scenario: Existing synchronized credentials are found
- **WHEN** the updated extension loads settings
- **THEN** credentials SHALL be copied to local storage and removed from synchronized storage

### Requirement: Automated regression verification
The repository SHALL provide automated tests for model mapping, peer-review aggregation, and safe URL handling.

#### Scenario: Developer runs the test command
- **WHEN** `npm test` is executed
- **THEN** all regression tests SHALL run without requiring Chrome or external network access
