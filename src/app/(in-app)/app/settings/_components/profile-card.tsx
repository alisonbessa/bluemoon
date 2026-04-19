"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { MeResponse } from "@/app/api/app/me/types";

interface ProfileCardProps {
  user: MeResponse["user"] | undefined;
  isUserLoading: boolean;
  mutateUser: () => void;
}

export function ProfileCard({ user, isUserLoading, mutateUser }: ProfileCardProps) {
  const [displayName, setDisplayName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      const firstName = user.name?.split(" ")[0] || "";
      setDisplayName(user.displayName || firstName);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error("Digite um nome");
      return;
    }

    setIsSavingProfile(true);
    try {
      const response = await fetch("/api/app/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      if (response.ok) {
        mutateUser();
        toast.success("Perfil atualizado!");
      } else {
        toast.error("Erro ao atualizar perfil");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const getInitials = () => {
    const source = user?.displayName || user?.name;
    if (source) {
      const parts = source.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      if (parts[0]) {
        return parts[0].slice(0, 2).toUpperCase();
      }
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Perfil</CardTitle>
        </div>
        <CardDescription>
          Suas informações pessoais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isUserLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 shrink-0">
                <AvatarImage src={user?.image || undefined} alt={user?.name || "Usuário"} />
                <AvatarFallback className="text-2xl font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.name}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="displayName">Apelido</Label>
              <Input
                id="displayName"
                placeholder="Como você quer ser chamado?"
                value={displayName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Este nome será usado no app ao invés do seu nome completo
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar alterações"
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
