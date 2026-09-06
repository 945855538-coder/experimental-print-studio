import type { ChangeEvent, RefObject } from "react";

export type Mode = "Halftone" | "Threshold" | "Dither";
export type HalftoneShape = "Circle" | "Square" | "Diamond" | "Line";
export type HalftonePreset = "NEWSPAPER" | "XEROX" | "COMIC" | "SCANLINE";
export type ThresholdPreset = "Soft" | "Graphic" | "Hard";
export type DitherMethod = "Floyd-Steinberg" | "Atkinson" | "Bayer";
export type DitherPreset = "Classic" | "Pixel" | "Retro" | "Soft";

type ControlPanelProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  fileName: string | null;
  mode: Mode;
  halftoneSize: number;
  halftoneContrast: number;
  halftoneLevel: number;
  halftoneCleanBackground: boolean;
  halftoneAngle: number;
  halftoneGrain: number;
  halftoneShape: HalftoneShape;
  halftoneForeground: string;
  halftoneBackground: string;
  transparentBackground: boolean;
  threshold: number;
  thresholdContrast: number;
  thresholdSmooth: number;
  ditherThreshold: number;
  ditherScale: number;
  ditherMethod: DitherMethod;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onModeChange: (mode: Mode) => void;
  onHalftoneSizeChange: (value: number) => void;
  onHalftoneContrastChange: (value: number) => void;
  onHalftoneLevelChange: (value: number) => void;
  onHalftoneCleanBackgroundChange: (value: boolean) => void;
  onHalftoneAngleChange: (value: number) => void;
  onHalftoneGrainChange: (value: number) => void;
  onHalftoneShapeChange: (value: HalftoneShape) => void;
  onHalftoneForegroundChange: (value: string) => void;
  onHalftoneBackgroundChange: (value: string) => void;
  onTransparentBackgroundChange: (value: boolean) => void;
  onThresholdChange: (value: number) => void;
  onThresholdContrastChange: (value: number) => void;
  onThresholdSmoothChange: (value: number) => void;
  onDitherThresholdChange: (value: number) => void;
  onDitherScaleChange: (value: number) => void;
  onDitherMethodChange: (value: DitherMethod) => void;
  onPresetSelect: (preset: HalftonePreset) => void;
  onThresholdPresetSelect: (preset: ThresholdPreset) => void;
  onDitherPresetSelect: (preset: DitherPreset) => void;
  canExport: boolean;
  onExport: (format: "png" | "svg") => void;
};

const modes: Mode[] = ["Halftone", "Threshold", "Dither"];
const presets: HalftonePreset[] = ["NEWSPAPER", "XEROX", "COMIC", "SCANLINE"];
const thresholdPresets: ThresholdPreset[] = ["Soft", "Graphic", "Hard"];
const ditherPresets: DitherPreset[] = ["Classic", "Pixel", "Retro", "Soft"];

