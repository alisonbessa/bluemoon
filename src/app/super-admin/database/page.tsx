"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { Database, AlertTriangle, Trash2, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { toast } from "sonner";

const CONFIRMATION_CODE = "RESET_ALL_DATA";

const TABLES_TO_DELETE = [
  { name: "transactions", description: "All financial transactions" },
  { name: "monthly_allocations", description: "Category budget allocations" },
  { name: "monthly_income_allocations", description: "Income allocations" },
  { name: "monthly_budget_status", description: "Monthly status tracking" },
  { name: "recurring_bills", description: "Recurring bill definitions" },
  { name: "income_sources", description: "Income source definitions" },
  { name: "goals", description: "Savings goals" },
  { name: "categories", description: "Budget categories" },
  { name: "financial_accounts", description: "Bank accounts and credit cards" },
  { name: "budget_members", description: "Budget membership" },
  { name: "invites", description: "Pending invitations" },
  { name: "budgets", description: "Budget definitions" },
  { name: "groups", description: "Category groups" },
  { name: "telegram_users", description: "Telegram connections" },
  { name: "telegram_ai_logs", description: "AI conversation logs" },
  { name: "telegram_pending_connections", description: "Pending Telegram links" },
  { name: "access_links", description: "Lifetime/Beta access links" },
];

const USER_TABLES = [
  { name: "users", description: "User accounts" },
  { name: "credits", description: "User credit balances" },
  { name: "credit_transactions", description: "Credit transaction history" },
  { name: "coupons", description: "Lifetime deal coupons" },
  { name: "sessions", description: "Active sessions" },
  { name: "accounts", description: "OAuth accounts" },
  { name: "verification_tokens", description: "Email verification tokens" },
];

const TABLES_ALWAYS_PRESERVED = [
  { name: "plans", description: "Subscription plans" },
  { name: "contact_messages", description: "Contact form messages" },
  { name: "waitlist", description: "Waitlist entries" },
];

export default function DatabasePage() {
  const [confirmation, setConfirmation] = useState("");
  const [includeUsers, setIncludeUsers] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (confirmation !== CONFIRMATION_CODE) {
      toast.error("Invalid confirmation code");
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch("/api/super-admin/database/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationCode: confirmation, includeUsers }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset database");
      }

      toast.success(
        includeUsers
          ? "Full database reset completed (including users)"
          : "Database reset completed (users preserved)"
      );
      setConfirmation("");
      setIncludeUsers(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset database");
      console.error(error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Database className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">Database Management</h1>
          <p className="text-muted-foreground">
            Manage and reset application data
          </p>
        </div>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Danger Zone</AlertTitle>
        <AlertDescription>
          Operations on this page are destructive and cannot be undone.
          Make sure you have a backup before proceeding.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Tables always deleted */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Always Deleted
            </CardTitle>
            <CardDescription>
              HiveBudget data (budgets, transactions, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm max-h-64 overflow-y-auto">
              {TABLES_TO_DELETE.map((table) => (
                <li key={table.name} className="flex justify-between gap-2">
                  <code className="bg-destructive/10 px-1 rounded text-destructive text-xs">
                    {table.name}
                  </code>
                  <span className="text-muted-foreground text-xs truncate">{table.description}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* User tables (optional) */}
        <Card className={includeUsers ? "border-destructive" : ""}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${includeUsers ? "text-destructive" : "text-amber-600"}`}>
              <Users className="h-5 w-5" />
              User Data {includeUsers ? "(Will Delete)" : "(Optional)"}
            </CardTitle>
            <CardDescription>
              {includeUsers ? "Will be deleted with checkbox enabled" : "Enable checkbox to also delete users"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {USER_TABLES.map((table) => (
                <li key={table.name} className="flex justify-between gap-2">
                  <code className={`px-1 rounded text-xs ${includeUsers ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"}`}>
                    {table.name}
                  </code>
                  <span className="text-muted-foreground text-xs truncate">{table.description}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Tables always preserved */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Database className="h-5 w-5" />
              Always Preserved
            </CardTitle>
            <CardDescription>
              System config (plans, waitlist, messages)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {TABLES_ALWAYS_PRESERVED.map((table) => (
                <li key={table.name} className="flex justify-between gap-2">
                  <code className="bg-green-500/10 px-1 rounded text-green-600 text-xs">
                    {table.name}
                  </code>
                  <span className="text-muted-foreground text-xs truncate">{table.description}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Reset Form */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Reset All Data</CardTitle>
          <CardDescription>
            This will delete all HiveBudget data including budgets, transactions,
            categories, accounts, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Include Users Checkbox */}
          <div className="flex items-start space-x-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <Checkbox
              id="includeUsers"
              checked={includeUsers}
              onCheckedChange={(checked) => setIncludeUsers(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="includeUsers"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Also delete user accounts
              </Label>
              <p className="text-xs text-muted-foreground">
                This will remove all users, credits, coupons, and sessions.
                Only plans and system config will remain.
              </p>
            </div>
          </div>

          {/* Confirmation Code */}
          <div>
            <p className="text-sm font-medium mb-2">
              To confirm, type <code className="bg-muted px-1 rounded">{CONFIRMATION_CODE}</code> below:
            </p>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRMATION_CODE}
              className="max-w-md font-mono"
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 sm:flex-row sm:items-center">
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={isResetting || confirmation !== CONFIRMATION_CODE}
            className="w-full sm:w-auto"
          >
            {isResetting ? (
              <>Resetting...</>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {includeUsers ? "Reset Everything" : "Reset Database"}
              </>
            )}
          </Button>
          {includeUsers && (
            <span className="text-xs text-destructive">
              Warning: This will delete ALL users!
            </span>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
