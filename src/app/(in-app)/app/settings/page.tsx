"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { Badge } from "@/shared/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
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
import {
  User,
  Palette,
  Download,
  Trash2,
  LogOut,
  Moon,
  Sun,
  Monitor,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { TelegramConnectionCard } from "@/integrations/telegram/TelegramConnectionCard";
import { MembersManagement } from "@/shared/settings/members-management";
import { useTutorial } from "@/shared/tutorial/tutorial-provider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUser } from "@/shared/hooks/use-current-user";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";

export default function SettingsPage() {
  const { user, isLoading: isUserLoading, mutate: mutateUser } = useUser();
  const { theme, setTheme } = useTheme();
  const [showOnboardingConfirm, setShowOnboardingConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { startTutorial } = useTutorial();
  const router = useRouter();

  // Load user's display name
  useEffect(() => {
    if (user) {
      // Use displayName if set, otherwise use first name from Google
      const firstName = user.name?.split(" ")[0] || "";
      setDisplayName(user.displayName || firstName);
    }
  }, [user]);

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const response = await fetch("/api/app/budgets");
        if (response.ok) {
          const data = await response.json();
          if (data.budgets?.length > 0) {
            setBudgetId(data.budgets[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching budgets:", error);
      }
    };
    fetchBudgets();
  }, []);

  const handleRestartOnboarding = () => {
    setShowOnboardingConfirm(false);
    startTutorial("initial-setup");
    toast.info("Tutorial iniciado! Siga os passos para revisar sua configuração.");
    router.push("/app/accounts");
  };

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

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/app/me", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Conta excluída. Até logo!");
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

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e configurações da conta
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Settings */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile */}
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
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user?.image || undefined} alt={user?.name || "Usuário"} />
                      <AvatarFallback className="text-2xl font-bold">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Apelido</Label>
                    <Input
                      id="displayName"
                      placeholder="Como você quer ser chamado?"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este nome será usado no app ao invés do seu nome completo
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

          {/* Appearance */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Aparência</CardTitle>
              </div>
              <CardDescription>
                Personalize a interface do aplicativo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label>Tema</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="mr-2 h-4 w-4" />
                    Claro
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="mr-2 h-4 w-4" />
                    Escuro
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setTheme("system")}
                  >
                    <Monitor className="mr-2 h-4 w-4" />
                    Sistema
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Dados</CardTitle>
              </div>
              <CardDescription>
                Exporte ou exclua seus dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Exportar dados</p>
                  <p className="text-sm text-muted-foreground">
                    Baixe todas as suas transações em CSV
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar
                    </>
                  )}
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-destructive">Excluir conta</p>
                  <p className="text-sm text-muted-foreground">
                    Remove permanentemente todos os seus dados
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Members Management */}
          {budgetId && <MembersManagement budgetId={budgetId} />}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Telegram Connection */}
          <TelegramConnectionCard />

          {/* Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Seu plano</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Plano Gratuito</span>
                  <Badge>Ativo</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Funcionalidades básicas para controle financeiro pessoal
                </p>
                <Button className="w-full" variant="outline">
                  Ver planos premium
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Restart Onboarding */}
          <Card>
            <CardContent className="pt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowOnboardingConfirm(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refazer configuração inicial
              </Button>
            </CardContent>
          </Card>

          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Suporte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                Central de ajuda
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Fale conosco
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Reportar bug
              </Button>
            </CardContent>
          </Card>

          {/* Logout */}
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair da conta
          </Button>
        </div>
      </div>

      {/* Onboarding Confirmation Dialog */}
      <AlertDialog open={showOnboardingConfirm} onOpenChange={setShowOnboardingConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refazer configuração inicial?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso permitirá que você reconfigure suas categorias, contas e fontes de renda.
              Os dados existentes serão mantidos, mas novas categorias podem ser adicionadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestartOnboarding}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir sua conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os seus dados, incluindo transações,
              contas, categorias e orçamentos serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir minha conta"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