export function ControlPanel({
  fileInputRef,
  fileName,
  mode,
  halftoneSize,
  halftoneContrast,
  halftoneLevel,
  halftoneCleanBackground,
  halftoneAngle,
  halftoneGrain,
  halftoneShape,
  halftoneForeground,
  halftoneBackground,
  transparentBackground,
  threshold,
  thresholdContrast,
  thresholdSmooth,
  ditherThreshold,
  ditherScale,
  ditherMethod,
  onFileChange,
  onModeChange,
  onHalftoneSizeChange,
  onHalftoneContrastChange,
  onHalftoneLevelChange,
  onHalftoneCleanBackgroundChange,
  onHalftoneAngleChange,
  onHalftoneGrainChange,
  onHalftoneShapeChange,
  onHalftoneForegroundChange,
  onHalftoneBackgroundChange,
  onTransparentBackgroundChange,
  onThresholdChange,
  onThresholdContrastChange,
  onThresholdSmoothChange,
  onDitherThresholdChange,
  onDitherScaleChange,
  onDitherMethodChange,
  onPresetSelect,
  onThresholdPresetSelect,
  onDitherPresetSelect,
  canExport,
  onExport,
}: ControlPanelProps) {
  return (
    <aside className="control-panel">
      <header className="brand-row">
        <h1>HALFTONE LAB</h1>
        <span className="version">01</span>
      </header>

      <section className="panel-section upload-section">
        <span className="section-label">SOURCE</span>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
        />
        <button className="upload-button" type="button" onClick={() => fileInputRef.current?.click()}>
          <span>Upload Image</span>
          <span aria-hidden="true">＋</span>
        </button>
        <p className="file-status" title={fileName ?? undefined}>
          {fileName ?? "JPG / PNG / WEBP"}
        </p>
      </section>

      <section className="panel-section">
        <span className="section-label">STYLE</span>
        <div className="mode-list" role="radiogroup" aria-label="Processing style">
          {modes.map((item, index) => (
            <button
              className={`mode-option${mode === item ? " is-active" : ""}`}
              type="button"
              role="radio"
              aria-checked={mode === item}
              onClick={() => onModeChange(item)}
              key={item}
            >
              <span className="mode-index">0{index + 1}</span>
              <span>{item}</span>
              <span className="mode-marker" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section preset-section">
        <span className="section-label">PRESET</span>
        {mode === "Halftone" ? (
          <div className="preset-controls">
            {presets.map((preset) => (
              <button type="button" onClick={() => onPresetSelect(preset)} key={preset}>
                {preset}
              </button>
            ))}
          </div>
        ) : mode === "Threshold" ? (
          <div className="preset-controls">
            {thresholdPresets.map((preset) => (
              <button type="button" onClick={() => onThresholdPresetSelect(preset)} key={preset}>
                {preset}
              </button>
            ))}
          </div>
        ) : (
          <div className="preset-controls">
            {ditherPresets.map((preset) => (
              <button type="button" onClick={() => onDitherPresetSelect(preset)} key={preset}>
                {preset}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="panel-section adjust-section">
        <span className="section-label">ADJUST</span>
        {mode === "Halftone" ? (
          <>
            <label className="slider-control">
              <span><span>SIZE</span><output>{halftoneSize}px</output></span>
              <input
                type="range"
                min="2"
                max="20"
                value={halftoneSize}
                onChange={(event) => onHalftoneSizeChange(Number(event.target.value))}
              />
            </label>
            <label className="slider-control">
              <span><span>CONTRAST</span><output>{halftoneContrast}%</output></span>
              <input
                type="range"
                min="0"
                max="200"
                value={halftoneContrast}
                onChange={(event) => onHalftoneContrastChange(Number(event.target.value))}
              />
            </label>
            <label className="slider-control">
              <span><span>LEVEL</span><output>{halftoneLevel > 0 ? "+" : ""}{halftoneLevel}</output></span>
              <input
                type="range"
                min="-100"
                max="100"
                value={halftoneLevel}
                onChange={(event) => onHalftoneLevelChange(Number(event.target.value))}
              />
            </label>
            <label className="slider-control">
              <span><span>ANGLE</span><output>{halftoneAngle}°</output></span>
              <input
                type="range"
                min="0"
                max="90"
                value={halftoneAngle}
                onChange={(event) => onHalftoneAngleChange(Number(event.target.value))}
              />
            </label>
            <label className="slider-control">
              <span><span>GRAIN</span><output>{halftoneGrain}</output></span>
              <input
                type="range"
                min="0"
                max="100"
                value={halftoneGrain}
                onChange={(event) => onHalftoneGrainChange(Number(event.target.value))}
              />
            </label>
            <label className="shape-control">
              <span>SHAPE</span>
              <select
                value={halftoneShape}
                onChange={(event) => onHalftoneShapeChange(event.target.value as HalftoneShape)}
              >
                <option>Circle</option>
                <option>Square</option>
                <option>Diamond</option>
                <option>Line</option>
              </select>
            </label>
            <label className="transparent-control">
              <span>CLEAN BACKGROUND</span>
              <input
                type="checkbox"
                checked={halftoneCleanBackground}
                onChange={(event) => onHalftoneCleanBackgroundChange(event.target.checked)}
              />
            </label>
          </>
        ) : mode === "Threshold" ? (
          <>
            <label className="slider-control">
              <span><span>LEVEL</span><output>{threshold}</output></span>
              <input
                type="range"
                min="0"
                max="255"
                value={threshold}
                onChange={(event) => onThresholdChange(Number(event.target.value))}
              />
            </label>
            <label className="slider-control">
              <span><span>CONTRAST</span><output>{thresholdContrast}%</output></span>
              <input
                type="range"
                min="0"
                max="200"
                value={thresholdContrast}
                onChange={(event) => onThresholdContrastChange(Number(event.target.value))}
              />
            </label>
            <label className="slider-control">
              <span><span>SMOOTH</span><output>{thresholdSmooth}</output></span>
              <input
                type="range"
                min="0"
                max="10"
                value={thresholdSmooth}
                onChange={(event) => onThresholdSmoothChange(Number(event.target.value))}
              />
            </label>
          </>
        ) : (
          <>
            <label className="slider-control">
              <span><span>THRESHOLD</span><output>{ditherThreshold}</output></span>
              <input
                type="range"
                min="0"
                max="255"
                value={ditherThreshold}
                onChange={(event) => onDitherThresholdChange(Number(event.target.value))}
              />
            </label>
            <label className="slider-control">
              <span><span>SCALE</span><output>{ditherScale}×</output></span>
              <input
                type="range"
                min="1"
                max="8"
                value={ditherScale}
                onChange={(event) => onDitherScaleChange(Number(event.target.value))}
              />
            </label>
            <label className="shape-control">
              <span>METHOD</span>
              <select
                value={ditherMethod}
                onChange={(event) => onDitherMethodChange(event.target.value as DitherMethod)}
              >
                <option>Floyd-Steinberg</option>
                <option>Atkinson</option>
                <option>Bayer</option>
              </select>
            </label>
          </>
        )}
      </section>

      <section className="panel-section color-section">
        <span className="section-label">COLOR</span>
        {mode !== "Dither" && (
          <>
            <label className="color-control">
              <span>INK</span>
              <input
                type="color"
                value={halftoneForeground}
                onChange={(event) => onHalftoneForegroundChange(event.target.value)}
              />
            </label>
            <label className="color-control">
              <span>PAPER</span>
              <input
                type="color"
                value={halftoneBackground}
                onChange={(event) => onHalftoneBackgroundChange(event.target.value)}
              />
            </label>
          </>
        )}
        <label className="transparent-control">
          <span>TRANSPARENT</span>
          <input
            type="checkbox"
            checked={transparentBackground}
            onChange={(event) => onTransparentBackgroundChange(event.target.checked)}
          />
        </label>
      </section>

      <div className="panel-footer">
        <div className="export-actions">
          <button className="export-button" type="button" disabled={!canExport} onClick={() => onExport("png")}>
            Export PNG
            <span>↗</span>
          </button>
          <button className="export-button" type="button" disabled={!canExport} onClick={() => onExport("svg")}>
            Export SVG
            <span>↗</span>
          </button>
        </div>
        <span>LOCAL PROCESSING</span>
      </div>
    </aside>
  );
}
