"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui/accordion";
import Link from "next/link";

interface FAQItem {
  question: string;
  answer: string;
}

interface WebsiteFAQsProps {
  items: FAQItem[];
  title?: string;
  description?: React.ReactNode;
}

export function WebsiteFAQs({
  items,
  title = "Perguntas Frequentes",
  description = (
    <>
      Não encontrou o que procura?{" "}
      <Link
        href="/contact"
        className="font-medium text-primary hover:underline"
      >
        Entre em contato
      </Link>{" "}
      para suporte.
    </>
  ),
}: WebsiteFAQsProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <aside className="py-16 sm:py-24 bg-muted/40" aria-label={title}>
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>
          {description && (
            <p className="mt-4 text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="mx-auto mt-12 max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {items.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-lg">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </aside>
  );
}
