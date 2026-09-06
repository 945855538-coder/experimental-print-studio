"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ControlPanel } from "./control-panel";
import type {
  DitherMethod,
  DitherPreset,
  HalftoneShape,
  Mode,
  ThresholdPreset,
} from "./control-panel";
import { ImageCanvas } from "./image-canvas";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

const halftonePresets: Record<
  "NEWSPAPER" | "XEROX" | "COMIC" | "SCANLINE",
  { size: number; contrast: number; angle: number; grain: number; shape: HalftoneShape }
> = {
  NEWSPAPER: { size: 3, contrast: 120, angle: 45, grain: 25, shape: "Circle" },
  XEROX: { size: 2, contrast: 160, angle: 45, grain: 55, shape: "Circle" },
  COMIC: { size: 8, contrast: 130, angle: 45, grain: 5, shape: "Circle" },
  SCANLINE: { size: 6, contrast: 140, angle: 35, grain: 15, shape: "Line" },
};

const thresholdPresets: Record<ThresholdPreset, { threshold: number; contrast: number }> = {
  Soft: { threshold: 112, contrast: 75 },
  Graphic: { threshold: 128, contrast: 125 },
  Hard: { threshold: 144, contrast: 180 },
};

const ditherPresets: Record<DitherPreset, { threshold: number; scale: number; method: DitherMethod }> = {
  Classic: { threshold: 128, scale: 1, method: "Floyd-Steinberg" },
  Pixel: { threshold: 128, scale: 4, method: "Bayer" },
  Retro: { threshold: 136, scale: 2, method: "Atkinson" },
  Soft: { threshold: 112, scale: 1, method: "Atkinson" },
};

export function ImageEditor() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("Halftone");
  const [halftoneSize, setHalftoneSize] = useState(6);
  const [halftoneContrast, setHalftoneContrast] = useState(100);
  const [halftoneLevel, setHalftoneLevel] = useState(0);
  const [halftoneCleanBackground, setHalftoneCleanBackground] = useState(false);
  const [halftoneAngle, setHalftoneAngle] = useState(45);
  const [halftoneGrain, setHalftoneGrain] = useState(20);
  const [halftoneShape, setHalftoneShape] = useState<HalftoneShape>("Circle");
  const [halftoneForeground, setHalftoneForeground] = useState("#000000");
  const [halftoneBackground, setHalftoneBackground] = useState("#ffffff");
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [threshold, setThreshold] = useState(128);
  const [thresholdContrast, setThresholdContrast] = useState(100);
  const [thresholdSmooth, setThresholdSmooth] = useState(1);
  const [ditherThreshold, setDitherThreshold] = useState(128);
  const [ditherScale, setDitherScale] = useState(1);
  const [ditherMethod, setDitherMethod] = useState<DitherMethod>("Floyd-Steinberg");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputSvgRef = useRef<(() => string) | null>(null);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !acceptedTypes.includes(file.type)) return;

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;

    const nextImage = new Image();
    nextImage.onload = () => {
      setImage(nextImage);
      setFileName(file.name);
    };
    nextImage.src = objectUrl;
  }

  function downloadBlob(blob: Blob, extension: "png" | "svg") {
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `halftone-lab-${mode.toLowerCase()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  function handleExport(format: "png" | "svg") {
    const outputCanvas = outputCanvasRef.current;
    if (!outputCanvas) return;

    if (format === "svg") {
      const createSvg = outputSvgRef.current;
      if (!createSvg) return;
      const svg = createSvg();
      downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "svg");
      return;
    }

    outputCanvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, "png");
    }, "image/png");
  }

  function handlePresetSelect(presetName: keyof typeof halftonePresets) {
    const preset = halftonePresets[presetName];
    setHalftoneSize(preset.size);
    setHalftoneContrast(preset.contrast);
    setHalftoneAngle(preset.angle);
    setHalftoneGrain(preset.grain);
    setHalftoneShape(preset.shape);
  }

  function handleThresholdPresetSelect(presetName: ThresholdPreset) {
    const preset = thresholdPresets[presetName];
    setThreshold(preset.threshold);
    setThresholdContrast(preset.contrast);
  }

  function handleDitherPresetSelect(presetName: DitherPreset) {
    const preset = ditherPresets[presetName];
    setDitherThreshold(preset.threshold);
    setDitherScale(preset.scale);
    setDitherMethod(preset.method);
  }

  return (
    <div className="editor-shell">
      <ControlPanel
        fileInputRef={fileInputRef}
        fileName={fileName}
        mode={mode}
        halftoneSize={halftoneSize}
        halftoneContrast={halftoneContrast}
        halftoneLevel={halftoneLevel}
        halftoneCleanBackground={halftoneCleanBackground}
        halftoneAngle={halftoneAngle}
        halftoneGrain={halftoneGrain}
        halftoneShape={halftoneShape}
        halftoneForeground={halftoneForeground}
        halftoneBackground={halftoneBackground}
        transparentBackground={transparentBackground}
        threshold={threshold}
        thresholdContrast={thresholdContrast}
        thresholdSmooth={thresholdSmooth}
        ditherThreshold={ditherThreshold}
        ditherScale={ditherScale}
        ditherMethod={ditherMethod}
        onFileChange={handleFileChange}
        onModeChange={setMode}
        onHalftoneSizeChange={setHalftoneSize}
        onHalftoneContrastChange={setHalftoneContrast}
        onHalftoneLevelChange={setHalftoneLevel}
        onHalftoneCleanBackgroundChange={setHalftoneCleanBackground}
        onHalftoneAngleChange={setHalftoneAngle}
        onHalftoneGrainChange={setHalftoneGrain}
        onHalftoneShapeChange={setHalftoneShape}
        onHalftoneForegroundChange={setHalftoneForeground}
        onHalftoneBackgroundChange={setHalftoneBackground}
        onTransparentBackgroundChange={setTransparentBackground}
        onThresholdChange={setThreshold}
        onThresholdContrastChange={setThresholdContrast}
        onThresholdSmoothChange={setThresholdSmooth}
        onDitherThresholdChange={setDitherThreshold}
        onDitherScaleChange={setDitherScale}
        onDitherMethodChange={setDitherMethod}
        onPresetSelect={handlePresetSelect}
        onThresholdPresetSelect={handleThresholdPresetSelect}
        onDitherPresetSelect={handleDitherPresetSelect}
        canExport={image !== null}
        onExport={handleExport}
      />
      <ImageCanvas
        outputCanvasRef={outputCanvasRef}
        outputSvgRef={outputSvgRef}
        image={image}
        fileName={fileName}
        mode={mode}
        halftoneSize={halftoneSize}
        halftoneContrast={halftoneContrast}
        halftoneLevel={halftoneLevel}
        halftoneCleanBackground={halftoneCleanBackground}
        halftoneAngle={halftoneAngle}
        halftoneGrain={halftoneGrain}
        halftoneShape={halftoneShape}
        halftoneForeground={halftoneForeground}
        halftoneBackground={halftoneBackground}
        transparentBackground={transparentBackground}
        threshold={threshold}
        thresholdContrast={thresholdContrast}
        thresholdSmooth={thresholdSmooth}
        ditherThreshold={ditherThreshold}
        ditherScale={ditherScale}
        ditherMethod={ditherMethod}
      />
    </div>
  );
}
