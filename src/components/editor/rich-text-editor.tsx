'use client';

import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { cn } from '@/lib/cn';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Minus,
  ImagePlus,
  Highlighter,
  Undo,
  Redo,
  Code,
  Type,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  minHeight?: string;
}

// ─── Toolbar button ──────────────────────────────────
function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-all duration-150',
        active
          ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-700 dark:hover:text-gray-200',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-5 bg-gray-200 dark:bg-violet-500/20 mx-0.5" />;
}

// ─── Main Editor ─────────────────────────────────────
export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Inizia a scrivere...',
  editable = true,
  className,
  minHeight = '240px',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
          'prose-headings:font-bold prose-headings:tracking-tight',
          'prose-h1:text-xl prose-h1:mb-3 prose-h1:mt-4',
          'prose-h2:text-lg prose-h2:mb-2 prose-h2:mt-3',
          'prose-h3:text-base prose-h3:mb-2 prose-h3:mt-2',
          'prose-p:text-sm prose-p:leading-relaxed prose-p:mb-2',
          'prose-li:text-sm prose-li:leading-relaxed',
          'prose-blockquote:border-violet-400 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-300',
          'prose-strong:text-gray-900 dark:prose-strong:text-white',
          'prose-img:rounded-xl prose-img:border prose-img:border-gray-200 dark:prose-img:border-violet-500/20 prose-img:shadow-sm',
          'prose-hr:border-gray-200 dark:prose-hr:border-violet-500/15',
          'prose-code:text-violet-600 dark:prose-code:text-violet-400 prose-code:bg-violet-50 dark:prose-code:bg-violet-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs',
        ),
        style: `min-height: ${minHeight}; padding: 16px;`,
      },
    },
  });

  // Aggiornamento contenuto esterno
  React.useEffect(() => {
    if (editor && content !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // Immagine: file input nascosto
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onImageFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      if (!file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('Immagine troppo grande (max 5MB)');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        editor.chain().focus().setImage({ src: result }).run();
      };
      reader.readAsDataURL(file);
      // Reset input
      e.target.value = '';
    },
    [editor]
  );

  if (!editor) return null;

  const iconSize = 'h-3.5 w-3.5';

  return (
    <div className={cn('rounded-xl border border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#161622] overflow-hidden', className)}>
      {/* ─── Toolbar ─── */}
      {editable && (
        <div className="flex items-center gap-0.5 flex-wrap px-2.5 py-1.5 border-b border-gray-100 dark:border-violet-500/15 bg-gray-50/80 dark:bg-[#0a0a0f]/40">
          {/* Testo normale / Heading */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().setParagraph().run()}
            active={editor.isActive('paragraph') && !editor.isActive('heading')}
            title="Testo normale"
          >
            <Type className={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Titolo 1"
          >
            <Heading1 className={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Titolo 2"
          >
            <Heading2 className={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Titolo 3"
          >
            <Heading3 className={iconSize} />
          </ToolbarBtn>

          <ToolbarSep />

          {/* Formattazione inline */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Grassetto"
          >
            <Bold className={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Corsivo"
          >
            <Italic className={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Sottolineato"
          >
            <UnderlineIcon className={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Barrato"
          >
            <Strikethrough className={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive('highlight')}
            title="Evidenzia"
          >
            <Highlighter className={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Codice inline"
          >
            <Code className={iconSize} />
          </ToolbarBtn>

          <ToolbarSep />

          {/* Allineamento */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            title="Allinea a sinistra"
          >
            <AlignLeft className={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            title="Centra"
          >
            <AlignCenter className={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            title="Allinea a destra"
          >
            <AlignRight className={iconSize} />
          </ToolbarBtn>

          <ToolbarSep />

          {/* Liste e blocchi */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Elenco puntato"
          >
            <List className={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Elenco numerato"
          >
            <ListOrdered className={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Citazione"
          >
            <Quote className={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Linea orizzontale"
          >
            <Minus className={iconSize} />
          </ToolbarBtn>

          <ToolbarSep />

          {/* Immagine */}
          <ToolbarBtn onClick={handleImageUpload} title="Inserisci immagine">
            <ImagePlus className={iconSize} />
          </ToolbarBtn>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Undo/Redo */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Annulla"
          >
            <Undo className={iconSize} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Ripeti"
          >
            <Redo className={iconSize} />
          </ToolbarBtn>
        </div>
      )}

      {/* ─── Editor content ─── */}
      <EditorContent editor={editor} />

      {/* Input file nascosto per immagini */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onImageFileChange}
        className="hidden"
      />
    </div>
  );
}

// ─── ReadOnly viewer (per quando non si edita) ───────
export function RichTextViewer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        'prose-headings:font-bold prose-headings:tracking-tight',
        'prose-h1:text-xl prose-h1:mb-3 prose-h2:text-lg prose-h2:mb-2 prose-h3:text-base prose-h3:mb-2',
        'prose-p:text-sm prose-p:leading-relaxed prose-p:mb-2',
        'prose-li:text-sm prose-li:leading-relaxed',
        'prose-blockquote:border-violet-400 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-300',
        'prose-strong:text-gray-900 dark:prose-strong:text-white',
        'prose-img:rounded-xl prose-img:border prose-img:border-gray-200 dark:prose-img:border-violet-500/20 prose-img:shadow-sm',
        'prose-code:text-violet-600 dark:prose-code:text-violet-400 prose-code:bg-violet-50 dark:prose-code:bg-violet-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs',
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
