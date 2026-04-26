"use client";

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/shared/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/shared/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Settings, User, LogOut } from "lucide-react";
import { PageHeading, Showcase } from "../_components/showcase";

export default function OverlaysPage() {
  return (
    <div className="space-y-8">
      <PageHeading
        title="Overlays"
        description="Diálogos, painéis laterais, popovers e menus."
      />

      <Showcase title="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button>Abrir dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar perfil</DialogTitle>
              <DialogDescription>
                Faça mudanças no seu perfil. Clique em salvar quando terminar.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm">Conteúdo do dialog aqui.</p>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Showcase>

      <Showcase title="AlertDialog" description="Para confirmações destrutivas.">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Excluir conta</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os seus dados serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Showcase>

      <Showcase title="Sheet" description="Painel lateral; ideal para detalhes ou edição rápida.">
        <div className="flex flex-wrap gap-2">
          {(["right", "left", "top", "bottom"] as const).map((side) => (
            <Sheet key={side}>
              <SheetTrigger asChild>
                <Button variant="outline">{side}</Button>
              </SheetTrigger>
              <SheetContent side={side}>
                <SheetHeader>
                  <SheetTitle>Sheet ({side})</SheetTitle>
                  <SheetDescription>Conteúdo do painel aqui.</SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>
          ))}
        </div>
      </Showcase>

      <Showcase title="Drawer (vaul)" description="Bom para mobile; arrastável.">
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline">Abrir drawer</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Drawer</DrawerTitle>
              <DrawerDescription>Bottom sheet padrão.</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 text-sm">Conteúdo do drawer.</div>
            <DrawerFooter>
              <Button>Confirmar</Button>
              <DrawerClose asChild>
                <Button variant="outline">Fechar</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </Showcase>

      <Showcase title="Popover">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Abrir popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <p className="text-sm font-medium">Conteúdo flutuante</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use para configurações compactas, info adicional, etc.
            </p>
          </PopoverContent>
        </Popover>
      </Showcase>

      <Showcase title="Tooltip">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Hover em mim</Button>
          </TooltipTrigger>
          <TooltipContent>Tooltip de exemplo</TooltipContent>
        </Tooltip>
      </Showcase>

      <Showcase title="DropdownMenu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Settings /> Opções
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Conta</DropdownMenuLabel>
            <DropdownMenuItem>
              <User /> Perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings /> Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <LogOut /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Showcase>
    </div>
  );
}
