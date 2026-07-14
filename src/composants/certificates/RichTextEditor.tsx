import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import ImageExt from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Extension, type ChainedCommands } from '@tiptap/core';
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ImageIcon, Table2, Link2, Undo2, Redo2, Unlink,
} from 'lucide-react';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.fontSize || null,
          renderHTML: (attributes: { fontSize?: string | null }) => {
            if (!attributes.fontSize) return {};
            return { style: `font-size: ${attributes.fontSize}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: { chain: () => ChainedCommands }) =>
        chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: { chain: () => ChainedCommands }) =>
        chain().setMark('textStyle', { fontSize: null }).run(),
    };
  },
});

function readImageAsDataUrl(file: File, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('Not an image')); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ToolbarButton({ active, disabled, onClick, title, children }: {
  active?: boolean; disabled?: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function LinkControl({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const openPopover = () => {
    setUrl(editor.getAttributes('link').href || '');
    setOpen(v => !v);
  };

  const apply = () => {
    const chain = editor.chain().focus();
    if (url.trim()) chain.extendMarkRange('link').setLink({ href: url.trim() }).run();
    else chain.extendMarkRange('link').unsetLink().run();
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <ToolbarButton active={editor.isActive('link')} onClick={openPopover} title="Insert link">
        <Link2 size={15} />
      </ToolbarButton>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-2 flex items-center gap-1.5">
          <input
            autoFocus
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } if (e.key === 'Escape') setOpen(false); }}
            placeholder="https://…"
            className="flex-1 min-w-0 text-xs px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={apply} className="text-xs font-medium px-2 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shrink-0">Set</button>
          {editor.isActive('link') && (
            <button onClick={() => { editor.chain().focus().unsetLink().run(); setOpen(false); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md shrink-0" title="Remove link">
              <Unlink size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const EDITOR_STYLE = `
.certdoc-editor .ProseMirror { outline: none; min-height: 340px; font-size: 13px; line-height: 1.65; }
.certdoc-editor .ProseMirror p { margin: 0 0 0.6em; }
.certdoc-editor .ProseMirror ul { list-style: disc; padding-left: 1.4em; margin: 0 0 0.6em; }
.certdoc-editor .ProseMirror ol { list-style: decimal; padding-left: 1.4em; margin: 0 0 0.6em; }
.certdoc-editor .ProseMirror h1, .certdoc-editor .ProseMirror h2, .certdoc-editor .ProseMirror h3 { font-weight: 700; margin: 0.8em 0 0.4em; }
.certdoc-editor .ProseMirror img { max-width: 100%; border-radius: 4px; }
.certdoc-editor .ProseMirror a { color: #4f46e5; text-decoration: underline; }
.certdoc-editor .ProseMirror table { border-collapse: collapse; margin: 0.6em 0; width: 100%; }
.certdoc-editor .ProseMirror td, .certdoc-editor .ProseMirror th { border: 1px solid #cbd5e1; padding: 4px 8px; vertical-align: top; }
.certdoc-editor .ProseMirror th { background: #f8fafc; font-weight: 600; }
.certdoc-editor .ProseMirror:focus-within { }
.certdoc-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder); float: left; color: #94a3b8; pointer-events: none; height: 0;
}
`;

interface RichTextEditorProps {
  initialContent: string;
  editable: boolean;
  onChange: (html: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onEditorReady?: (editor: Editor) => void;
}

export default function RichTextEditor({ initialContent, editable, onChange, onFocus, onBlur, onEditorReady }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ImageExt.configure({ inline: true, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onFocus: () => onFocus?.(),
    onBlur: () => onBlur?.(),
  }, []);

  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  const insertImage = async (file: File) => {
    try {
      const dataUrl = await readImageAsDataUrl(file, 900, 0.85);
      editor.chain().focus().setImage({ src: dataUrl }).run();
    } catch (err) { console.error('Failed to insert image:', err); }
  };

  return (
    <div className="certdoc-editor flex flex-col h-full">
      <style>{EDITOR_STYLE}</style>
      <div className={`flex flex-wrap items-center gap-0.5 border-b border-slate-200 px-2 py-1.5 sticky top-0 bg-white z-10 ${!editable ? 'opacity-50 pointer-events-none' : ''}`}>
        <select
          title="Font family"
          onMouseDown={e => e.stopPropagation()}
          onChange={e => {
            const v = e.target.value;
            if (!v) editor.chain().focus().unsetFontFamily().run();
            else editor.chain().focus().setFontFamily(v).run();
          }}
          className="text-xs border border-slate-200 rounded-md px-1.5 py-1 mr-1 max-w-28 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          defaultValue=""
        >
          <option value="">Default font</option>
          <option value="Georgia, 'Times New Roman', serif">Georgia</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="'Segoe UI', sans-serif">Segoe UI</option>
          <option value="Verdana, sans-serif">Verdana</option>
          <option value="'Courier New', monospace">Courier New</option>
        </select>

        <select
          title="Font size"
          onMouseDown={e => e.stopPropagation()}
          onChange={e => {
            const v = e.target.value;
            if (!v) editor.chain().focus().unsetFontSize().run();
            else editor.chain().focus().setFontSize(v).run();
          }}
          className="text-xs border border-slate-200 rounded-md px-1.5 py-1 mr-1.5 w-16 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          defaultValue=""
        >
          <option value="">Size</option>
          {[10, 11, 12, 13, 14, 16, 18, 20, 24, 28].map(s => <option key={s} value={`${s}px`}>{s}</option>)}
        </select>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough size={15} /></ToolbarButton>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        <ToolbarButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left"><AlignLeft size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align center"><AlignCenter size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right"><AlignRight size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify"><AlignJustify size={15} /></ToolbarButton>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><List size={15} /></ToolbarButton>
        <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered size={15} /></ToolbarButton>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) insertImage(f); e.target.value = ''; }} />
        <ToolbarButton onClick={() => imageInputRef.current?.click()} title="Insert image"><ImageIcon size={15} /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table"><Table2 size={15} /></ToolbarButton>
        <LinkControl editor={editor} />

        <div className="w-px h-5 bg-slate-200 mx-1" />

        <ToolbarButton disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo2 size={15} /></ToolbarButton>
        <ToolbarButton disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo2 size={15} /></ToolbarButton>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
