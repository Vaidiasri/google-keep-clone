import { useState, useEffect, type ReactNode } from "react";
import { Sparkles, Wand2, Download, Upload, Shuffle, Palette, Zap, Star } from "lucide-react";
import { useTheme, applyCustomThemeToDOM, clearCustomThemeFromDOM } from "../context/ThemeContext";
import type { CustomThemeConfig } from "../types/customTheme.types";
import { randomTheme } from "../lib/themePresets";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";

const ColorField = ({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value.startsWith("#") ? value : "#6366f1"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-9 rounded-lg border border-white/10 cursor-pointer bg-transparent"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-9 px-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white font-mono"
      />
    </div>
  </label>
);

const SliderField = ({
  label, value, min, max, onChange, unit = "",
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit?: string }) => (
  <label className="flex flex-col gap-1.5">
    <div className="flex justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-[10px] font-bold text-indigo-400 tabular-nums">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-indigo-500"
    />
  </label>
);

const ToggleField = ({
  label, description, checked, onChange,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-start gap-3 cursor-pointer group">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 accent-indigo-500"
    />
    <div>
      <p className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">{label}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
    </div>
  </label>
);

const PreviewPanel = ({ theme }: { theme: CustomThemeConfig }) => (
  <div
    className="relative rounded-2xl overflow-hidden border border-white/10 h-full min-h-[320px]"
    style={{
      background: `linear-gradient(${theme.effects.gradientAngle}deg, ${theme.colors.background}, ${theme.colors.backgroundAlt}, color-mix(in srgb, ${theme.colors.accent} 25%, ${theme.colors.background}))`,
      fontFamily: theme.typography === "mono" ? "monospace" : theme.typography === "serif" ? "serif" : "sans-serif",
    }}
  >
    {theme.effects.starfield && (
      <div className="absolute inset-0 opacity-40 pointer-events-none tf-preview-stars" />
    )}
    {theme.effects.noiseOverlay && (
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none tf-noise" />
    )}
    <div className="relative p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 rounded-xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary})`, boxShadow: theme.effects.neonGlow ? `0 0 20px ${theme.colors.accent}66` : undefined }}
        >
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-sm" style={{ color: theme.colors.text }}>TaskFlow</span>
      </div>
      <div
        className="rounded-xl p-4 space-y-2"
        style={{
          background: theme.colors.surface,
          backdropFilter: `blur(${theme.effects.glassBlur}px)`,
          borderRadius: theme.effects.borderRadius,
          boxShadow: theme.effects.neonGlow ? `0 0 ${theme.effects.glowIntensity * 0.4}px ${theme.colors.accent}44` : undefined,
          border: `1px solid color-mix(in srgb, ${theme.colors.accent} 30%, transparent)`,
        }}
      >
        <p className="text-xs font-semibold" style={{ color: theme.colors.text }}>Design Review</p>
        <div className="h-1.5 rounded-full bg-black/20 overflow-hidden">
          <div className="h-full w-2/3 rounded-full" style={{ background: `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.accentSecondary})` }} />
        </div>
        <p className="text-[10px]" style={{ color: theme.colors.textMuted }}>67% complete · 2 subtasks</p>
      </div>
      <button
        className="w-full py-2 rounded-xl text-xs font-bold text-white"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentSecondary})`,
          borderRadius: Math.max(theme.effects.borderRadius - 4, 6),
          boxShadow: theme.effects.neonGlow ? `0 0 ${theme.effects.glowIntensity * 0.3}px ${theme.colors.accent}` : undefined,
        }}
      >
        Add Task
      </button>
    </div>
  </div>
);

type Tab = "presets" | "customize" | "effects";

const ThemeStudio = () => {
  const { themeStudioOpen, closeThemeStudio, customTheme, setCustomTheme, presets, applyPreset, theme, isDark } = useTheme();
  const [draft, setDraft] = useState<CustomThemeConfig>(customTheme);
  const [tab, setTab] = useState<Tab>("presets");

  useEffect(() => {
    if (themeStudioOpen) setDraft(customTheme);
  }, [themeStudioOpen, customTheme]);

  useEffect(() => {
    if (!themeStudioOpen) return;
    applyCustomThemeToDOM(draft);
  }, [draft, themeStudioOpen]);

  const updateColor = (key: keyof CustomThemeConfig["colors"], value: string) =>
    setDraft((d) => ({ ...d, colors: { ...d.colors, [key]: value } }));

  const updateEffect = <K extends keyof CustomThemeConfig["effects"]>(key: K, value: CustomThemeConfig["effects"][K]) =>
    setDraft((d) => ({ ...d, effects: { ...d.effects, [key]: value } }));

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taskflow-theme-${draft.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string) as CustomThemeConfig;
          setDraft({ ...parsed, id: parsed.id || `theme-${Date.now()}` });
        } catch { /* ignore invalid file */ }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: "presets", label: "Presets", icon: <Star className="h-3.5 w-3.5" /> },
    { id: "customize", label: "Colors", icon: <Palette className="h-3.5 w-3.5" /> },
    { id: "effects", label: "Effects", icon: <Zap className="h-3.5 w-3.5" /> },
  ];

  const handleClose = () => {
    if (theme === "custom") applyCustomThemeToDOM(customTheme);
    else clearCustomThemeFromDOM(isDark);
    closeThemeStudio();
  };

  return (
    <Dialog open={themeStudioOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 bg-[#0a0a12] border-white/10 text-white">
        <div className="flex flex-col h-full max-h-[inherit]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Wand2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">Theme Studio</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs mt-0.5">
                  Craft extraordinary themes with live preview, presets, and cosmic effects
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
            {/* Controls */}
            <div className="lg:w-[340px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] flex flex-col min-h-0">
              <div className="flex gap-1 p-3 border-b border-white/[0.06]">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                      tab === t.id ? "bg-indigo-500/20 text-indigo-300" : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {tab === "presets" && (
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { applyPreset(p.id); setDraft({ ...p }); }}
                        className={`relative rounded-xl overflow-hidden border text-left transition-all hover:scale-[1.02] ${
                          draft.id === p.id ? "border-indigo-400 ring-2 ring-indigo-400/30" : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div
                          className="h-14"
                          style={{ background: `linear-gradient(135deg, ${p.colors.background}, ${p.colors.accent}88, ${p.colors.accentSecondary}66)` }}
                        />
                        <div className="p-2.5 bg-white/[0.03]">
                          <p className="text-[11px] font-bold text-white truncate">{p.name}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{p.effects.neonGlow ? "Neon" : "Soft"} · {p.typography}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {tab === "customize" && (
                  <div className="space-y-3">
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white"
                      placeholder="Theme name"
                    />
                    <ColorField label="Background" value={draft.colors.background} onChange={(v) => updateColor("background", v)} />
                    <ColorField label="Background Alt" value={draft.colors.backgroundAlt} onChange={(v) => updateColor("backgroundAlt", v)} />
                    <ColorField label="Surface / Glass" value={draft.colors.surface.startsWith("rgba") ? "#1e293b" : draft.colors.surface} onChange={(v) => updateColor("surface", v)} />
                    <ColorField label="Accent Primary" value={draft.colors.accent} onChange={(v) => updateColor("accent", v)} />
                    <ColorField label="Accent Secondary" value={draft.colors.accentSecondary} onChange={(v) => updateColor("accentSecondary", v)} />
                    <ColorField label="Text" value={draft.colors.text} onChange={(v) => updateColor("text", v)} />
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Typography</span>
                      <select
                        value={draft.typography}
                        onChange={(e) => setDraft((d) => ({ ...d, typography: e.target.value as CustomThemeConfig["typography"] }))}
                        className="h-9 px-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                      >
                        <option value="system">System Sans</option>
                        <option value="display">Orbitron Display</option>
                        <option value="mono">JetBrains Mono</option>
                        <option value="serif">Playfair Serif</option>
                      </select>
                    </label>
                  </div>
                )}

                {tab === "effects" && (
                  <div className="space-y-4">
                    <SliderField label="Gradient Angle" value={draft.effects.gradientAngle} min={0} max={360} onChange={(v) => updateEffect("gradientAngle", v)} unit="°" />
                    <SliderField label="Glow Intensity" value={draft.effects.glowIntensity} min={0} max={100} onChange={(v) => updateEffect("glowIntensity", v)} unit="%" />
                    <SliderField label="Glass Blur" value={draft.effects.glassBlur} min={0} max={24} onChange={(v) => updateEffect("glassBlur", v)} unit="px" />
                    <SliderField label="Border Radius" value={draft.effects.borderRadius} min={4} max={28} onChange={(v) => updateEffect("borderRadius", v)} unit="px" />
                    <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                      <ToggleField label="Animated Gradient" description="Slowly shifting background aurora" checked={draft.effects.animatedGradient} onChange={(v) => updateEffect("animatedGradient", v)} />
                      <ToggleField label="Mesh Gradient" description="Multi-layer depth and color blending" checked={draft.effects.meshGradient} onChange={(v) => updateEffect("meshGradient", v)} />
                      <ToggleField label="Neon Glow" description="Luminous borders and button halos" checked={draft.effects.neonGlow} onChange={(v) => updateEffect("neonGlow", v)} />
                      <ToggleField label="Film Grain" description="Subtle noise texture overlay" checked={draft.effects.noiseOverlay} onChange={(v) => updateEffect("noiseOverlay", v)} />
                      <ToggleField label="Starfield" description="Floating particle stars in background" checked={draft.effects.starfield} onChange={(v) => updateEffect("starfield", v)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-white/[0.06] flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft(randomTheme())}
                  className="flex-1 border-white/10 text-white hover:bg-white/10 text-xs"
                >
                  <Shuffle className="h-3.5 w-3.5 mr-1.5" /> Surprise Me
                </Button>
                <Button size="sm" variant="outline" onClick={handleExport} className="border-white/10 text-white hover:bg-white/10">
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleImport} className="border-white/10 text-white hover:bg-white/10">
                  <Upload className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Live preview */}
            <div className="flex-1 p-4 min-h-[280px] lg:min-h-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">Live Preview</p>
              <PreviewPanel theme={draft} />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} className="border-white/10 text-slate-300 hover:bg-white/10">
              Close
            </Button>
            <Button
              onClick={() => { setCustomTheme(draft); closeThemeStudio(); }}
              className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90"
            >
              Apply Theme
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ThemeStudio;
