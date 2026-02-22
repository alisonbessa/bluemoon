"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/shared/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { appConfig } from "@/shared/lib/config";
import { Mail, MapPin, Phone } from "lucide-react";
import { WebPageJsonLd } from "next-seo";
import Link from "next/link";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Por favor, insira um email válido.",
  }),
  company: z.string().optional(),
  message: z.string().min(10, {
    message: "A mensagem deve ter pelo menos 10 caracteres.",
  }),
});

type ContactFormValues = z.infer<typeof formSchema>;

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      message: "",
    },
  });

  async function onSubmit(values: ContactFormValues) {
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to submit form");
      }

      toast.success("Obrigado pela sua mensagem! Responderemos em breve.");
      form.reset();
    } catch {
      toast.error("Algo deu errado. Por favor, tente novamente mais tarde.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <WebPageJsonLd
        useAppDir
        id={`${process.env.NEXT_PUBLIC_APP_URL}/contact`}
        title="Fale Conosco"
        description="Entre em contato conosco. Adoraríamos ouvir você."
        isAccessibleForFree={true}
        publisher={{
          "@type": "Organization",
          name: appConfig.projectName,
          url: process.env.NEXT_PUBLIC_APP_URL,
          contactPoint: {
            "@type": "ContactPoint",
            telephone: appConfig.legal.phone,
            email: appConfig.legal.email,
            contactType: "customer service",
          },
        }}
      />
      <section className="relative w-full overflow-hidden bg-linear-to-br from-primary via-primary/90 to-primary py-20 text-primary-foreground">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff33_1px,transparent_1px),linear-gradient(to_bottom,#ffffff33_1px,transparent_1px)] bg-size-[14px_14px]" />
          <div className="absolute inset-0 bg-linear-to-br from-primary/50 via-transparent to-primary/50" />
        </div>
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <h1 className="text-3xl font-bold md:text-5xl">Fale Conosco</h1>
            <p className="text-xl text-primary-foreground/90">
              Tem alguma dúvida? Adoraríamos ouvir você. Envie uma mensagem
              e responderemos o mais rápido possível.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-6xl gap-16 md:grid-cols-2">
            <div className="space-y-12">
              <div>
                <h2 className="mb-6 text-2xl font-bold">Informações de Contato</h2>
                <p className="mb-8 text-muted-foreground">
                  Preencha o formulário e nossa equipe retornará em até 24 horas.
                </p>
              </div>

              <div className="space-y-8">
                {[
                  {
                    icon: Phone,
                    title: "Telefone",
                    details: [appConfig.legal.phone],
                  },
                  {
                    icon: Mail,
                    title: "Email",
                    details: [appConfig.legal.email],
                  },
                  {
                    icon: MapPin,
                    title: "Endereço",
                    details: [
                      appConfig.projectName,
                      appConfig.legal.address.street,
                      `${appConfig.legal.address.city}, ${appConfig.legal.address.state}`,
                      `${appConfig.legal.address.postalCode}, ${appConfig.legal.address.country}`,
                    ],
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <item.icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-1 text-lg font-semibold">
                        {item.title}
                      </h3>
                      {item.details.map((detail, j) => (
                        <p key={j} className="text-muted-foreground">
                          {detail}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-8 shadow-lg">
              <h2 className="mb-6 text-2xl font-bold">Envie uma Mensagem</h2>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empresa (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Sua empresa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Como podemos ajudar..."
                            className="min-h-[120px] resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Enviando..." : "Enviar Mensagem"}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Ao enviar, você concorda com o tratamento dos seus dados conforme nossa{" "}
                    <Link href="/privacy" className="text-primary hover:underline">
                      Política de Privacidade
                    </Link>. Seus dados serão utilizados exclusivamente para responder sua mensagem.
                  </p>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
