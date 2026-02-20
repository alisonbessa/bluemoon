"use client";

import Link from "next/link";
import { appConfig } from "@/shared/lib/config";
import { ThemeSwitcher } from "@/shared/theme-switcher";
import { Twitter, Instagram, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-12">
          {/* Marca e Descrição */}
          <div className="sm:col-span-2 md:col-span-2 lg:col-span-3">
            <Link href="/" className="text-lg font-semibold">
              {appConfig.projectName}
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              {appConfig.description}
            </p>
          </div>

          {/* Links do Produto */}
          <div className="sm:col-span-1 md:col-span-1 lg:col-span-2">
            <h3 className="text-sm font-semibold">Produto</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link
                  href="/#features"
                  className="text-muted-foreground hover:text-primary"
                >
                  Funcionalidades
                </Link>
              </li>
              <li>
                <Link
                  href="/#pricing"
                  className="text-muted-foreground hover:text-primary"
                >
                  Preços
                </Link>
              </li>
            </ul>
          </div>

          {/* Links da Empresa */}
          <div className="sm:col-span-1 md:col-span-1 lg:col-span-2">
            <h3 className="text-sm font-semibold">Empresa</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-primary"
                >
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-muted-foreground hover:text-primary"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-primary"
                >
                  Contato
                </Link>
              </li>
            </ul>
          </div>

          {/* Links de Recursos */}
          <div className="sm:col-span-1 md:col-span-1 lg:col-span-2">
            <h3 className="text-sm font-semibold">Recursos</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-primary"
                >
                  Suporte
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="text-muted-foreground hover:text-primary"
                >
                  Perguntas Frequentes
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Legais */}
          <div className="sm:col-span-1 md:col-span-1 lg:col-span-2">
            <h3 className="text-sm font-semibold">Legal</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-primary"
                >
                  Privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-primary"
                >
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link
                  href="/cookie"
                  className="text-muted-foreground hover:text-primary"
                >
                  Cookies
                </Link>
              </li>
              <li>
                <Link
                  href="/refund"
                  className="text-muted-foreground hover:text-primary"
                >
                  Reembolso
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Sociais */}
          <div className="sm:col-span-1 md:col-span-1 lg:col-span-1">
            <h3 className="text-sm font-semibold">Social</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {appConfig.social.twitter && (
                <li>
                  <a
                    href={appConfig.social.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary"
                  >
                    <Twitter className="h-4 w-4" />
                    <span>Twitter</span>
                  </a>
                </li>
              )}
              {appConfig.social.instagram && (
                <li>
                  <a
                    href={appConfig.social.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary"
                  >
                    <Instagram className="h-4 w-4" />
                    <span>Instagram</span>
                  </a>
                </li>
              )}
              {appConfig.social.youtube && (
                <li>
                  <a
                    href={appConfig.social.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary"
                  >
                    <Youtube className="h-4 w-4" />
                    <span>Youtube</span>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Seção Inferior */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 text-center sm:flex-row sm:text-left">
          <p className="text-sm text-muted-foreground">
            Copyright © {new Date().getFullYear()} {appConfig.projectName}
          </p>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
