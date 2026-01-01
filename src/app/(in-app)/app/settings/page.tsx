"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Palette,
  Download,
  Trash2,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import { TelegramConnectionCard } from "@/components/telegram/TelegramConnectionCard";
import { MembersManagement } from "@/components/settings/members-management";
import { useTutorial } from "@/components/tutorial/tutorial-provider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [showOnboardingConfirm, setShowOnboardingConfirm] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    billReminders: true,
    weeklyReport: true,
  });
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const { startTutorial } = useTutorial();
  const router = useRouter();

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
    // Start the initial-setup tutorial flow
    startTutorial("initial-setup");
    toast.info("Tutorial iniciado! Siga os passos para revisar sua configuração.");
    router.push("/app/accounts");
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
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  A
                </div>
                <div className="flex-1">
                  <Button variant="outline" size="sm">
                    Alterar foto
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" placeholder="Seu nome" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button>Salvar alterações</Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Notificações</CardTitle>
              </div>
              <CardDescription>
                Configure como deseja receber alertas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba atualizações importantes por email
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, email: checked }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações push</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba alertas em tempo real no navegador
                  </p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, push: checked }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Lembretes de contas</Label>
                  <p className="text-sm text-muted-foreground">
                    Aviso antes do vencimento de faturas
                  </p>
                </div>
                <Switch
                  checked={notifications.billReminders}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, billReminders: checked }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatório semanal</Label>
                  <p className="text-sm text-muted-foreground">
                    Resumo das suas finanças toda segunda-feira
                  </p>
                </div>
                <Switch
                  checked={notifications.weeklyReport}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, weeklyReport: checked }))
                  }
                />
              </div>
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
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tema escuro</Label>
                  <p className="text-sm text-muted-foreground">
                    Alterne entre modo claro e escuro
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                  />
                  <Moon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Segurança</CardTitle>
              </div>
              <CardDescription>
                Proteja sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alterar senha</p>
                  <p className="text-sm text-muted-foreground">
                    Última alteração há 3 meses
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Alterar
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Autenticação de dois fatores</p>
                  <p className="text-sm text-muted-foreground">
                    Adicione uma camada extra de segurança
                  </p>
                </div>
                <Badge variant="secondary">Desativado</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sessões ativas</p>
                  <p className="text-sm text-muted-foreground">
                    Gerencie dispositivos conectados
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Ver todas
                </Button>
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
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
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
                <Button variant="destructive" size="sm">
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

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acesso rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => router.push("/app/accounts")}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Gerenciar contas</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-between"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span>Aplicativo mobile</span>
                </div>
                <Badge variant="secondary" className="ml-2">Em breve</Badge>
              </Button>
              <Separator className="my-2" />
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => setShowOnboardingConfirm(true)}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  <span>Refazer configuração inicial</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

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

          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Suporte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                📚 Central de ajuda
              </Button>
              <Button variant="outline" className="w-full justify-start">
                💬 Fale conosco
              </Button>
              <Button variant="outline" className="w-full justify-start">
                🐛 Reportar bug
              </Button>
            </CardContent>
          </Card>

          {/* Logout */}
          <Button variant="outline" className="w-full text-destructive hover:text-destructive">
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
    </div>
  );
}
