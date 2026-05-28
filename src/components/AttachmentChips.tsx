import React, { useCallback, useEffect } from 'react';
import { useStore, type ComposerAttachment } from '@/store/useStore';
import { IconX, IconFile, IconSpark } from './icons/BrandIcons';

const MAX_TEXT_BYTES  = 256 * 1024;       // 256 KB per text file
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;  // 4 MB per image — bigger blew the heap on 8 GB Macs
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function uid() {
  return `att_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function bytesLabel(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function useDropTarget(elRef: React.RefObject<HTMLElement>) {
  const { addAttachment } = useStore();

  const ingestFile = useCallback(async (file: File): Promise<ComposerAttachment | null> => {
    if (IMAGE_TYPES.has(file.type)) {
      if (file.size > MAX_IMAGE_BYTES) return null;
      const data = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onerror = () => reject(fr.error);
        fr.onload = () => resolve(String(fr.result));
        fr.readAsDataURL(file);
      });
      return { id: uid(), kind: 'image', name: file.name || 'image.png', size: file.size, content: data };
    }
    if (file.size > MAX_TEXT_BYTES) return null;
    const text = await file.text();
    return { id: uid(), kind: 'text', name: file.name, size: file.size, content: text };
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    let overlayCount = 0;
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      e.preventDefault();
      overlayCount += 1;
      el.classList.add('ring-2', 'ring-accent/50');
    };
    const onDragLeave = (e: DragEvent) => {
      overlayCount = Math.max(0, overlayCount - 1);
      if (overlayCount === 0) el.classList.remove('ring-2', 'ring-accent/50');
    };
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      overlayCount = 0;
      el.classList.remove('ring-2', 'ring-accent/50');
      const files = Array.from(e.dataTransfer?.files ?? []);
      for (const f of files) {
        const att = await ingestFile(f);
        if (att) addAttachment(att);
      }
    };
    const onPaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const files: File[] = [];
      for (const item of items) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length === 0) return;
      // Don't intercept the text-paste path.
      e.preventDefault();
      for (const f of files) {
        const att = await ingestFile(f);
        if (att) addAttachment(att);
      }
    };
    el.addEventListener('dragenter', onDragEnter);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('drop', onDrop);
    el.addEventListener('paste', onPaste as any);
    return () => {
      el.removeEventListener('dragenter', onDragEnter);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('drop', onDrop);
      el.removeEventListener('paste', onPaste as any);
    };
  }, [elRef, ingestFile, addAttachment]);
}

export const AttachmentChips: React.FC = () => {
  const { attachments, removeAttachment } = useStore();
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-2">
      {attachments.map((a) => (
        <div
          key={a.id}
          className="group flex items-center gap-1.5 px-2 py-1 rounded-md bg-ink-800/80 border border-white/[0.05] text-[11.5px] text-ink-200"
          title={`${a.name} · ${bytesLabel(a.size)}`}
        >
          {a.kind === 'image'
            ? <img src={a.content} alt="" className="w-4 h-4 rounded-sm object-cover" />
            : <IconFile size={12} className="text-ink-400" />
          }
          <span className="max-w-[160px] truncate">{a.name}</span>
          <span className="text-ink-500">·</span>
          <span className="text-ink-500">{bytesLabel(a.size)}</span>
          <button
            className="ml-1 opacity-60 group-hover:opacity-100 text-ink-400 hover:text-rose-300"
            onClick={() => removeAttachment(a.id)}
          >
            <IconX size={10} />
          </button>
        </div>
      ))}
    </div>
  );
};
