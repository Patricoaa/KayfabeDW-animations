import React from 'react';

// Audio upload as a data URL with an inline <audio> preview + clear affordance.

export function AudioUploadInput({label, value, onLoad, onClear}: {label: string; value?: string; onLoad: (dataUrl: string) => void; onClear: () => void}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const id = React.useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium mb-1 block">{label}</label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="audio/*"
        aria-label={label}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') onLoad(reader.result);
          };
          reader.readAsDataURL(file);
          e.target.value = '';
        }}
        className="w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-elevated file:px-3 file:py-2 file:text-sm file:font-medium"
      />
      {value && (
        <div className="flex items-center gap-2 mt-1">
          <audio controls src={value} style={{height: 32}} className="rounded border border-border-default" />
          <button type="button" onClick={() => {onClear(); if (inputRef.current) inputRef.current.value = '';}} className="text-[10px] text-muted hover:text-red-500">
            Quitar sonido
          </button>
        </div>
      )}
    </div>
  );
}