"use client";

import { useState } from "react";
import { Plus, Inbox, Wallet, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/molecules/page-header";
import { EmptyState } from "@/shared/molecules/empty-state";
import { LoadingState } from "@/shared/molecules/loading-state";
import { SummaryCard } from "@/shared/molecules/summary-card";
import { ResponsiveButton } from "@/shared/molecules/responsive-button";
import { FrequencySelector, type IncomeFrequency } from "@/shared/molecules/frequency-selector";
import { WeekdaySelector } from "@/shared/molecules/weekday-selector";
import { BehaviorSelector, type BehaviorType } from "@/shared/molecules/behavior-selector";
import { DayOfMonthInput } from "@/shared/molecules/day-of-month-input";
import { DeleteConfirmDialog } from "@/shared/molecules/delete-confirm-dialog";
import { PageHeading, Showcase } from "../_components/showcase";

export default function MoleculesPage() {
  const [frequency, setFrequency] = useState<IncomeFrequency>("monthly");
  const [weekday, setWeekday] = useState<number | null>(1);
  const [behavior, setBehavior] = useState<BehaviorType>("refill_up");
  const [day, setDay] = useState<number | undefined>(15);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="space-y-8">
      <PageHeading
        title="Molecules"
        description="Componentes compostos com regras de negócio leves em src/shared/molecules."
      />

      <Showcase title="PageHeader">
        <PageHeader
          title="Minhas categorias"
          description="Gerencie suas categorias de gastos."
          actions={
            <Button>
              <Plus /> Nova categoria
            </Button>
          }
        />
      </Showcase>

      <Showcase title="SummaryCard">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SummaryCard
            icon={<Wallet className="size-4" />}
            label="Saldo total"
            value="R$ 12.480,00"
            valueColor="positive"
          />
          <SummaryCard
            icon={<Wallet className="size-4" />}
            label="Gastos do mês"
            value="R$ 3.210,90"
            valueColor="negative"
            subtitle="Atualizado agora"
          />
          <SummaryCard
            icon={<Wallet className="size-4" />}
            label="Investido"
            value="R$ 5.000,00"
          />
        </div>
      </Showcase>

      <Showcase title="EmptyState">
        <EmptyState
          icon={<Inbox className="size-5 text-muted-foreground" />}
          title="Sem dados ainda"
          description="Quando algo for criado, vai aparecer aqui."
          action={{ label: "Criar agora", onClick: () => toast("Criar") }}
        />
      </Showcase>

      <Showcase title="LoadingState">
        <LoadingState height="160px" text="Carregando..." />
      </Showcase>

      <Showcase title="ResponsiveButton" description="Full width no mobile, auto width no desktop.">
        <ResponsiveButton icon={<Plus />} onClick={() => toast("Clicado")}>
          Nova transação
        </ResponsiveButton>
      </Showcase>

      <Showcase title="FrequencySelector">
        <div className="max-w-xs">
          <FrequencySelector value={frequency} onChange={setFrequency} />
          <p className="mt-2 text-xs text-muted-foreground">
            Valor: <code className="font-mono">{frequency}</code>
          </p>
        </div>
      </Showcase>

      <Showcase title="WeekdaySelector">
        <WeekdaySelector value={weekday} onChange={setWeekday} />
      </Showcase>

      <Showcase title="BehaviorSelector">
        <BehaviorSelector value={behavior} onChange={setBehavior} />
      </Showcase>

      <Showcase title="DayOfMonthInput">
        <div className="max-w-xs">
          <DayOfMonthInput value={day} onChange={setDay} />
        </div>
      </Showcase>

      <Showcase title="DeleteConfirmDialog">
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 /> Excluir item
        </Button>
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Excluir item?"
          description="Esta ação não pode ser desfeita."
          onConfirm={() => {
            toast.success("Item excluído");
          }}
        />
      </Showcase>
    </div>
  );
}
