import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value:       string;
  onChange:    (value: string) => void;
  options:     SelectOption[];
  placeholder?: string;
  clearable?:  boolean;
  disabled?:   boolean;
}

export default function Select({
  value, onChange, options, placeholder = "Seleccionar...", clearable = false, disabled = false,
}: Props) {
  const [open, setOpen]         = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const buttonRef               = useRef<HTMLButtonElement>(null);
  const dropdownRef             = useRef<HTMLDivElement>(null);
  const selected                = options.find((o) => o.value === value);

  // Position the portal dropdown below the trigger button
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top:      rect.bottom + 4,
      left:     rect.left,
      width:    rect.width,
      zIndex:   9999,
    });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on scroll/resize so it doesn't drift
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 bg-surface-3 border rounded-sm px-4 py-3 text-sm text-left transition-colors
          ${open ? "border-accent/60" : "border-border hover:border-border-light"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={`flex-1 truncate ${selected ? "text-fg" : "text-fg-6"}`}>
          {selected ? selected.label : placeholder}
        </span>
        {clearable && selected ? (
          <span onClick={handleClear} className="p-0.5 text-fg-6 hover:text-fg transition-colors cursor-pointer">
            <X size={12} />
          </span>
        ) : (
          <ChevronDown
            size={14}
            className={`flex-shrink-0 transition-transform text-fg-6 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-surface-2 border border-border shadow-lg max-h-52 overflow-y-auto"
        >
          {clearable && (
            <button
              type="button"
              onMouseDown={() => { onChange(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-fg-6 hover:bg-surface-3 transition-colors italic"
            >
              {placeholder}
            </button>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-surface-3 transition-colors
                         ${value === opt.value ? "text-accent font-medium" : "text-fg-2"}`}
            >
              {opt.label}
              {value === opt.value && <Check size={13} className="text-accent flex-shrink-0" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
