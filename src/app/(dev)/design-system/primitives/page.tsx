"use client";

import { useState } from "react";
import { Mail, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { Switch } from "@/shared/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Separator } from "@/shared/ui/separator";
import { Progress } from "@/shared/ui/progress";
import { Skeleton } from "@/shared/ui/skeleton";
import { PageHeading, Showcase } from "../_components/showcase";

export default function PrimitivesPage() {
  const [checked, setChecked] = useState(true);
  const [switchOn, setSwitchOn] = useState(true);

  return (
    <div className="space-y-8">
      <PageHeading
        title="Primitives"
        description="Componentes atômicos shadcn/ui em src/shared/ui."
      />

      <Showcase title="Button" description="Variants: default, secondary, outline, ghost, destructive, link.">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Adicionar">
              <Plus />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button>
              <Mail /> Com ícone
            </Button>
            <Button disabled>Disabled</Button>
            <Button variant="destructive">
              <Trash2 /> Excluir
            </Button>
          </div>
        </div>
      </Showcase>

      <Showcase title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Showcase>

      <Showcase title="Input" description="Tamanhos: sm, default, lg.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ds-input">Email</Label>
            <Input id="ds-input" type="email" placeholder="voce@email.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-input-sm">Pequeno</Label>
            <Input id="ds-input-sm" size="sm" placeholder="Pequeno" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-input-lg">Grande</Label>
            <Input id="ds-input-lg" size="lg" placeholder="Grande" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-input-invalid">Inválido</Label>
            <Input id="ds-input-invalid" aria-invalid placeholder="Erro" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-input-disabled">Desabilitado</Label>
            <Input id="ds-input-disabled" disabled placeholder="Disabled" />
          </div>
        </div>
      </Showcase>

      <Showcase title="Textarea">
        <div className="space-y-1.5">
          <Label htmlFor="ds-textarea">Descrição</Label>
          <Textarea id="ds-textarea" placeholder="Escreva algo..." rows={4} />
        </div>
      </Showcase>

      <Showcase title="Select">
        <div className="max-w-xs">
          <Label className="mb-1.5 block">País</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="br">Brasil</SelectItem>
              <SelectItem value="pt">Portugal</SelectItem>
              <SelectItem value="us">Estados Unidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Showcase>

      <Showcase title="Checkbox">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="ds-cb"
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
            />
            <Label htmlFor="ds-cb">Aceito os termos</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="ds-cb-disabled" disabled />
            <Label htmlFor="ds-cb-disabled">Desabilitado</Label>
          </div>
        </div>
      </Showcase>

      <Showcase title="Radio group">
        <RadioGroup defaultValue="b">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="a" id="ds-r-a" />
            <Label htmlFor="ds-r-a">Opção A</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="b" id="ds-r-b" />
            <Label htmlFor="ds-r-b">Opção B</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="c" id="ds-r-c" />
            <Label htmlFor="ds-r-c">Opção C</Label>
          </div>
        </RadioGroup>
      </Showcase>

      <Showcase title="Switch">
        <div className="flex items-center gap-2">
          <Switch
            id="ds-switch"
            checked={switchOn}
            onCheckedChange={setSwitchOn}
          />
          <Label htmlFor="ds-switch">{switchOn ? "Ligado" : "Desligado"}</Label>
        </div>
      </Showcase>

      <Showcase title="Avatar">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar>
            <AvatarFallback>AB</AvatarFallback>
          </Avatar>
          <Avatar className="size-12">
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <Avatar className="size-16">
            <AvatarFallback>MN</AvatarFallback>
          </Avatar>
        </div>
      </Showcase>

      <Showcase title="Separator">
        <div>
          <p className="text-sm">Acima</p>
          <Separator className="my-3" />
          <p className="text-sm">Abaixo</p>
        </div>
      </Showcase>

      <Showcase title="Progress">
        <div className="space-y-3">
          <Progress value={25} />
          <Progress value={60} />
          <Progress value={92} />
        </div>
      </Showcase>

      <Showcase title="Skeleton">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </Showcase>
    </div>
  );
}
