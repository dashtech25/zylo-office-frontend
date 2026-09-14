"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ClipboardList } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { ApiError } from "@/core/api/client";
import { listAuditLogs, type AuditLogEntry } from "@/core/api/audit";
import { listMembers, type OrganizationMember } from "@/core/api/rbac";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { Button, Card, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableRowSkeleton } from "@/shared/ui";

const PAGE_SIZE = 20;

interface AuditPageData {
  rows: AuditLogEntry[];
  total: number;
  members: OrganizationMember[];
}

async function fetchAuditPage(organizationId: string, offset: number): Promise<AuditPageData> {
  const [page, membersList] = await Promise.all([
    listAuditLogs(organizationId, { limit: PAGE_SIZE, offset }),
    listMembers(organizationId).catch(() => []),
  ]);
  return { rows: page.data, total: page.meta.total, members: membersList };
}

export default function AuditPage() {
  const t = useTranslations("administration.audit");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id ?? null;

  const [offset, setOffset] = useState(0);

  // Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
  // une page déjà visitée s'affiche instantanément au lieu d'un rechargement
  // complet ; un 403 (accès refusé) est un état applicatif normal, pas une
  // erreur à propager à la boundary React.
  const auditQuery = useQuery({
    queryKey: ["audit", "logs", organizationId, offset],
    queryFn: () => fetchAuditPage(organizationId as string, offset),
    enabled: !!organizationId,
    throwOnError: (err) => !(err instanceof ApiError && err.status === 403),
  });

  const rows = auditQuery.data?.rows ?? [];
  const total = auditQuery.data?.total ?? 0;
  const members = auditQuery.data?.members ?? [];
  const loading = !!organizationId && auditQuery.isPending;
  const denied = auditQuery.error instanceof ApiError && auditQuery.error.status === 403;

  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function actorName(userId: string): string {
    return members.find((m) => m.userId === userId)?.fullName ?? userId;
  }

  return (
    <div>
      <h1 className="text-h1 font-bold text-text">{t("title")}</h1>
      <p className="mt-1 text-body-md text-text-muted">{t("subtitle")}</p>

      {loading ? (
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
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={4} />
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : denied ? (
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
