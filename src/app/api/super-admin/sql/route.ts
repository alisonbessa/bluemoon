import { NextRequest, NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("api:super-admin:sql");

const MAX_ROWS_RETURNED = 500;
const MAX_ROWS_AFFECTED = 200;

// Blacklisted keywords - these commands are never allowed
const BLACKLISTED_KEYWORDS = [
  "DROP",
  "TRUNCATE",
  "ALTER",
  "CREATE",
  "GRANT",
  "REVOKE",
  "VACUUM",
  "REINDEX",
  "CLUSTER",
  "COPY",
  "\\COPY",
  "REFRESH",
  "LOCK",
  "SET",
  "RESET",
  "COMMENT ON",
  "SECURITY",
];

// Detect the operation type from the query
function detectOperation(query: string): "SELECT" | "UPDATE" | "DELETE" | "INSERT" | "UNKNOWN" {
  const trimmed = query.trim().replace(/^--.*$/gm, "").trim();
  const firstWord = trimmed.split(/\s+/)[0]?.toUpperCase();
  if (firstWord === "SELECT" || firstWord === "WITH") return "SELECT";
  if (firstWord === "UPDATE") return "UPDATE";
  if (firstWord === "DELETE") return "DELETE";
  if (firstWord === "INSERT") return "INSERT";
  return "UNKNOWN";
}

// Validate the query for safety issues
function validateQuery(query: string): { valid: boolean; error?: string } {
  // Remove comments for validation
  const cleaned = query
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  if (!cleaned) {
    return { valid: false, error: "Query vazia" };
  }

  // Block multiple statements (simple check: no semicolons except at the very end)
  const withoutTrailingSemi = cleaned.replace(/;\s*$/, "");
  if (withoutTrailingSemi.includes(";")) {
    return {
      valid: false,
      error: "Multiplas statements não são permitidas. Execute uma query por vez.",
    };
  }

  // Check blacklisted keywords (word boundary to avoid false positives like "CREATEd_at")
  const upperCleaned = withoutTrailingSemi.toUpperCase();
  for (const keyword of BLACKLISTED_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword.replace(/\\/g, "\\\\")}\\b`, "i");
    if (regex.test(upperCleaned)) {
      return {
        valid: false,
        error: `Comando "${keyword}" não permitido por seguranca`,
      };
    }
  }

  const op = detectOperation(withoutTrailingSemi);
  if (op === "UNKNOWN") {
    return {
      valid: false,
      error: "Apenas SELECT, UPDATE, DELETE e INSERT são permitidos",
    };
  }

  // UPDATE and DELETE must have a WHERE clause
  if (op === "UPDATE" || op === "DELETE") {
    if (!/\bWHERE\b/i.test(withoutTrailingSemi)) {
      return {
        valid: false,
        error: `${op} exige clausula WHERE. Sem WHERE todas as linhas seriam afetadas.`,
      };
    }
  }

  return { valid: true };
}

// Convert UPDATE/DELETE query to a SELECT for preview
function buildPreviewQuery(query: string, op: "UPDATE" | "DELETE"): string {
  const cleaned = query.replace(/;\s*$/, "").trim();

  if (op === "DELETE") {
    // DELETE FROM <table> WHERE ... → SELECT * FROM <table> WHERE ...
    return cleaned.replace(/^\s*DELETE\s+FROM\b/i, "SELECT * FROM");
  }

  // UPDATE <table> SET ... WHERE ... → SELECT * FROM <table> WHERE ...
  // Use [\s\S] instead of . with s flag for compat
  const match = cleaned.match(/^\s*UPDATE\s+([^\s]+)\s+SET\s+[\s\S]+?\s+(WHERE\s+[\s\S]+)$/i);
  if (!match) return cleaned;
  return `SELECT * FROM ${match[1]} ${match[2]}`;
}

/**
 * POST /api/super-admin/sql
 *
 * Body:
 *   query: string - SQL query to run
 *   mode: "preview" | "execute"
 *
 * Safety:
 *   - Blocks DROP, TRUNCATE, ALTER, CREATE, etc.
 *   - UPDATE/DELETE require WHERE clause
 *   - Preview mode converts UPDATE/DELETE to SELECT for verification
 *   - Limits returned rows and affected rows
 */
export const POST = withSuperAdminAuthRequired(async (req: NextRequest, context) => {
  const { session } = context;
  const body = await req.json();
  const { query, mode } = body as { query: string; mode: "preview" | "execute" };

  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "Query obrigatoria" }, { status: 400 });
  }

  if (mode !== "preview" && mode !== "execute") {
    return NextResponse.json({ error: "Mode invalido" }, { status: 400 });
  }

  const validation = validateQuery(query);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const op = detectOperation(query);

  try {
    // SELECT: always execute directly
    if (op === "SELECT") {
      const result = await db.execute(sql.raw(query));
      const rows = result.rows.slice(0, MAX_ROWS_RETURNED);
      const truncated = result.rows.length > MAX_ROWS_RETURNED;
      logger.info(`SQL SELECT by ${session.user.email}`, { rowsReturned: rows.length });
      return NextResponse.json({
        operation: "SELECT",
        rows,
        rowCount: result.rows.length,
        truncated,
      });
    }

    // UPDATE/DELETE: preview mode runs a SELECT to show affected rows
    if (op === "UPDATE" || op === "DELETE") {
      const previewSql = buildPreviewQuery(query, op);
      const previewResult = await db.execute(sql.raw(previewSql));
      const affectedCount = previewResult.rows.length;

      if (mode === "preview") {
        logger.info(`SQL ${op} PREVIEW by ${session.user.email}`, { affectedCount });
        return NextResponse.json({
          operation: op,
          mode: "preview",
          affectedRows: previewResult.rows.slice(0, MAX_ROWS_RETURNED),
          affectedCount,
          truncated: affectedCount > MAX_ROWS_RETURNED,
          previewQuery: previewSql,
        });
      }

      // Execute mode
      if (affectedCount > MAX_ROWS_AFFECTED) {
        return NextResponse.json(
          {
            error: `Operação afetaria ${affectedCount} linhas. Limite e ${MAX_ROWS_AFFECTED}. Refine a query.`,
          },
          { status: 400 }
        );
      }

      const execResult = await db.execute(sql.raw(query));
      logger.warn(`SQL ${op} EXECUTED by ${session.user.email}`, {
        affectedCount,
        query: query.slice(0, 500),
      });
      return NextResponse.json({
        operation: op,
        mode: "execute",
        rowsAffected: execResult.rowCount ?? affectedCount,
        success: true,
      });
    }

    // INSERT: execute directly in execute mode, reject in preview
    if (op === "INSERT") {
      if (mode === "preview") {
        return NextResponse.json({
          operation: "INSERT",
          mode: "preview",
          message: "INSERT não tem preview. Revise a query manualmente antes de executar.",
        });
      }
      const result = await db.execute(sql.raw(query));
      logger.warn(`SQL INSERT EXECUTED by ${session.user.email}`, {
        rowsAffected: result.rowCount,
      });
      return NextResponse.json({
        operation: "INSERT",
        mode: "execute",
        rowsAffected: result.rowCount ?? 0,
        success: true,
      });
    }

    return NextResponse.json({ error: "Operação não suportada" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`SQL error for ${session.user.email}:`, error);
    return NextResponse.json(
      {
        error: `Erro ao executar: ${message}`,
      },
      { status: 500 }
    );
  }
});
