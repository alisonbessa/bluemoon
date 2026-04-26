"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Pagination } from "@/shared/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { PageHeading, Showcase } from "../_components/showcase";

const rows = [
  { id: 1, name: "Ana Souza", email: "ana@email.com", role: "Admin", status: "Ativo" },
  { id: 2, name: "Bruno Lima", email: "bruno@email.com", role: "Membro", status: "Ativo" },
  { id: 3, name: "Carla Dias", email: "carla@email.com", role: "Visualizador", status: "Inativo" },
  { id: 4, name: "Diego Reis", email: "diego@email.com", role: "Membro", status: "Ativo" },
];

export default function DataPage() {
  const [page, setPage] = useState(1);

  return (
    <div className="space-y-8">
      <PageHeading
        title="Data display"
        description="Tabelas, paginação, abas, accordions e cards."
      />

      <Showcase title="Card">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Card simples</CardTitle>
              <CardDescription>Uma descrição breve.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Conteúdo do card. Use para agrupar informações relacionadas.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Com badge</CardTitle>
              <CardDescription>Status visual.</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge>Novo</Badge>
            </CardContent>
          </Card>
        </div>
      </Showcase>

      <Showcase title="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">{r.email}</TableCell>
                <TableCell>{r.role}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "Ativo" ? "default" : "secondary"}>
                    {r.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Showcase>

      <Showcase title="Pagination">
        <Pagination page={page} pageSize={10} total={47} onPageChange={setPage} />
      </Showcase>

      <Showcase title="Tabs">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="activity">Atividade</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-3 text-sm">
            Conteúdo da visão geral.
          </TabsContent>
          <TabsContent value="activity" className="mt-3 text-sm">
            Lista de atividades recentes.
          </TabsContent>
          <TabsContent value="settings" className="mt-3 text-sm">
            Configurações do usuário.
          </TabsContent>
        </Tabs>
      </Showcase>

      <Showcase title="Accordion">
        <Accordion type="single" collapsible>
          <AccordionItem value="a">
            <AccordionTrigger>É acessível?</AccordionTrigger>
            <AccordionContent>
              Sim. Adere às boas práticas WAI-ARIA.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger>Pode customizar?</AccordionTrigger>
            <AccordionContent>
              Sim, via classes Tailwind nos triggers e content.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="c">
            <AccordionTrigger>É animado?</AccordionTrigger>
            <AccordionContent>
              Sim, com keyframes accordion-up/down do tw-animate-css.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Showcase>
    </div>
  );
}
