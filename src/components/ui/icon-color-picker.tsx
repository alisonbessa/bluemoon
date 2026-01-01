"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

// Emoji categories with icons that represent the category
const EMOJI_CATEGORIES = {
  goals: {
    icon: "🎯",
    label: "Metas",
    emojis: ["🎯", "✈️", "🏠", "🚗", "💍", "🎓", "💻", "📱", "🏖️", "💰", "🎁", "👴"],
  },
  food: {
    icon: "🍔",
    label: "Comida",
    emojis: ["🛒", "🍔", "🍕", "🍜", "🍣", "🥗", "☕", "🍺", "🍷", "🥖", "🥩", "🛵", "🍽️", "🍰"],
  },
  transport: {
    icon: "🚗",
    label: "Transporte",
    emojis: ["🚗", "🚌", "🚇", "✈️", "🚲", "⛽", "🅿️", "🚙", "🔧", "🛻", "🏍️", "🚕"],
  },
  home: {
    icon: "🏠",
    label: "Casa",
    emojis: ["🏠", "🏢", "💧", "💡", "🔥", "📶", "📱", "🧹", "🛋️", "🛏️", "🚿", "🧺", "🔑"],
  },
  health: {
    icon: "💪",
    label: "Saude",
    emojis: ["💪", "🏥", "💊", "🦷", "🧠", "🏃", "🧘", "💉", "🩺", "👁️", "❤️‍🩹", "🏋️"],
  },
  entertainment: {
    icon: "🎬",
    label: "Lazer",
    emojis: ["🎬", "📺", "🎵", "🎮", "📚", "🏨", "🎭", "🎪", "🎯", "🎳", "⚽", "🏖️", "🎸"],
  },
  money: {
    icon: "💰",
    label: "Dinheiro",
    emojis: ["💰", "💳", "🧾", "🛡️", "❤️", "📈", "💵", "🏦", "💎", "🪙", "📊"],
  },
  other: {
    icon: "📦",
    label: "Outros",
    emojis: ["📌", "👕", "👟", "💅", "🐕", "🐱", "📖", "✏️", "🌍", "💼", "👶", "🧸", "📦"],
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
  /** Optional background color for the preview */
  previewColor?: string;
  className?: string;
}

/**
 * Icon picker with category-based navigation
 */
export function IconPicker({
  icon,
  onIconChange,
  previewColor,
  className,
}: IconPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);

  const handleCategoryClick = (category: CategoryKey) => {
    setSelectedCategory(category);
  };

  const handleEmojiClick = (emoji: string) => {
    onIconChange(emoji);
    setSelectedCategory(null);
  };

  const handleBackClick = () => {
    setSelectedCategory(null);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Preview */}
      <div className="flex items-center gap-3">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl shadow-sm border"
          style={{ backgroundColor: previewColor }}
        >
          {icon || "📌"}
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedCategory ? "Selecione um ícone" : "Clique em uma categoria"}
        </div>
      </div>

      {/* Icon Selection */}
      <div className="space-y-2">
        {selectedCategory === null ? (
          // Show category icons
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(EMOJI_CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleCategoryClick(key as CategoryKey)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg transition-all",
                  "bg-muted hover:bg-muted/80 hover:scale-105"
                )}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          // Show emojis from selected category
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleBackClick}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{EMOJI_CATEGORIES[selectedCategory].label}</span>
            </button>
            <div className="grid grid-cols-6 gap-2 p-2 border rounded-lg bg-muted/30">
              {EMOJI_CATEGORIES[selectedCategory].emojis.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center text-xl transition-all hover:scale-110",
                    icon === emoji
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
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
      {/* Icon Picker with color preview */}
      <IconPicker
        icon={icon}
        onIconChange={onIconChange}
        previewColor={color}
      />

      {/* Color Selection */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Cor</div>
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
