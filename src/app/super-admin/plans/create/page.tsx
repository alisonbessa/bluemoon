"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";

// Schema simplificado para HiveBudget
const createPlanSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  codename: z
    .string()
    .min(1, "Codename é obrigatório")
    .regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
  monthlyPriceReais: z
    .number()
    .min(0, "Preço deve ser positivo")
    .transform((v) => Math.round(v * 100)), // Converte para centavos
  yearlyPriceReais: z
    .number()
    .min(0, "Preço deve ser positivo")
    .transform((v) => Math.round(v * 100)), // Converte para centavos
  maxBudgetMembers: z.number().min(1, "Mínimo 1 membro").max(10, "Máximo 10 membros"),
});

type CreatePlanFormValues = z.input<typeof createPlanSchema>;

export default function CreatePlanPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreatePlanFormValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      name: "",
      codename: "",
      monthlyPriceReais: 0,
      yearlyPriceReais: 0,
      maxBudgetMembers: 1,
    },
  });

  const handleSubmit = async (data: CreatePlanFormValues) => {
    setIsSubmitting(true);
    try {
      // Transform to API format
      const apiData = {
        name: data.name,
        codename: data.codename,
        default: false,
        hasMonthlyPricing: true,
        hasYearlyPricing: true,
        hasOnetimePricing: false,
        monthlyPrice: data.monthlyPriceReais, // já em centavos pelo transform
        yearlyPrice: data.yearlyPriceReais, // já em centavos pelo transform
        monthlyPriceAnchor: 0,
        yearlyPriceAnchor: 0,
        onetimePrice: 0,
        onetimePriceAnchor: 0,
        requiredCouponCount: null,
        monthlyStripePriceId: null,
        yearlyStripePriceId: null,
        onetimeStripePriceId: null,
        monthlyLemonSqueezyVariantId: null,
        yearlyLemonSqueezyVariantId: null,
        onetimeLemonSqueezyVariantId: null,
        monthlyDodoProductId: null,
        yearlyDodoProductId: null,
        onetimeDodoProductId: null,
        monthlyPaypalPlanId: null,
        yearlyPaypalPlanId: null,
        onetimePaypalPlanId: null,
        quotas: {
          maxBudgetMembers: data.maxBudgetMembers,
          premiumSupport: false,
          monthlyImages: 10,
        },
      };

      const response = await fetch("/api/super-admin/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        throw new Error("Failed to create plan");
      }

      router.push("/super-admin/plans");
    } catch (error) {
      console.error("Error creating plan:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/super-admin/plans">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Criar Plano</h1>
      </div>

      <div className="border rounded-lg p-6 max-w-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informações Básicas</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Plano</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Solo, Duo, Family" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codename"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codename</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: solo, duo, family" {...field} />
                    </FormControl>
                    <FormDescription>
                      Identificador único (letras minúsculas, números e hífens)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Preços</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="monthlyPriceReais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço Mensal (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="14.90"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearlyPriceReais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço Anual (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="139.90"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Quotas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Limites</h3>

              <FormField
                control={form.control}
                name="maxBudgetMembers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Máximo de Membros no Orçamento</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>
                      Solo = 1, Duo = 2, Family = mais
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Plano
              </Button>
              <Button variant="outline" asChild>
                <Link href="/super-admin/plans">Cancelar</Link>
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <div className="text-sm text-muted-foreground max-w-xl">
        <p>
          Após criar o plano, use o botão &quot;Sync to Stripe&quot; na página de edição
          para criar os produtos e preços automaticamente no Stripe.
        </p>
      </div>
    </div>
  );
}
