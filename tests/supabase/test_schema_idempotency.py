"""
Tests for SUPABASE_SCHEMA_V1_FULL.sql idempotency and correctness.

These tests validate the structure and idempotency patterns in the schema script
without requiring a live database connection.

For live database testing, use the SQL verification queries in the schema script
or run the test_schema_live.sql file in Supabase SQL Editor.
"""

import os
import re
import pytest

SCHEMA_FILE = os.path.join(
    os.path.dirname(__file__),
    "..",
    "..",
    "supabase",
    "SUPABASE_SCHEMA_V1_FULL.sql"
)


class TestSchemaFileExists:
    """Test that the schema file exists and is readable."""

    def test_schema_file_exists(self):
        """Schema file should exist at the expected path."""
        assert os.path.exists(SCHEMA_FILE), f"Schema file not found at {SCHEMA_FILE}"

    def test_schema_file_not_empty(self):
        """Schema file should not be empty."""
        with open(SCHEMA_FILE, "r") as f:
            content = f.read()
        assert len(content) > 1000, "Schema file appears to be too small"


class TestSchemaIdempotencyPatterns:
    """Test that the schema uses idempotent patterns."""

    @pytest.fixture
    def schema_content(self):
        """Load schema file content."""
        with open(SCHEMA_FILE, "r") as f:
            return f.read()

    def test_uses_create_extension_if_not_exists(self, schema_content):
        """Extensions should use IF NOT EXISTS."""
        extension_creates = re.findall(r"CREATE EXTENSION[^;]+;", schema_content, re.IGNORECASE)
        for ext in extension_creates:
            assert "IF NOT EXISTS" in ext.upper(), f"Extension creation missing IF NOT EXISTS: {ext[:50]}..."

    def test_uses_create_table_if_not_exists(self, schema_content):
        """Tables should use IF NOT EXISTS."""
        table_creates = re.findall(r"CREATE TABLE[^(]+\(", schema_content, re.IGNORECASE)
        for table in table_creates:
            assert "IF NOT EXISTS" in table.upper(), f"Table creation missing IF NOT EXISTS: {table[:50]}..."

    def test_uses_create_index_if_not_exists(self, schema_content):
        """Indexes should use IF NOT EXISTS."""
        index_creates = re.findall(r"CREATE INDEX[^;]+;", schema_content, re.IGNORECASE)
        for idx in index_creates:
            if "DO $$" not in schema_content[:schema_content.find(idx)]:
                assert "IF NOT EXISTS" in idx.upper(), f"Index creation missing IF NOT EXISTS: {idx[:50]}..."

    def test_uses_add_column_if_not_exists(self, schema_content):
        """ALTER TABLE ADD COLUMN should use IF NOT EXISTS."""
        add_columns = re.findall(r"ADD COLUMN[^;,]+", schema_content, re.IGNORECASE)
        for col in add_columns:
            assert "IF NOT EXISTS" in col.upper(), f"ADD COLUMN missing IF NOT EXISTS: {col[:50]}..."

    def test_drops_triggers_before_creating(self, schema_content):
        """Triggers should be dropped before creating to avoid duplicates."""
        trigger_creates = re.findall(r"CREATE TRIGGER\s+(\w+)", schema_content, re.IGNORECASE)
        for trigger_name in trigger_creates:
            drop_pattern = f"DROP TRIGGER IF EXISTS {trigger_name}"
            assert drop_pattern.lower() in schema_content.lower(), \
                f"Trigger {trigger_name} should be dropped before creating"

    def test_drops_policies_before_creating(self, schema_content):
        """RLS policies should be dropped before creating to avoid duplicates."""
        policy_creates = re.findall(r'CREATE POLICY\s+"([^"]+)"', schema_content, re.IGNORECASE)
        for policy_name in policy_creates:
            drop_pattern = f'DROP POLICY IF EXISTS "{policy_name}"'
            assert drop_pattern in schema_content, \
                f"Policy {policy_name} should be dropped before creating"


