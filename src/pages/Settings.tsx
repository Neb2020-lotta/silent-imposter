import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Settings as Gear } from "lucide-react";
import { toast } from "sonner";
import {
  resetSettings,
  updateSettings,
  useSettings,
  type Language,
} from "@/lib/settings";
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
