"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Plus, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GenerateModalProps {
  onSuccess: () => void;
}

type AccessLinkType = "lifetime" | "beta";

export function GenerateModal({ onSuccess }: GenerateModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<AccessLinkType>("lifetime");
  const [note, setNote] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      // Calculate expiresAt datetime if expiresInDays is set
      let expiresAt: string | undefined;
      if (expiresInDays) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + expiresInDays);
        expiresAt = expDate.toISOString();
      }

      const response = await fetch("/api/super-admin/access-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: quantity,
          type,
          note: note.trim() || undefined,
          expiresAt,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate links");
      }

      const data = await response.json();
      // Backend returns links array with link objects, extract codes
      const codes = data.links.map((link: { code: string }) => link.code);
      setGeneratedCodes(codes);
      toast.success(`${codes.length} link(s) gerado(s) com sucesso`);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar links");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (code: string, index: number) => {
    const redeemUrl = `${window.location.origin}/redeem/${code}`;
    await navigator.clipboard.writeText(redeemUrl);
    setCopiedIndex(index);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllToClipboard = async () => {
    const urls = generatedCodes.map(
      (code) => `${window.location.origin}/redeem/${code}`
    );
    await navigator.clipboard.writeText(urls.join("\n"));
    toast.success("Todos os links copiados!");
  };

  const handleClose = () => {
    setOpen(false);
    setGeneratedCodes([]);
    setQuantity(1);
    setType("lifetime");
    setNote("");
    setExpiresInDays(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Gerar Links
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerar Links de Acesso</DialogTitle>
          <DialogDescription>
            Crie links para acesso lifetime ou beta sem passar pelo Stripe.
          </DialogDescription>
        </DialogHeader>

        {generatedCodes.length === 0 ? (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={100}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={type} onValueChange={(v: AccessLinkType) => setType(v)}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                      <SelectItem value="beta">Beta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires">Expira em (dias)</Label>
                <Input
                  id="expires"
                  type="number"
                  min={1}
                  placeholder="Deixe vazio para nunca expirar"
                  value={expiresInDays ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setExpiresInDays(val ? parseInt(val) : null);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Nota (opcional)</Label>
                <Textarea
                  id="note"
                  placeholder="Ex: Campanha Black Friday 2024"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={isLoading} className="w-full sm:w-auto">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar {quantity} Link{quantity > 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {generatedCodes.length} link(s) gerado(s):
                </p>
                {generatedCodes.length > 1 && (
                  <Button variant="outline" size="sm" onClick={copyAllToClipboard}>
                    <Copy className="mr-2 h-3 w-3" />
                    Copiar Todos
                  </Button>
                )}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {generatedCodes.map((code, index) => (
                  <div
                    key={code}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <code className="text-sm font-mono">{code}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(code, index)}
                    >
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
