"use client";

import { useId, useRef, useState } from "react";
import { fmtSize } from "@/lib/api";
import { UploadIcon } from "./Icons";

export const ACCEPT = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
export const MAX_MB = 10;
export const MAX_FILES = 10;

/** Pick several files, see them listed, and remove any before sending. Files are kept only in memory, never in browser storage. */
export default function FileUploader({
  files,
  onChange,
  max = MAX_FILES,
  maxMb = MAX_MB,
  progress,
  label = "Add documents",
}: {
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
  maxMb?: number;
  progress?: number | null;
  label?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [over, setOver] = useState(false);

  function add(list: FileList | null) {
    const errs: string[] = [];
    const next = [...files];
    for (const f of Array.from(list || [])) {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPT.includes(ext)) errs.push(`${f.name}: only PDF, Word (.doc, .docx), JPG and PNG files can be uploaded.`);
      else if (f.size > maxMb * 1024 * 1024) errs.push(`${f.name} is ${fmtSize(f.size)}. The limit is ${maxMb} MB per file.`);
      else if (f.size === 0) errs.push(`${f.name} is empty.`);
      else if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
      else if (next.length >= max) errs.push(`You can add up to ${max} files at a time. You can send more later.`);
      else next.push(f);
    }
    setErrors(errs);
    onChange(next);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="uploader">
      <label
        htmlFor={id}
        className={`drop${over ? " over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
      >
        <UploadIcon />
        <span>
          <b>{label}</b>
          <small>
            PDF, DOC, DOCX, JPG or PNG · up to {maxMb} MB each · up to {max} files
          </small>
        </span>
      </label>
      <input ref={input} id={id} className="sr-only" type="file" multiple accept={ACCEPT.join(",")} onChange={(e) => add(e.target.files)} />
      {errors.length > 0 && (
        <ul className="err" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {files.length > 0 && (
        <ul className="filelist">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <span className="fname">{f.name}</span>
              <span className="note">{fmtSize(f.size)}</span>
              <button type="button" className="linkbtn" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} disabled={progress != null}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {progress != null && (
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Upload progress">
          <i style={{ width: `${progress}%` }} />
          <span>{progress < 100 ? `Uploading… ${progress}%` : "Processing…"}</span>
        </div>
      )}
    </div>
  );
}
