"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Search } from "lucide-react";

interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectDropdownProps {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (vals: string[]) => void;
  searchPlaceholder?: string;
}

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  searchPlaceholder,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (val: string) => {
    onChange(
      selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]
    );
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-10 flex items-center gap-2 px-3 rounded-xl border border-slate-200 bg-white text-sm hover:border-orange-300 transition-colors min-w-[120px] cursor-pointer"
      >
        {selected.length === 0 ? (
          <>
            <span className="text-slate-500">{label}</span>
            <ChevronDown size={14} className="text-slate-400 ml-auto" />
          </>
        ) : (
          <div className="flex items-center gap-1 flex-wrap max-w-[280px]">
            {selected.slice(0, 3).map((val) => {
              const opt = options.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 text-xs font-medium"
                >
                  {opt?.label || val}
                  <X
                    size={12}
                    className="cursor-pointer hover:text-orange-900"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(val);
                    }}
                  />
                </span>
              );
            })}
            {selected.length > 3 && (
              <span className="text-xs text-orange-600 font-medium">+{selected.length - 3}</span>
            )}
            <ChevronDown size={14} className="text-slate-400 ml-auto shrink-0" />
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1 left-0 min-w-[260px] bg-white rounded-xl border border-slate-200 shadow-lg z-50 py-2">
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-slate-50 border border-slate-200">
              <Search size={14} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder || `Cari ${label.toLowerCase()}...`}
                className="flex-1 text-sm bg-transparent outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 pb-2 text-xs">
            <button
              type="button"
              onClick={() => onChange(options.map((o) => o.value))}
              className="text-orange-600 hover:underline font-medium cursor-pointer"
            >
              Pilih Semua
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-orange-600 hover:underline font-medium cursor-pointer"
            >
              Hapus Semua
            </button>
            <span className="ml-auto text-slate-400">
              {selected.length}/{options.length}
            </span>
          </div>

          <div className="max-h-[200px] overflow-y-auto px-1">
            {filtered.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-3 px-3 py-2 hover:bg-orange-50/50 rounded-lg cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 accent-orange-500"
                />
                <div>
                  <p className="text-sm text-slate-700">{opt.label}</p>
                  {opt.sublabel && (
                    <p className="text-xs text-slate-400">{opt.sublabel}</p>
                  )}
                </div>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-3">Tidak ditemukan</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
