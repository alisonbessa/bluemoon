"use client";

import { useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { OnboardingFooter } from "../onboarding-footer";
import { HouseholdData } from "../hooks/use-onboarding";

interface StepMemberNamesProps {
  household: HouseholdData;
  onUpdatePartnerName: (name: string) => void;
  onUpdateChildren: (names: string[]) => void;
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
  onEnterLastInput,
}: {
  label: string;
  icon: string;
  names: string[];
  onUpdate: (names: string[]) => void;
  placeholder: string;
  onEnterLastInput?: () => void;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addName = () => {
    onUpdate([...names, ""]);
    setTimeout(() => {
      inputRefs.current[names.length]?.focus();
    }, 0);
  };

  const removeName = (index: number) => {
    onUpdate(names.filter((_, i) => i !== index));
  };

  const updateName = (index: number, value: string) => {
    const newNames = [...names];
    newNames[index] = value;
    onUpdate(newNames);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index < names.length - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        onEnterLastInput?.();
      }
    }
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
            ref={(el) => { inputRefs.current[index] = el; }}
            value={name}
            onChange={(e) => updateName(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
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
  onUpdateChildren,
  onUpdateOtherAdults,
  onUpdatePets,
  onNext,
  onBack,
}: StepMemberNamesProps) {
  const partnerInputRef = useRef<HTMLInputElement>(null);
  const childrenListRef = useRef<{ focusFirst: () => void }>(null);
  const adultsListRef = useRef<{ focusFirst: () => void }>(null);
  const petsListRef = useRef<{ focusFirst: () => void }>(null);

  const hasAnyContent =
    household.hasPartner ||
    household.children.length > 0 ||
    household.otherAdults.length > 0 ||
    household.pets.length > 0;

  const isValid = useCallback(() => {
    if (household.hasPartner && !household.partnerName.trim()) return false;
    if (household.children.some((c) => !c.trim())) return false;
    if (household.otherAdults.some((a) => !a.trim())) return false;
    if (household.pets.some((p) => !p.trim())) return false;
    return true;
  }, [household]);

  const handlePartnerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (household.children.length > 0) {
        childrenListRef.current?.focusFirst();
      } else if (household.otherAdults.length > 0) {
        adultsListRef.current?.focusFirst();
      } else if (household.pets.length > 0) {
        petsListRef.current?.focusFirst();
      } else if (isValid()) {
        onNext();
      }
    }
  };

  const handleChildrenComplete = () => {
    if (household.otherAdults.length > 0) {
      adultsListRef.current?.focusFirst();
    } else if (household.pets.length > 0) {
      petsListRef.current?.focusFirst();
    } else if (isValid()) {
      onNext();
    }
  };

  const handleAdultsComplete = () => {
    if (household.pets.length > 0) {
      petsListRef.current?.focusFirst();
    } else if (isValid()) {
      onNext();
    }
  };

  const handlePetsComplete = () => {
    if (isValid()) {
      onNext();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-4 overflow-y-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Qual o nome de cada pessoa?
          </h2>
          <p className="text-muted-foreground">
            Isso nos ajuda a personalizar seu orçamento
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
                ref={partnerInputRef}
                value={household.partnerName}
                onChange={(e) => onUpdatePartnerName(e.target.value)}
                onKeyDown={handlePartnerKeyDown}
                placeholder="Nome do(a) parceiro(a)"
              />
            </div>
          )}

          {household.children.length > 0 && (
            <NameList
              label="Filhos"
              icon="👶"
              names={household.children}
              onUpdate={onUpdateChildren}
              placeholder="Nome do filho(a)"
              onEnterLastInput={handleChildrenComplete}
            />
          )}

          {household.otherAdults.length > 0 && (
            <NameList
              label="Outros adultos"
              icon="👨‍👩‍👧"
              names={household.otherAdults}
              onUpdate={onUpdateOtherAdults}
              placeholder="Nome do adulto"
              onEnterLastInput={handleAdultsComplete}
            />
          )}

          {household.pets.length > 0 && (
            <NameList
              label="Pets"
              icon="🐕"
              names={household.pets}
              onUpdate={onUpdatePets}
              placeholder="Nome do pet"
              onEnterLastInput={handlePetsComplete}
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
