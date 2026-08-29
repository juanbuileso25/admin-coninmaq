import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Eraser } from "lucide-react";

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  clear: () => void;
  getBlob: () => Promise<Blob | null>;
}

interface Props {
  height?: number;
  label?: string;
}

const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { height = 160, label = "Firma" },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [height]);

  const pointerXY = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastRef.current = pointerXY(e);
    if (empty) setEmpty(false);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pointerXY(e);
    const prev = lastRef.current!;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    lastRef.current = null;
    try { canvasRef.current!.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setEmpty(true);
  };

  useImperativeHandle(ref, () => ({
    isEmpty: () => empty,
    clear,
    getBlob: () =>
      new Promise<Blob | null>((resolve) => {
        if (empty || !canvasRef.current) return resolve(null);
        canvasRef.current.toBlob((b) => resolve(b), "image/png");
      }),
  }), [empty]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-fg-5">{label}</label>
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1 text-[11px] text-fg-6 hover:text-fg-3 transition-colors"
        >
          <Eraser size={11} /> Limpiar
        </button>
      </div>
      <div
        ref={wrapperRef}
        className="w-full border border-border bg-white rounded-sm overflow-hidden"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="block touch-none cursor-crosshair"
        />
      </div>
      {empty && (
        <p className="text-[10px] text-fg-6 mt-1">Dibuje la firma con el mouse o el dedo</p>
      )}
    </div>
  );
});

export default SignaturePad;
