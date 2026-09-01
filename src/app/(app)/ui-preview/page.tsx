"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Kpi,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
  Textarea,
  Tooltip,
} from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

const toneOrder = ["neutral", "primary", "secondary", "success", "warning", "error", "info"] as const;
const severityOrder = ["critical", "major", "minor", "ok", "maintenance", "pending", "idle"] as const;

/** Page de démonstration interne (guide de style vivant), pas une page
 * métier livrée aux utilisateurs finaux — le contenu illustratif ci-dessous
 * est volontairement exempté de la règle i18n stricte (voir
 * docs/frontend-foundations.md, [DÉCIDÉ]) ; les composants qu'elle
 * assemble n'ont eux aucun texte en dur. */
export default function UiPreviewPage() {
  const t = useTranslations("common");
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectValue, setSelectValue] = useState("liter");

  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <PageHeader
        eyebrow="Design system"
        title="Aperçu des composants"
        description="Vitrine des primitives shared/ui — vérification manuelle des tokens, de l'i18n et de l'accessibilité clavier."
      />

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Stations actives" value="128" trend={{ direction: "up", value: "+4 ce mois" }} />
        <Kpi label="Cuves surveillées" value="342" trend={{ direction: "flat", value: "stable" }} />
        <Kpi label="Alertes critiques" value="3" trend={{ direction: "down", value: "-2" }} />
        <Kpi label="Livraisons du jour" value="17" />
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
      </section>

      <section className="flex flex-wrap gap-2">
        {toneOrder.map((tone) => (
          <Badge key={tone} tone={tone} dot>
            {tone}
          </Badge>
        ))}
      </section>
      <section className="flex flex-wrap gap-2">
        {severityOrder.map((tone) => (
          <Badge key={tone} tone={tone}>
            {tone}
          </Badge>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Alert tone="success" title="Succès">
          Enregistrement effectué.
        </Alert>
        <Alert tone="warning" title="Attention">
          Niveau de cuve bas.
        </Alert>
        <Alert tone="error" title="Erreur">
          Échec de synchronisation.
        </Alert>
        <Alert tone="info" title="Info">
          Nouvelle version disponible.
        </Alert>
      </section>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Formulaire</CardTitle>
            <CardDescription>Input, Select, Textarea, Checkbox, FormField</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField label="Nom de la station" hint="Nom affiché aux opérateurs">
            {(fieldProps) => <Input {...fieldProps} placeholder="Station Nord" />}
          </FormField>
          <FormField label="Champ en erreur" error="Ce champ est requis">
            {(fieldProps) => <Input {...fieldProps} invalid />}
          </FormField>
          <FormField label="Unité de mesure">
            {() => (
              <Select
                aria-label="Unité de mesure"
                value={selectValue}
                onValueChange={setSelectValue}
                options={[
                  { value: "liter", label: "Litres" },
                  { value: "gallon", label: "Gallons" },
                  { value: "m3", label: "Mètres cubes" },
                ]}
              />
            )}
          </FormField>
          <FormField label="Commentaire">
            {(fieldProps) => <Textarea {...fieldProps} placeholder="Optionnel" />}
          </FormField>
          <Checkbox label="Notifier par email" defaultChecked />
        </CardContent>
      </Card>

      <section className="flex flex-wrap items-center gap-6">
        <Avatar name="Rémy N." size="lg" />
        <Tooltip content="Astuce contextuelle">
          <Button variant="outline">Survoler pour un tooltip</Button>
        </Tooltip>
        <Button onClick={() => setModalOpen(true)}>Ouvrir une modale</Button>
      </section>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Confirmer l'action"
        description="Action de démonstration, sans effet réel."
        closeLabel={t("actions.close")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              {t("actions.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => setModalOpen(false)}>
              {t("actions.confirm")}
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-text-muted">
          Modale accessible (Radix Dialog) : fermeture au clavier (Échap), focus trap, aria-modal.
        </p>
      </Modal>

      <Tabs
        items={[
          { value: "apercu", label: "Vue d’ensemble", content: <p className="text-body-sm text-text-muted">Contenu de l’onglet Vue d’ensemble.</p> },
          { value: "historique", label: "Historique", content: <p className="text-body-sm text-text-muted">Contenu de l’onglet Historique.</p> },
        ]}
      />

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Station</TableHeaderCell>
            <TableHeaderCell>Statut</TableHeaderCell>
            <TableHeaderCell className="text-right">Niveau</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow clickable>
            <TableCell>Station Nord</TableCell>
            <TableCell>
              <Badge tone="ok">OK</Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">82%</TableCell>
          </TableRow>
          <TableRow clickable>
            <TableCell>Station Sud</TableCell>
            <TableCell>
              <Badge tone="critical">Critique</Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">8%</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Pagination
        currentPage={page}
        totalPages={9}
        onPageChange={setPage}
        labels={{
          label: t("pagination.label"),
          previous: t("pagination.previous"),
          next: t("pagination.next"),
          page: (p) => t("pagination.page", { page: p }),
        }}
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-body-sm font-medium text-text">Skeleton</p>
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div>
          <p className="mb-2 text-body-sm font-medium text-text">Spinner</p>
          <PageSpinner label={t("states.loading")} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <EmptyState title="Aucune station" description="Ajoutez une première station pour commencer." actionLabel="Ajouter" onAction={() => {}} />
        <ErrorState title="Échec du chargement" description="Vérifiez votre connexion." retryLabel={t("actions.retry")} onRetry={() => {}} />
      </section>
    </div>
  );
}
