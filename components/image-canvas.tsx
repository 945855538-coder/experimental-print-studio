"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { DitherMethod, HalftoneShape, Mode } from "./control-panel";

type ImageCanvasProps = {
  outputCanvasRef: RefObject<HTMLCanvasElement | null>;
  outputSvgRef: RefObject<(() => string) | null>;
  image: HTMLImageElement | null;
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
};

type GrayIntegral = {
  data: Float64Array;
  width: number;
  height: number;
  stride: number;
};

function deterministicNoise(column: number, row: number, seed: number) {
  let hash = Math.imul(column + seed, 374761393) ^ Math.imul(row - seed, 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}

function hexToRgb(hex: string) {
  return {
    red: Number.parseInt(hex.slice(1, 3), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    blue: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function boxBlur(source: Float32Array, width: number, height: number, radius: number) {
  if (radius === 0) return source;

  const horizontal = new Float32Array(source.length);
  const output = new Float32Array(source.length);

  for (let row = 0; row < height; row += 1) {
    const rowOffset = row * width;
    let sum = 0;
    for (let sample = 0; sample <= Math.min(width - 1, radius); sample += 1) {
      sum += source[rowOffset + sample];
    }
    for (let column = 0; column < width; column += 1) {
      const left = Math.max(0, column - radius);
      const right = Math.min(width - 1, column + radius);
      horizontal[rowOffset + column] = sum / (right - left + 1);
      const outgoing = column - radius;
      const incoming = column + radius + 1;
      if (outgoing >= 0) sum -= source[rowOffset + outgoing];
      if (incoming < width) sum += source[rowOffset + incoming];
    }
  }

  for (let column = 0; column < width; column += 1) {
    let sum = 0;
    for (let sample = 0; sample <= Math.min(height - 1, radius); sample += 1) {
      sum += horizontal[sample * width + column];
    }
    for (let row = 0; row < height; row += 1) {
      const top = Math.max(0, row - radius);
      const bottom = Math.min(height - 1, row + radius);
      output[row * width + column] = sum / (bottom - top + 1);
      const outgoing = row - radius;
      const incoming = row + radius + 1;
      if (outgoing >= 0) sum -= horizontal[outgoing * width + column];
      if (incoming < height) sum += horizontal[incoming * width + column];
    }
  }

  return output;
}

function svgNumber(value: number) {
  return Number(value.toFixed(3));
}

function maskToSvgPath(mask: Uint8Array, width: number, height: number) {
  const commands: string[] = [];
  for (let row = 0; row < height; row += 1) {
    let column = 0;
    while (column < width) {
      while (column < width && mask[row * width + column] === 0) column += 1;
      if (column >= width) break;
      const start = column;
      while (column < width && mask[row * width + column] === 1) column += 1;
      const runWidth = column - start;
      commands.push(`M${start} ${row}h${runWidth}v1h-${runWidth}z`);
    }
  }
  return commands.join("");
}

function createSvgDocument(
  width: number,
  height: number,
  background: string | null,
  foreground: string,
  content: string,
) {
  const backgroundRect = background
    ? `<rect width="${width}" height="${height}" fill="${background}"/>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${backgroundRect}<defs><clipPath id="canvas-clip"><rect width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#canvas-clip)" fill="${foreground}">${content}</g></svg>`;
}

export function ImageCanvas({
  outputCanvasRef,
  outputSvgRef,
  image,
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
}: ImageCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourcePixelsRef = useRef<ImageData | null>(null);
  const sourceGrayRef = useRef<Float32Array | null>(null);
  const grayIntegralRef = useRef<GrayIntegral | null>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!image) {
      sourcePixelsRef.current = null;
      sourceGrayRef.current = null;
      grayIntegralRef.current = null;
      processedCanvasRef.current = null;
      outputCanvasRef.current = null;
      outputSvgRef.current = null;
      return;
    }

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;
    const sourceContext = sourceCanvas.getContext("2d");
    sourceContext?.drawImage(image, 0, 0);
    sourcePixelsRef.current = sourceContext?.getImageData(
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
    ) ?? null;

    const sourcePixels = sourcePixelsRef.current;
    if (sourcePixels) {
      const stride = sourcePixels.width + 1;
      const integral = new Float64Array(stride * (sourcePixels.height + 1));
      const grayValues = new Float32Array(sourcePixels.width * sourcePixels.height);
      for (let row = 1; row <= sourcePixels.height; row += 1) {
        let rowSum = 0;
        for (let column = 1; column <= sourcePixels.width; column += 1) {
          const pixelIndex = ((row - 1) * sourcePixels.width + column - 1) * 4;
          const gray = sourcePixels.data[pixelIndex] * 0.299
            + sourcePixels.data[pixelIndex + 1] * 0.587
            + sourcePixels.data[pixelIndex + 2] * 0.114;
          grayValues[(row - 1) * sourcePixels.width + column - 1] = gray;
          rowSum += gray;
          integral[row * stride + column] = integral[(row - 1) * stride + column] + rowSum;
        }
      }
      grayIntegralRef.current = {
        data: integral,
        width: sourcePixels.width,
        height: sourcePixels.height,
        stride,
      };
      sourceGrayRef.current = grayValues;
    }

    const processedCanvas = document.createElement("canvas");
    processedCanvas.width = image.naturalWidth;
    processedCanvas.height = image.naturalHeight;
    processedCanvasRef.current = processedCanvas;
    outputCanvasRef.current = processedCanvas;
  }, [image, outputCanvasRef, outputSvgRef]);

  const drawImage = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const { width, height } = stage.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (!image) return;

    const padding = Math.min(64, Math.max(24, width * 0.055));
    const availableWidth = Math.max(1, width - padding * 2);
    const availableHeight = Math.max(1, height - padding * 2);
    const scale = Math.min(availableWidth / image.naturalWidth, availableHeight / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;

    if (transparentBackground) {
      const checkerSize = 10;
      context.save();
      context.beginPath();
      context.rect(x, y, drawWidth, drawHeight);
      context.clip();
      context.fillStyle = "#f2f2ef";
      context.fillRect(x, y, drawWidth, drawHeight);
      context.fillStyle = "#d2d2ce";
      for (let checkerY = y; checkerY < y + drawHeight; checkerY += checkerSize) {
        for (let checkerX = x; checkerX < x + drawWidth; checkerX += checkerSize) {
          const column = Math.floor((checkerX - x) / checkerSize);
          const row = Math.floor((checkerY - y) / checkerSize);
          if ((column + row) % 2 === 0) context.fillRect(checkerX, checkerY, checkerSize, checkerSize);
        }
      }
      context.restore();
    }

    if (mode === "Halftone" && grayIntegralRef.current && processedCanvasRef.current) {
      const integral = grayIntegralRef.current;
      const processedCanvas = processedCanvasRef.current;
      const processedContext = processedCanvas.getContext("2d");
      if (!processedContext) return;

      const outputWidth = image.naturalWidth;
      const outputHeight = image.naturalHeight;
      const outputGridSize = halftoneSize / scale;
      const centerX = outputWidth / 2;
      const centerY = outputHeight / 2;
      const radians = halftoneAngle * Math.PI / 180;
      const cosine = Math.cos(radians);
      const sine = Math.sin(radians);
      const horizontalX = cosine;
      const horizontalY = sine;
      const verticalX = -sine;
      const verticalY = cosine;
      const gridHalfWidth = Math.abs(cosine) * outputWidth / 2 + Math.abs(sine) * outputHeight / 2;
      const gridHalfHeight = Math.abs(sine) * outputWidth / 2 + Math.abs(cosine) * outputHeight / 2;
      const contrastFactor = halftoneContrast / 100;
      const grainAmount = halftoneGrain / 100;
      const noiseSeed = image.naturalWidth * 31 + image.naturalHeight;

      processedContext.setTransform(1, 0, 0, 1, 0, 0);
      processedContext.clearRect(0, 0, outputWidth, outputHeight);
      if (!transparentBackground) {
        processedContext.fillStyle = halftoneBackground;
        processedContext.fillRect(0, 0, outputWidth, outputHeight);
      }
      processedContext.fillStyle = halftoneForeground;
      processedContext.beginPath();
      const svgElements: string[] = [];

      let rowIndex = 0;
      for (let gridY = -gridHalfHeight; gridY <= gridHalfHeight; gridY += outputGridSize, rowIndex += 1) {
        let columnIndex = 0;
        for (let gridX = -gridHalfWidth; gridX <= gridHalfWidth; gridX += outputGridSize, columnIndex += 1) {
          const pointX = centerX + gridX * cosine - gridY * sine;
          const pointY = centerY + gridX * sine + gridY * cosine;
          if (pointX < 0 || pointX >= outputWidth || pointY < 0 || pointY >= outputHeight) continue;

          const left = Math.max(0, Math.floor(pointX - outputGridSize / 2));
          const top = Math.max(0, Math.floor(pointY - outputGridSize / 2));
          const right = Math.min(integral.width, Math.max(left + 1, Math.ceil(pointX + outputGridSize / 2)));
          const bottom = Math.min(integral.height, Math.max(top + 1, Math.ceil(pointY + outputGridSize / 2)));
          const sum = integral.data[bottom * integral.stride + right]
            - integral.data[top * integral.stride + right]
            - integral.data[bottom * integral.stride + left]
            + integral.data[top * integral.stride + left];
          const averageGray = sum / ((right - left) * (bottom - top));
          if (halftoneCleanBackground && averageGray > 245) continue;
          const leveledGray = Math.max(0, Math.min(255, averageGray + halftoneLevel));
          const contrastedGray = Math.max(0, Math.min(255, (leveledGray - 128) * contrastFactor + 128));
          const sizeNoise = deterministicNoise(columnIndex, rowIndex, noiseSeed);
          const noisyGray = grainAmount === 0
            ? contrastedGray
            : Math.max(0, Math.min(255, contrastedGray + (sizeNoise * 2 - 1) * grainAmount * 48));
          const darkness = 1 - noisyGray / 255;
          let radius = darkness * outputGridSize * 0.5;

          if (grainAmount > 0) {
            const dropoutNoise = deterministicNoise(columnIndex, rowIndex, noiseSeed + 7919);
            const isTinyDot = radius < outputGridSize * 0.22;
            const dropoutChance = grainAmount * (1 - darkness) * 0.32;
            if (isTinyDot && dropoutNoise < dropoutChance) continue;

            if (darkness > 0.72) {
              const shadowStrength = (darkness - 0.72) / 0.28;
              radius += shadowStrength * grainAmount * outputGridSize * 0.08;
            }
          }

          if (radius <= 0.05) continue;

          if (halftoneShape === "Circle") {
            processedContext.moveTo(pointX + radius, pointY);
            processedContext.arc(pointX, pointY, radius, 0, Math.PI * 2);
            svgElements.push(
              `<circle cx="${svgNumber(pointX)}" cy="${svgNumber(pointY)}" r="${svgNumber(radius)}"/>`,
            );
            continue;
          }

          if (halftoneShape === "Square") {
            const points = [
              [pointX + (horizontalX + verticalX) * radius, pointY + (horizontalY + verticalY) * radius],
              [pointX + (-horizontalX + verticalX) * radius, pointY + (-horizontalY + verticalY) * radius],
              [pointX + (-horizontalX - verticalX) * radius, pointY + (-horizontalY - verticalY) * radius],
              [pointX + (horizontalX - verticalX) * radius, pointY + (horizontalY - verticalY) * radius],
            ];
            processedContext.moveTo(
              points[0][0],
              points[0][1],
            );
            for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
              processedContext.lineTo(points[pointIndex][0], points[pointIndex][1]);
            }
            processedContext.closePath();
            svgElements.push(
              `<polygon points="${points.map(([pointXValue, pointYValue]) => `${svgNumber(pointXValue)},${svgNumber(pointYValue)}`).join(" ")}"/>`,
            );
            continue;
          }

          if (halftoneShape === "Diamond") {
            const points = [
              [pointX + horizontalX * radius, pointY + horizontalY * radius],
              [pointX + verticalX * radius, pointY + verticalY * radius],
              [pointX - horizontalX * radius, pointY - horizontalY * radius],
              [pointX - verticalX * radius, pointY - verticalY * radius],
            ];
            processedContext.moveTo(points[0][0], points[0][1]);
            for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
              processedContext.lineTo(points[pointIndex][0], points[pointIndex][1]);
            }
            processedContext.closePath();
            svgElements.push(
              `<polygon points="${points.map(([pointXValue, pointYValue]) => `${svgNumber(pointXValue)},${svgNumber(pointYValue)}`).join(" ")}"/>`,
            );
            continue;
          }

          const halfLength = outputGridSize * 0.5;
          const points = [
            [pointX + horizontalX * halfLength + verticalX * radius, pointY + horizontalY * halfLength + verticalY * radius],
            [pointX - horizontalX * halfLength + verticalX * radius, pointY - horizontalY * halfLength + verticalY * radius],
            [pointX - horizontalX * halfLength - verticalX * radius, pointY - horizontalY * halfLength - verticalY * radius],
            [pointX + horizontalX * halfLength - verticalX * radius, pointY + horizontalY * halfLength - verticalY * radius],
          ];
          processedContext.moveTo(points[0][0], points[0][1]);
          for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
            processedContext.lineTo(points[pointIndex][0], points[pointIndex][1]);
          }
          processedContext.closePath();
          svgElements.push(
            `<polygon points="${points.map(([pointXValue, pointYValue]) => `${svgNumber(pointXValue)},${svgNumber(pointYValue)}`).join(" ")}"/>`,
          );
        }
      }

      processedContext.fill();
      outputSvgRef.current = () => createSvgDocument(
        outputWidth,
        outputHeight,
        transparentBackground ? null : halftoneBackground,
        halftoneForeground,
        svgElements.join(""),
      );
      context.drawImage(processedCanvas, x, y, drawWidth, drawHeight);
      return;
    }

    if (mode === "Dither" && sourcePixelsRef.current && sourceGrayRef.current && processedCanvasRef.current) {
      const sourcePixels = sourcePixelsRef.current;
      const width = sourcePixels.width;
      const height = sourcePixels.height;
      const gridWidth = Math.ceil(width / ditherScale);
      const gridHeight = Math.ceil(height / ditherScale);
      const grayscale = new Float32Array(gridWidth * gridHeight);
      const pixels = new ImageData(
        new Uint8ClampedArray(sourcePixels.data),
        width,
        height,
      );
      const inkMask = new Uint8Array(width * height);

      for (let gridRow = 0; gridRow < gridHeight; gridRow += 1) {
        for (let gridColumn = 0; gridColumn < gridWidth; gridColumn += 1) {
          let sum = 0;
          let count = 0;
          const startX = gridColumn * ditherScale;
          const startY = gridRow * ditherScale;
          for (let sourceY = startY; sourceY < Math.min(startY + ditherScale, height); sourceY += 1) {
            for (let sourceX = startX; sourceX < Math.min(startX + ditherScale, width); sourceX += 1) {
              sum += sourceGrayRef.current[sourceY * width + sourceX];
              count += 1;
            }
          }
          grayscale[gridRow * gridWidth + gridColumn] = sum / count;
        }
      }

      const bayerMatrix = [
        0, 8, 2, 10,
        12, 4, 14, 6,
        3, 11, 1, 9,
        15, 7, 13, 5,
      ];

      function diffuse(column: number, row: number, error: number, weight: number) {
        if (column < 0 || column >= gridWidth || row < 0 || row >= gridHeight) return;
        grayscale[row * gridWidth + column] += error * weight;
      }

      for (let row = 0; row < gridHeight; row += 1) {
        for (let column = 0; column < gridWidth; column += 1) {
          const pixelIndex = row * gridWidth + column;
          const gray = grayscale[pixelIndex];
          const localThreshold = ditherMethod === "Bayer"
            ? ditherThreshold + (bayerMatrix[(row % 4) * 4 + column % 4] / 15 - 0.5) * 192
            : ditherThreshold;
          const value = gray < localThreshold ? 0 : 255;
          const error = gray - value;

          if (ditherMethod === "Floyd-Steinberg") {
            diffuse(column + 1, row, error, 7 / 16);
            diffuse(column - 1, row + 1, error, 3 / 16);
            diffuse(column, row + 1, error, 5 / 16);
            diffuse(column + 1, row + 1, error, 1 / 16);
          } else if (ditherMethod === "Atkinson") {
            diffuse(column + 1, row, error, 1 / 8);
            diffuse(column + 2, row, error, 1 / 8);
            diffuse(column - 1, row + 1, error, 1 / 8);
            diffuse(column, row + 1, error, 1 / 8);
            diffuse(column + 1, row + 1, error, 1 / 8);
            diffuse(column, row + 2, error, 1 / 8);
          }

          const startX = column * ditherScale;
          const startY = row * ditherScale;
          for (let outputY = startY; outputY < Math.min(startY + ditherScale, height); outputY += 1) {
            for (let outputX = startX; outputX < Math.min(startX + ditherScale, width); outputX += 1) {
              const dataIndex = (outputY * width + outputX) * 4;
              pixels.data[dataIndex] = value;
              pixels.data[dataIndex + 1] = value;
              pixels.data[dataIndex + 2] = value;
              if (value === 0) inkMask[outputY * width + outputX] = 1;
              if (transparentBackground && value === 255) pixels.data[dataIndex + 3] = 0;
            }
          }
        }
      }

      const processedCanvas = processedCanvasRef.current;
      processedCanvas.getContext("2d")?.putImageData(pixels, 0, 0);
      outputSvgRef.current = () => createSvgDocument(
        width,
        height,
        transparentBackground ? null : "#ffffff",
        "#000000",
        `<path d="${maskToSvgPath(inkMask, width, height)}"/>`,
      );
      context.drawImage(processedCanvas, x, y, drawWidth, drawHeight);
      return;
    }

    if (mode !== "Threshold" || !sourcePixelsRef.current || !processedCanvasRef.current) {
      context.drawImage(image, x, y, drawWidth, drawHeight);
      return;
    }

    const sourcePixels = sourcePixelsRef.current;
    const ink = hexToRgb(halftoneForeground);
    const paper = hexToRgb(halftoneBackground);
    const contrastFactor = thresholdContrast / 100;
    const adjustedGrays = new Float32Array(sourcePixels.width * sourcePixels.height);
    for (let pixelIndex = 0; pixelIndex < adjustedGrays.length; pixelIndex += 1) {
      const dataIndex = pixelIndex * 4;
      const gray = sourcePixels.data[dataIndex] * 0.299
        + sourcePixels.data[dataIndex + 1] * 0.587
        + sourcePixels.data[dataIndex + 2] * 0.114;
      adjustedGrays[pixelIndex] = Math.max(0, Math.min(255, (gray - 128) * contrastFactor + 128));
    }
    const smoothedGrays = boxBlur(
      adjustedGrays,
      sourcePixels.width,
      sourcePixels.height,
      thresholdSmooth,
    );
    const pixels = new ImageData(
      new Uint8ClampedArray(sourcePixels.data),
      sourcePixels.width,
      sourcePixels.height,
    );
    const inkMask = new Uint8Array(sourcePixels.width * sourcePixels.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const isInk = smoothedGrays[index / 4] < threshold;
      const color = isInk ? ink : paper;
      pixels.data[index] = color.red;
      pixels.data[index + 1] = color.green;
      pixels.data[index + 2] = color.blue;
      if (isInk) inkMask[index / 4] = 1;
      if (transparentBackground && !isInk) pixels.data[index + 3] = 0;
    }

    const processedCanvas = processedCanvasRef.current;
    processedCanvas.getContext("2d")?.putImageData(pixels, 0, 0);
    outputSvgRef.current = () => createSvgDocument(
      sourcePixels.width,
      sourcePixels.height,
      transparentBackground ? null : halftoneBackground,
      halftoneForeground,
      `<path d="${maskToSvgPath(inkMask, sourcePixels.width, sourcePixels.height)}"/>`,
    );
    context.drawImage(processedCanvas, x, y, drawWidth, drawHeight);
  }, [
    image,
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
    outputSvgRef,
  ]);

  useEffect(() => {
    drawImage();
    const observer = new ResizeObserver(drawImage);
    if (stageRef.current) observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [drawImage]);

  return (
    <main className="preview-area">
      <header className="preview-toolbar">
        <span>PREVIEW</span>
        <div>
          {image && <span>{image.naturalWidth} × {image.naturalHeight} PX</span>}
          <span>FIT</span>
        </div>
      </header>
      <div className={`canvas-stage${image ? " has-image" : ""}`} ref={stageRef}>
        <canvas ref={canvasRef} aria-label={fileName ? `Preview of ${fileName}` : "Image preview canvas"} />
        {!image && (
          <div className="empty-state">
            <div className="empty-frame" aria-hidden="true"><span>＋</span></div>
            <p>NO IMAGE LOADED</p>
            <span>Upload a source file to begin</span>
          </div>
        )}
      </div>
      <footer className="status-bar">
        <span>{fileName ?? "READY"}</span>
        <span>CANVAS / RGB</span>
      </footer>
    </main>
  );
}
