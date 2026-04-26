"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { PageHeading, Showcase } from "../_components/showcase";

const schema = z.object({
  name: z.string().min(2, "Mínimo de 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "member", "viewer"], {
    required_error: "Selecione um papel",
  }),
  bio: z.string().max(160, "Máximo de 160 caracteres").optional(),
  terms: z.literal(true, {
    errorMap: () => ({ message: "Você deve aceitar os termos" }),
  }),
});

type FormValues = z.infer<typeof schema>;

export default function FormsPage() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      role: undefined,
      bio: "",
      terms: false as unknown as true,
    },
    mode: "onBlur",
  });

  const onSubmit = (values: FormValues) => {
    toast.success("Formulário enviado", {
      description: JSON.stringify(values, null, 2),
    });
  };

  return (
    <div className="space-y-8">
      <PageHeading
        title="Forms"
        description="Padrão react-hook-form + Zod com componentes Form/FormField/FormControl."
      />

      <Showcase title="Formulário completo" description="Validação no blur, mensagens via FormMessage.">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid max-w-xl gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Nome</FormLabel>
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
                  <FormLabel required>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="voce@email.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Não compartilharemos seu email.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Papel</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um papel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Membro</SelectItem>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Conte um pouco sobre você..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel>Aceito os termos de uso</FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button type="submit">Enviar</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
              >
                Resetar
              </Button>
            </div>
          </form>
        </Form>
      </Showcase>
    </div>
  );
}
