"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// Emoji categories matching the budget page
const EMOJI_CATEGORIES = {
  recent: {
    icon: "🕐",
    label: "Recentes",
    emojis: ["🛒", "🍽️", "⛽", "💡", "📱", "💳", "🏥", "🎬"],
  },
  food: {
    icon: "🍔",
    label: "Comida",
    emojis: ["🛒", "🍽️", "☕", "🥖", "🥩", "🍕", "🍔", "🍺", "🍷", "🍰", "🍦", "🥗", "🍜", "🍣", "🌮", "🥐"],
  },
  transport: {
    icon: "🚗",
    label: "Transporte",
    emojis: ["🚗", "⛽", "🚌", "🚇", "✈️", "🚕", "🏍️", "🚲", "🅿️", "🔧", "🚙", "🛵", "⚓", "🚁", "🚀", "🛻"],
  },
  home: {
    icon: "🏠",
    label: "Casa",
    emojis: ["🏠", "🏢", "💡", "💧", "🔥", "📶", "📱", "🧹", "🛋️", "🛏️", "🚿", "🪴", "🔑", "🏗️", "🪟", "🚪"],
  },
  health: {
    icon: "💪",
    label: "Saúde",
    emojis: ["💪", "🏥", "💊", "🦷", "🧠", "🏃", "🧘", "🥗", "💉", "🩺", "🩹", "👓", "🧴", "💅", "💇", "🧖"],
  },
  entertainment: {
    icon: "🎬",
    label: "Lazer",
    emojis: ["🎬", "📺", "🎵", "🎮", "📚", "🎭", "🎨", "🎪", "✈️", "🏨", "🏖️", "⛷️", "🎢", "🎡", "🎯", "🎲"],
  },
  money: {
    icon: "💰",
    label: "Dinheiro",
    emojis: ["💰", "💳", "🏦", "📈", "💵", "🧾", "🛡️", "❤️", "💎", "🪙", "📊", "💸", "🎁", "🏆", "⭐", "🎖️"],
  },
  other: {
    icon: "📦",
    label: "Outros",
    emojis: ["📌", "👕", "👟", "🐕", "🐱", "👶", "🧸", "📖", "✏️", "💼", "💻", "📦", "🔔", "⚙️", "🎓", "🌍"],
  },
};

// 10 curated colors that work well together
const COLOR_OPTIONS = [
  { value: "#8b5cf6", name: "Violeta" },
  { value: "#ec4899", name: "Rosa" },
  { value: "#ef4444", name: "Vermelho" },
  { value: "#f97316", name: "Laranja" },
  { value: "#eab308", name: "Amarelo" },
  { value: "#22c55e", name: "Verde" },
  { value: "#14b8a6", name: "Teal" },
  { value: "#06b6d4", name: "Ciano" },
  { value: "#3b82f6", name: "Azul" },
  { value: "#6366f1", name: "Indigo" },
];

type CategoryKey = keyof typeof EMOJI_CATEGORIES;

interface IconPickerProps {
  icon: string;
  onIconChange: (icon: string) => void;
  className?: string;
}

/**
 * Icon picker with tabbed categories (same style as budget page)
 */
export function IconPicker({
  icon,
  onIconChange,
  className,
}: IconPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("recent");

  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        Ícone {icon && <span className="ml-2 text-lg">{icon}</span>}
      </Label>

      {/* Category Tabs */}
      <div className="flex gap-1 border-b pb-1">
        {Object.entries(EMOJI_CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedCategory(key as CategoryKey)}
            className={cn(
              "p-1.5 rounded text-lg hover:bg-muted/50 transition-colors",
              selectedCategory === key && "bg-muted"
            )}
            title={cat.label}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-[140px] overflow-y-auto p-1">
        {EMOJI_CATEGORIES[selectedCategory].emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onIconChange(emoji)}
            className={cn(
              "p-2 text-xl rounded hover:bg-muted/50 transition-colors",
              icon === emoji && "bg-primary/10 ring-1 ring-primary"
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

interface IconColorPickerProps {
  icon: string;
  color: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
  className?: string;
}

/**
 * Icon picker with color selection - uses IconPicker internally
 */
export function IconColorPicker({
  icon,
  color,
  onIconChange,
  onColorChange,
  className,
}: IconColorPickerProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Icon Picker */}
      <IconPicker
        icon={icon}
        onIconChange={onIconChange}
      />

      {/* Color Selection */}
      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onColorChange(c.value)}
              title={c.name}
              className={cn(
                "w-8 h-8 rounded-full transition-all hover:scale-110",
                color === c.value && "ring-2 ring-offset-2 ring-primary"
              )}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