class TestSchemaRequiredObjects:
    """Test that the schema creates all required objects."""

    @pytest.fixture
    def schema_content(self):
        """Load schema file content."""
        with open(SCHEMA_FILE, "r") as f:
            return f.read()

    def test_creates_required_extensions(self, schema_content):
        """Schema should create required extensions."""
        required_extensions = ["uuid-ossp", "pg_trgm", "vector"]
        for ext in required_extensions:
            assert ext in schema_content, f"Missing extension: {ext}"

    def test_creates_required_tables(self, schema_content):
        """Schema should create all required tables."""
        required_tables = [
            "tenants",
            "users",
            "memory_events",
            "journal_entries",
            "climate_profiles",
            "climate_missions"
        ]
        for table in required_tables:
            pattern = f"CREATE TABLE IF NOT EXISTS {table}"
            assert pattern in schema_content, f"Missing table: {table}"

    def test_creates_required_enums(self, schema_content):
        """Schema should create required enum types."""
        required_enums = [
            "memory_type",
            "journal_category",
            "profile_type",
            "mission_status",
            "user_role"
        ]
        for enum in required_enums:
            assert enum in schema_content, f"Missing enum type: {enum}"

    def test_creates_search_function(self, schema_content):
        """Schema should create the search_memories_by_embedding function."""
        assert "search_memories_by_embedding" in schema_content
        assert "CREATE OR REPLACE FUNCTION search_memories_by_embedding" in schema_content

    def test_drops_duplicate_search_functions(self, schema_content):
        """Schema should drop all duplicate search_memories_by_embedding functions."""
        assert "DROP FUNCTION IF EXISTS" in schema_content
        assert "proname = 'search_memories_by_embedding'" in schema_content


class TestSchemaFunctionSignature:
    """Test that the search function has the correct signature."""

    @pytest.fixture
    def schema_content(self):
        """Load schema file content."""
        with open(SCHEMA_FILE, "r") as f:
            return f.read()

    def test_function_has_correct_parameters(self, schema_content):
        """search_memories_by_embedding should have the expected parameters."""
        expected_params = [
            "query_embedding vector(1536)",
            "match_threshold float",
            "match_count int",
            "filter_agent text",
            "filter_tenant_id uuid"
        ]
        for param in expected_params:
            assert param in schema_content, f"Missing function parameter: {param}"

    def test_function_returns_correct_columns(self, schema_content):
        """search_memories_by_embedding should return expected columns."""
        expected_columns = [
            "id uuid",
            "agent varchar(50)",
            "memory_type memory_type",
            "content text",
            "tenant_id uuid",
            "similarity float"
        ]
        for col in expected_columns:
            assert col in schema_content, f"Missing return column: {col}"


class TestSchemaTenantColumns:
    """Test that tenant_id columns are properly added to all tables."""

    @pytest.fixture
    def schema_content(self):
        """Load schema file content."""
        with open(SCHEMA_FILE, "r") as f:
            return f.read()

    def test_memory_events_has_tenant_id(self, schema_content):
        """memory_events should have tenant_id column."""
        assert "memory_events ADD COLUMN IF NOT EXISTS tenant_id" in schema_content

    def test_journal_entries_has_tenant_id(self, schema_content):
        """journal_entries should have tenant_id column."""
        assert "journal_entries ADD COLUMN IF NOT EXISTS tenant_id" in schema_content

    def test_climate_profiles_has_tenant_id(self, schema_content):
        """climate_profiles should have tenant_id column."""
        assert "climate_profiles ADD COLUMN IF NOT EXISTS tenant_id" in schema_content

    def test_climate_missions_has_tenant_id(self, schema_content):
        """climate_missions should have tenant_id column."""
        assert "climate_missions ADD COLUMN IF NOT EXISTS tenant_id" in schema_content


class TestSchemaVerification:
    """Test that the schema includes verification logic."""

    @pytest.fixture
    def schema_content(self):
        """Load schema file content."""
        with open(SCHEMA_FILE, "r") as f:
            return f.read()

    def test_includes_verification_block(self, schema_content):
        """Schema should include a verification block."""
        assert "VERIFY SCHEMA" in schema_content.upper() or "Schema Verification" in schema_content

    def test_checks_table_count(self, schema_content):
        """Schema verification should check table count."""
        assert "table_count" in schema_content.lower() or "COUNT(*)" in schema_content

    def test_checks_function_count(self, schema_content):
        """Schema verification should check function count."""
        assert "function_count" in schema_content.lower() or "pg_proc" in schema_content
