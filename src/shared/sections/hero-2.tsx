import { Star, Heart, MessageCircle, ArrowRight } from "lucide-react";
import React from "react";
import Link from "next/link";

import { Avatar, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { appConfig } from "@/shared/lib/config";

const Hero2 = () => {
  return (
    <section className="py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mx-auto flex max-w-(--breakpoint-lg) flex-col gap-6">
          <Badge variant="secondary" className="mx-auto w-fit">
            {appConfig.waitlistMode ? "Beta Gratuito" : "Feito para casais"}
          </Badge>
          <h1 className="text-3xl font-extrabold lg:text-6xl">
            Organize o dinheiro do casal{" "}
            <span className="text-primary">sem planilha e sem estresse</span>
          </h1>
          <p className="text-balance text-muted-foreground lg:text-lg max-w-2xl mx-auto">
            Planejem juntos, registrem gastos por mensagem e saibam exatamente
            para onde vai cada real. Simples assim.
          </p>
        </div>

        <div className="mx-auto mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Heart className="size-4 text-primary" />
            <span>Feito para casais</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="size-4 text-primary" />
            <span>Registre por mensagem</span>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Button size="lg" asChild>
            <Link href={appConfig.waitlistMode ? "/beta" : "#pricing"}>
              Começar Grátis
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#como-funciona">
              Como Funciona
            </Link>
          </Button>
        </div>
        {appConfig.waitlistMode && (
          <p className="mt-3 text-sm text-muted-foreground">
            Sem cartão de crédito. Sem compromisso. Gratuito durante o beta.
          </p>
        )}

        <div className="mx-auto mt-10 flex w-fit flex-col items-center gap-4 sm:flex-row">
          <span className="mx-4 inline-flex items-center -space-x-4">
            <Avatar className="size-14 border bg-white">
              <AvatarImage
                src="https://api.dicebear.com/9.x/lorelei/svg?seed=Maria"
                alt="Maria"
              />
            </Avatar>
            <Avatar className="size-14 border bg-white">
              <AvatarImage
                src="https://api.dicebear.com/9.x/lorelei/svg?seed=João"
                alt="João"
              />
            </Avatar>
            <Avatar className="size-14 border bg-white">
              <AvatarImage
                src="https://api.dicebear.com/9.x/lorelei/svg?seed=Ana"
                alt="Ana"
              />
            </Avatar>
            <Avatar className="size-14 border bg-white">
              <AvatarImage
                src="https://api.dicebear.com/9.x/lorelei/svg?seed=Carlos"
                alt="Carlos"
              />
            </Avatar>
            <Avatar className="size-14 border bg-white">
              <AvatarImage
                src="https://api.dicebear.com/9.x/lorelei/svg?seed=Lúcia"
                alt="Lúcia"
              />
            </Avatar>
          </span>
          <div>
            <div className="flex items-center gap-1">
              <Star className="size-5 fill-yellow-400 text-yellow-400" />
              <Star className="size-5 fill-yellow-400 text-yellow-400" />
              <Star className="size-5 fill-yellow-400 text-yellow-400" />
              <Star className="size-5 fill-yellow-400 text-yellow-400" />
              <Star className="size-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">5.0</span>
            </div>
            <p className="text-left font-medium text-muted-foreground">
              de casais que já organizaram suas finanças
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero2;
