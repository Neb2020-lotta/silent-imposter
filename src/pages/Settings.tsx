import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, RotateCcw, Settings as Gear, Check } from "lucide-react";
import { toast } from "sonner";
import {
  resetSettings,
  updateSettings,
  useSettings,
  type Language,
} from "@/lib/settings";
import { THEMES } from "@/lib/themes";
import { wordCategories } from "@/lib/words";
import { HEX_COLOR_REGEX, isValidHex, expandHex, PALETTE_SLOTS, type PaletteSlot } from "@/lib/color";
import { sfx } from "@/lib/sounds";
import { t } from "@/lib/i18n";

const mono = "'Space Mono', monospace";
const rubik = "'Rubik', sans-serif";

export default function SettingsPage() {
  const navigate = useNavigate();
  const s = useSettings();

  const handleReset = () => {
    resetSettings();
    sfx.click();
    toast.success(t("resetDone"));
  };

  return (
    <div
      className="min-h-screen w-full px-6 py-10 md:py-16"
      style={{ background: "hsl(var(--game-bg-start))", color: "hsl(var(--game-text))" }}
    >
      <div className="mx-auto max-w-2xl space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              sfx.click();
              navigate("/");
            }}
            className="press-feedback inline-flex items-center gap-2 text-xs uppercase tracking-widest"
            style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
          >
            <ArrowLeft className="h-4 w-4" /> {t("back")}
          </button>
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
          >
            // config panel
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Gear className="h-7 w-7" style={{ color: "hsl(var(--game-accent))" }} />
          <h1
            className="text-3xl md:text-4xl font-bold uppercase tracking-tight"
            style={{ fontFamily: mono }}
          >
            {t("settings")}
          </h1>
        </div>

        {/* Toggles */}
        <Section>
          <Row
            label={t("sounds")}
            mono="audio.fx"
            control={
              <Switch
                checked={s.sounds}
                onCheckedChange={(v) => {
                  updateSettings({ sounds: v });
                  if (v) sfx.click();
                }}
              />
            }
          />
          <Row
            label={t("animations")}
            mono="motion.ui"
            control={
              <Switch
                checked={s.animations}
                onCheckedChange={(v) => {
                  updateSettings({ animations: v });
                  sfx.click();
                }}
              />
            }
          />
        </Section>

        {/* Sliders */}
        <Section>
          <SliderRow
            label={t("roundTimer")}
            mono="timer.s"
            value={s.roundTimer}
            min={0}
            max={300}
            step={15}
            display={s.roundTimer === 0 ? "off" : `${s.roundTimer}s`}
            onChange={(v) => updateSettings({ roundTimer: v })}
          />
          <SliderRow
            label={t("imposterCount")}
            mono="imp.count"
            value={s.imposterCount}
            min={1}
            max={4}
            step={1}
            display={`${s.imposterCount}`}
            onChange={(v) => updateSettings({ imposterCount: v })}
          />
        </Section>


        {/* Language */}
        <Section>
          <div className="space-y-3">
            <Label mono="locale">{t("language")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["de", "en"] as Language[]).map((l) => (
                <PillBtn
                  key={l}
                  active={s.language === l}
                  onClick={() => {
                    updateSettings({ language: l });
                    sfx.click();
                  }}
                >
                  {l === "de" ? "Deutsch" : "English"}
                </PillBtn>
              ))}
            </div>
          </div>
        </Section>

        {/* Theme */}
        <Section>
          <div className="space-y-3">
            <Label mono="theme.skin">{t("theme")}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {THEMES.map((th) => {
                const active = s.theme === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => {
                      updateSettings({ theme: th.id });
                      sfx.click();
                    }}
                    className="press-feedback p-3 text-left transition-colors"
                    style={{
                      fontFamily: mono,
                      borderRadius: 2,
                      border: `1px solid ${active ? "hsl(var(--game-accent))" : "hsl(var(--game-border))"}`,
                      background: active ? "hsla(var(--game-accent), 0.10)" : "transparent",
                      color: active ? "hsl(var(--game-accent))" : "hsl(var(--game-text))",
                    }}
                  >
                    <div className="flex gap-1 mb-2">
                      {th.swatch.map((c) => (
                        <span key={c} style={{ background: c, width: 18, height: 18, borderRadius: 2, display: "inline-block" }} />
                      ))}
                    </div>
                    <div className="text-[11px] uppercase tracking-widest">{th.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Category filter */}
        <Section>
          <CategoryFilter />
        </Section>

        {/* Color palette */}
        <Section>
          <ColorPalette />
        </Section>

        {/* Reset */}
        <Button
          onClick={handleReset}
          variant="ghost"
          className="press-feedback w-full justify-center gap-2 py-6 text-xs uppercase tracking-widest"
          style={{
            fontFamily: mono,
            border: "1px solid hsl(var(--game-border))",
            color: "hsl(var(--game-accent))",
            borderRadius: 2,
          }}
        >
          <RotateCcw className="h-4 w-4" />
          {t("reset")}
        </Button>
      </div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="space-y-6 p-5 md:p-6"
      style={{
        background: "hsl(var(--game-card-bg))",
        border: "1px solid hsl(var(--game-border))",
        borderRadius: 2,
      }}
    >
      {children}
    </div>
  );
}

