"use client";

import React, { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Separator } from "@/shared/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Download,
  Trash2,
  Loader2,
  FileDown,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import Link from "next/link";
import type { MeResponse } from "@/app/api/app/me/types";

interface DataPrivacyCardProps {
  user: MeResponse["user"] | undefined;
}

export function DataPrivacyCard({ user }: DataPrivacyCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingLgpd, setIsExportingLgpd] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [deleteAllData, setDeleteAllData] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/app/export");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hivebudget-export-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Dados exportados com sucesso!");
      } else {
        toast.error("Erro ao exportar dados");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Erro ao exportar dados");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportLgpdData = async () => {
    setIsExportingLgpd(true);
    try {
      const response = await fetch("/api/app/account/export");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hivebudget-dados-pessoais-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Dados pessoais exportados com sucesso!");
      } else {
        toast.error("Erro ao exportar dados pessoais");
      }
    } catch (error) {
      console.error("Error exporting LGPD data:", error);
      toast.error("Erro ao exportar dados pessoais");
    } finally {
      setIsExportingLgpd(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/app/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: deletionReason.trim() || undefined,
          deleteAllData,
        }),
      });

      if (response.ok) {
        toast.success(
          deleteAllData
            ? "Conta e dados excluídos permanentemente. Até logo!"
            : "Conta excluída. Até logo!"
        );
        await signOut({ callbackUrl: "/" });
      } else {
        toast.error("Erro ao excluir conta");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Erro ao excluir conta");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Dados e Privacidade</CardTitle>
          </div>
          <CardDescription>
            Seus direitos conforme a LGPD (Lei Geral de Proteção de Dados)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleExportData}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Exportar transações (CSV)
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleExportLgpdData}
            disabled={isExportingLgpd}
          >
            {isExportingLgpd ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Exportar todos os dados pessoais (LGPD)
              </>
            )}
          </Button>
          <Separator />
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
            Excluir minha conta
          </Button>
          <p className="text-xs text-muted-foreground">
            Ao solicitar exclusão, seus dados serão removidos em até 30 dias conforme nossa{" "}
            <Link href="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>.
          </p>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={(open: boolean) => {
        setShowDeleteConfirm(open);
        if (!open) {
          setDeletionReason("");
          setDeleteAllData(false);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir sua conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua conta será desativada imediatamente e todos os seus dados serão
              permanentemente excluídos em até 30 dias, conforme a LGPD.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="deletion-reason">Motivo da exclusão (opcional)</Label>
              <Textarea
                id="deletion-reason"
                placeholder="Nos ajude a melhorar: por que você está saindo?"
                value={deletionReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeletionReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="delete-all-data"
                checked={deleteAllData}
                onCheckedChange={(checked) => setDeleteAllData(checked === true)}
              />
              <div className="grid gap-1">
                <Label htmlFor="delete-all-data" className="text-sm font-medium leading-none cursor-pointer">
                  Apagar todos os meus dados permanentemente
                </Label>
                <p className="text-xs text-muted-foreground">
                  Seus orçamentos, transações, categorias e demais dados serão excluídos imediatamente e de forma irreversível. Caso contrário, os dados serão removidos em até 30 dias.
                </p>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir minha conta"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
