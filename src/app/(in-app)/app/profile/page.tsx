"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, User } from "lucide-react";

import { useUser } from "@/shared/hooks/use-current-user";
import {
  profileUpdateSchema,
  ProfileUpdateValues,
} from "@/shared/lib/validations/profile.schema";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { BlobUploader } from "@/shared/ui/blob-uploader";

export default function ProfilePage() {
  const { user, isLoading, mutate } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const form = useForm<ProfileUpdateValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: user?.name || "",
      image: user?.image || null,
    },
  });

  // Update form when user data loads
  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        image: user.image || null,
      });
      setAvatarUrl(user.image || "");
    }
  }, [user, form]);

  const handleAvatarUpload = async (fileUrls: string[]) => {
    if (fileUrls.length > 0) {
      const uploadedUrl = fileUrls[0];
      setAvatarUrl(uploadedUrl);
      form.setValue("image", uploadedUrl);
    }
  };

  const onSubmit = async (data: ProfileUpdateValues) => {
    try {
      setIsSubmitting(true);

      const response = await fetch("/api/app/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao atualizar perfil");
      }

      // Update the user data in SWR cache
      await mutate();

      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(
        error instanceof Error ? error.message : "Falha ao atualizar perfil"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const displayAvatarUrl = avatarUrl || user?.image || "";
  const userInitials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações do Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações de perfil e avatar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Perfil</CardTitle>
          <CardDescription>
            Atualize suas informações pessoais e foto de perfil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex flex-col gap-4">
                <FormLabel>Foto de Perfil</FormLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      src={displayAvatarUrl}
                      alt={user?.name || "Profile"}
                    />
                    <AvatarFallback className="text-lg">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <BlobUploader
                      apiEndpoint="/api/app/me/upload-avatar"
                      onUpload={handleAvatarUpload}
                      accept="image/*"
                      maxSize={5 * 1024 * 1024} // 5MB
                      buttonText="Alterar Avatar"
                      buttonVariant="outline"
                      buttonSize="sm"
                      className="w-fit"
                    />
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG ou GIF. Tamanho máximo 5MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite seu nome completo"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <FormLabel>Endereço de Email</FormLabel>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado. Entre em contato com o suporte se necessário.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <User className="mr-2 h-4 w-4" />
                      Atualizar Perfil
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Account Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
          <CardDescription>
            Detalhes da sua conta e informações de assinatura.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Membro desde</span>
            <span className="text-sm text-muted-foreground">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "N/A"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">ID da Conta</span>
            <span className="text-sm text-muted-foreground font-mono">
              {user?.id || "N/A"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