function Row({
  label,
  mono,
  control,
}: {
  label: string;
  mono: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label mono={mono}>{label}</Label>
      {control}
    </div>
  );
}

function Label({ children, mono }: { children: React.ReactNode; mono: string }) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-widest"
        style={{ fontFamily: "'Space Mono', monospace", color: "hsl(var(--game-secondary))" }}
      >
        {mono}
      </div>
      <div className="text-base" style={{ fontFamily: rubik }}>
        {children}
      </div>
    </div>
  );
}

function SliderRow({
  label,
  mono,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  mono: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <Label mono={mono}>{label}</Label>
        <span
          className="text-sm font-bold"
          style={{ fontFamily: "'Space Mono', monospace", color: "hsl(var(--game-accent))" }}
        >
          {display}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

function PillBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="press-feedback py-3 text-xs uppercase tracking-widest transition-colors"
      style={{
        fontFamily: "'Space Mono', monospace",
        borderRadius: 2,
        border: `1px solid ${active ? "hsl(var(--game-accent))" : "hsl(var(--game-border))"}`,
        background: active ? "hsla(var(--game-accent), 0.12)" : "transparent",
        color: active ? "hsl(var(--game-accent))" : "hsl(var(--game-text))",
      }}
    >
      {children}
    </button>
  );
}

