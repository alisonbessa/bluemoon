"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { OnboardingFooter } from "../onboarding-footer";
import { HouseholdData } from "../hooks/use-onboarding";

interface StepMemberNamesProps {
  household: HouseholdData;
  onUpdatePartnerName: (name: string) => void;
  onUpdateKids: (names: string[]) => void;
  onUpdateTeens: (names: string[]) => void;
  onUpdateOtherAdults: (names: string[]) => void;
  onUpdatePets: (names: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function NameList({
  label,
  icon,
  names,
  onUpdate,
  placeholder,
}: {
  label: string;
  icon: string;
  names: string[];
  onUpdate: (names: string[]) => void;
  placeholder: string;
}) {
  const addName = () => {
    onUpdate([...names, ""]);
  };

  const removeName = (index: number) => {
    onUpdate(names.filter((_, i) => i !== index));
  };

  const updateName = (index: number, value: string) => {
    const newNames = [...names];
    newNames[index] = value;
    onUpdate(newNames);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <Label className="font-medium">{label}</Label>
      </div>
      {names.map((name, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => updateName(index, e.target.value)}
            placeholder={`${placeholder} ${index + 1}`}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeName(index)}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addName}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar {label.toLowerCase()}
      </Button>
    </div>
  );
}

export function StepMemberNames({
  household,
  onUpdatePartnerName,
  onUpdateKids,
  onUpdateTeens,
  onUpdateOtherAdults,
  onUpdatePets,
  onNext,
  onBack,
}: StepMemberNamesProps) {
  const hasAnyContent =
    household.hasPartner ||
    household.kids.length > 0 ||
    household.teens.length > 0 ||
    household.otherAdults.length > 0 ||
    household.pets.length > 0;

  const isValid = () => {
    if (household.hasPartner && !household.partnerName.trim()) return false;
    if (household.kids.some((k) => !k.trim())) return false;
    if (household.teens.some((t) => !t.trim())) return false;
    if (household.otherAdults.some((a) => !a.trim())) return false;
    if (household.pets.some((p) => !p.trim())) return false;
    return true;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-4 overflow-y-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Qual o nome de cada pessoa?
          </h2>
          <p className="text-muted-foreground">
            Isso nos ajuda a personalizar seu orcamento
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-6">
          {household.hasPartner && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💑</span>
                <Label className="font-medium">Parceiro(a)</Label>
              </div>
              <Input
                value={household.partnerName}
                onChange={(e) => onUpdatePartnerName(e.target.value)}
                placeholder="Nome do(a) parceiro(a)"
              />
            </div>
          )}

          {household.kids.length > 0 && (
            <NameList
              label="Filhos(as)"
              icon="👶"
              names={household.kids}
              onUpdate={onUpdateKids}
              placeholder="Nome do(a) filho(a)"
            />
          )}

          {household.teens.length > 0 && (
            <NameList
              label="Adolescentes"
              icon="🧑"
              names={household.teens}
              onUpdate={onUpdateTeens}
              placeholder="Nome do adolescente"
            />
          )}

          {household.otherAdults.length > 0 && (
            <NameList
              label="Outros adultos"
              icon="👨‍👩‍👧"
              names={household.otherAdults}
              onUpdate={onUpdateOtherAdults}
              placeholder="Nome do adulto"
            />
          )}

          {household.pets.length > 0 && (
            <NameList
              label="Pets"
              icon="🐕"
              names={household.pets}
              onUpdate={onUpdatePets}
              placeholder="Nome do pet"
            />
          )}

          {!hasAnyContent && (
            <p className="text-center text-muted-foreground">
              Nenhum membro adicional selecionado.
            </p>
          )}
        </div>
      </div>

      <OnboardingFooter
        onNext={onNext}
        onBack={onBack}
        nextDisabled={!isValid()}
      />
    </div>
  );
}
