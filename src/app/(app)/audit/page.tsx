"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ClipboardList } from "lucide-react";

import { ApiError } from "@/core/api/client";
import { listAuditLogs, type AuditLogEntry } from "@/core/api/audit";
import { listMembers, type OrganizationMember } from "@/core/api/rbac";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { Button, Card, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

const PAGE_SIZE = 20;

export default function AuditPage() {
  const t = useTranslations("administration.audit");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();

  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    if (!currentOrganization) return;
    setLoading(true);
    setDenied(false);
    try {
      const [page, membersList] = await Promise.all([
        listAuditLogs(currentOrganization.id, { limit: PAGE_SIZE, offset }),
        listMembers(currentOrganization.id).catch(() => []),
      ]);
      setRows(page.data);
      setTotal(page.meta.total);
      setMembers(membersList);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setDenied(true);
      } else {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, offset]);

  useEffect(() => {
    load();
  }, [load]);

  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function actorName(userId: string): string {
    return members.find((m) => m.userId === userId)?.fullName ?? userId;
  }

  if (loading) {
    return <PageSpinner label={tCommon("states.loading")} />;
  }

  return (
    <div>
      <h1 className="text-h1 font-bold text-text">{t("title")}</h1>
      <p className="mt-1 text-body-md text-text-muted">{t("subtitle")}</p>

      {denied ? (
        <div className="mt-6">
          <EmptyState icon={ClipboardList} title={t("noAccess")} />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={ClipboardList} title={t("empty")} />
        </div>
      ) : (
        <>
          <Card className="mt-6" padding="none">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("columns.actor")}</TableHeaderCell>
                  <TableHeaderCell>{t("columns.action")}</TableHeaderCell>
                  <TableHeaderCell>{t("columns.summary")}</TableHeaderCell>
                  <TableHeaderCell>{t("columns.date")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{actorName(row.actorUserId)}</TableCell>
                    <TableCell className="font-mono text-caption text-text-muted">{row.action}</TableCell>
                    <TableCell>{row.summary}</TableCell>
                    <TableCell className="font-mono tabular-nums">{formatDateTime(row.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-caption text-text-muted">{total}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                {t("previous")}
              </Button>
              <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
                {t("next")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