function CategoryFilter() {
  const s = useSettings();
  const allCategories = Object.keys(wordCategories).filter((c) => c !== "Alle Wörter");
  const selected = new Set(s.categoryFilter);
  const toggle = (cat: string) => {
    const next = new Set(selected);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    updateSettings({ categoryFilter: Array.from(next) });
    sfx.click();
  };
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <Label mono="words.filter">{t("categoryFilter")}</Label>
        <div className="flex gap-2">
          <button
            onClick={() => { updateSettings({ categoryFilter: allCategories }); sfx.click(); }}
            className="text-[10px] uppercase tracking-widest px-2 py-1"
            style={{ fontFamily: mono, color: "hsl(var(--game-secondary))", border: "1px solid hsl(var(--game-border))", borderRadius: 2 }}
          >
            {t("selectAll")}
          </button>
          <button
            onClick={() => { updateSettings({ categoryFilter: [] }); sfx.click(); }}
            className="text-[10px] uppercase tracking-widest px-2 py-1"
            style={{ fontFamily: mono, color: "hsl(var(--game-secondary))", border: "1px solid hsl(var(--game-border))", borderRadius: 2 }}
          >
            {t("clear")}
          </button>
        </div>
      </div>
      <p className="text-[11px]" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
        {t("categoryFilterHint")}
      </p>
      <div className="flex flex-wrap gap-2">
        {allCategories.map((cat) => {
          const active = selected.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggle(cat)}
              className="press-feedback inline-flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-widest transition-colors"
              style={{
                fontFamily: mono,
                borderRadius: 2,
                border: `1px solid ${active ? "hsl(var(--game-accent))" : "hsl(var(--game-border))"}`,
                background: active ? "hsla(var(--game-accent), 0.12)" : "transparent",
                color: active ? "hsl(var(--game-accent))" : "hsl(var(--game-text))",
              }}
              aria-pressed={active}
            >
              {active && <Check className="h-3 w-3" />}
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const SLOT_DEFAULTS: Record<PaletteSlot, string> = {
  accent: "#e85d3a",
  background: "#1a1a1a",
  backgroundEnd: "#242424",
  card: "#2d2d2d",
  text: "#f5f5f5",
  secondary: "#4a4a4a",
  border: "#4a4a4a",
  input: "#242424",
};

const SLOT_ORDER: PaletteSlot[] = [
  "accent",
  "background",
  "backgroundEnd",
  "card",
  "text",
  "secondary",
  "border",
  "input",
];

function ColorPalette() {
  const s = useSettings();

  const resetAll = () => {
    updateSettings({ palette: {}, accentColor: null });
    sfx.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <Label mono="ui.palette">{t("colorPalette")}</Label>
        <button
          onClick={resetAll}
          className="press-feedback text-[10px] uppercase tracking-widest px-3 py-2"
          style={{ fontFamily: mono, border: "1px solid hsl(var(--game-border))", color: "hsl(var(--game-secondary))", borderRadius: 2 }}
        >
          {t("resetAllColors")}
        </button>
      </div>
      <p className="text-[11px]" style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}>
        {t("colorPaletteHint")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SLOT_ORDER.map((slot) => (
          <SlotPicker
            key={slot}
            slot={slot}
            value={s.palette?.[slot] ?? (slot === "accent" ? s.accentColor : null) ?? null}
            fallback={SLOT_DEFAULTS[slot]}
          />
        ))}
      </div>
    </div>
  );
}

function SlotPicker({
  slot,
  value,
  fallback,
}: {
  slot: PaletteSlot;
  value: string | null;
  fallback: string;
}) {
  const s = useSettings();
  const initial = value ?? fallback;
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value ?? fallback);
  }, [value, fallback]);

  const writePalette = (next: string | null) => {
    const palette = { ...(s.palette ?? {}) };
    if (next === null) delete palette[slot];
    else palette[slot] = next;
    // Mirror accent into legacy field for back-compat.
    const patch: Partial<typeof s> = { palette };
    if (slot === "accent") patch.accentColor = next;
    updateSettings(patch);
  };

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    // SECURITY: validate via strict regex before any storage/DOM write.
    if (!HEX_COLOR_REGEX.test(trimmed)) {
      setError(t("invalidColor"));
      return;
    }
    setError(null);
    writePalette(trimmed);
    sfx.click();
  };

  const onText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDraft(v);
    if (v === "" || isValidHex(v)) setError(null);
  };

  const onNative = (e: React.ChangeEvent<HTMLInputElement>) => {
    commit(e.target.value);
  };

  const onReset = () => {
    setError(null);
    setDraft(fallback);
    writePalette(null);
    sfx.click();
  };

  const swatch = isValidHex(draft) ? expandHex(draft) : fallback;
  const labelKey = `slot_${slot}` as const;

  return (
    <div
      className="space-y-2 p-3"
      style={{ border: "1px solid hsl(var(--game-border))", borderRadius: 2 }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
        >
          {t(labelKey)}
        </span>
        <code
          className="text-[10px]"
          style={{ fontFamily: mono, color: "hsl(var(--game-secondary))" }}
        >
          {PALETTE_SLOTS[slot]}
        </code>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={PALETTE_SLOTS[slot]}
          value={swatch}
          onChange={onNative}
          className="h-9 w-10 cursor-pointer border bg-transparent shrink-0"
        />
        <Input
          value={draft}
          onChange={onText}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(draft); }}
          placeholder={fallback}
          maxLength={7}
          spellCheck={false}
          aria-invalid={!!error}
          className="term-input uppercase flex-1 min-w-0"
          style={{ fontFamily: mono }}
        />
        <button
          onClick={onReset}
          className="press-feedback text-[10px] uppercase tracking-widest px-2 py-2 shrink-0"
          style={{ fontFamily: mono, border: "1px solid hsl(var(--game-border))", color: "hsl(var(--game-secondary))", borderRadius: 2 }}
          title={t("resetColor")}
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      </div>
      {error && (
        <p className="text-[11px]" style={{ fontFamily: mono, color: "hsl(var(--destructive))" }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

