import { useEditor, EditorContent, Extension } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import ImageResize from 'tiptap-extension-resize-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { common, createLowlight } from 'lowlight';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Bold, Italic, Strikethrough, List, ListOrdered, CheckSquare, Code, ImagePlus, Link as LinkIcon, Table as TableIcon, Trash2, Plus, Minus, Columns, Rows } from 'lucide-react';

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

const lowlight = createLowlight(common);

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "30px", "36px"];

const MenuBar = ({ editor, onImageUpload, currentFontSize }) => {
  if (!editor) {
    return null;
  }

  const fileInputRef = useRef(null);

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleStrike = () => editor.chain().focus().toggleStrike().run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  const toggleTaskList = () => editor.chain().focus().toggleTaskList().run();
  const toggleCodeBlock = () => editor.chain().focus().toggleCodeBlock().run();
  const insertTable = () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleImageClick = () => {
    if (onImageUpload) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      const url = await onImageUpload(file);
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const btnClass = (isActive) =>
    `p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
      isActive ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'text-gray-600 dark:text-gray-400'
    }`;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
      <button onClick={toggleBold} className={btnClass(editor.isActive('bold'))} aria-label="Bold">
        <Bold className="w-4 h-4" />
      </button>
      <button onClick={toggleItalic} className={btnClass(editor.isActive('italic'))} aria-label="Italic">
        <Italic className="w-4 h-4" />
      </button>
      <button onClick={toggleStrike} className={btnClass(editor.isActive('strike'))} aria-label="Strikethrough">
        <Strikethrough className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

      <select
        className="bg-transparent text-sm text-gray-700 dark:text-gray-200 border-none outline-none cursor-pointer focus:ring-0 p-1"
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontSize(e.target.value).run();
          }
        }}
        value={currentFontSize}
      >
        {currentFontSize === '' && (
          <option value="">-</option>
        )}
        {currentFontSize !== '' && !FONT_SIZES.includes(currentFontSize) && (
          <option value={currentFontSize} hidden>{currentFontSize}</option>
        )}
        {FONT_SIZES.map(size => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>
      
      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
      
      <button onClick={toggleBulletList} className={btnClass(editor.isActive('bulletList'))} aria-label="Bullet List">
        <List className="w-4 h-4" />
      </button>
      <button onClick={toggleOrderedList} className={btnClass(editor.isActive('orderedList'))} aria-label="Ordered List">
        <ListOrdered className="w-4 h-4" />
      </button>
      <button onClick={toggleTaskList} className={btnClass(editor.isActive('taskList'))} aria-label="Task List">
        <CheckSquare className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

      <button onClick={toggleCodeBlock} className={btnClass(editor.isActive('codeBlock'))} aria-label="Code Block">
        <Code className="w-4 h-4" />
      </button>
      <button onClick={setLink} className={btnClass(editor.isActive('link'))} aria-label="Add Link">
        <LinkIcon className="w-4 h-4" />
      </button>
      <input
        type="color"
        onInput={event => editor.chain().focus().setColor(event.target.value).run()}
        value={editor.getAttributes('textStyle').color || '#000000'}
        className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer rounded-sm ml-1"
        title="Text Color"
      />
      <button onClick={insertTable} className={btnClass(editor.isActive('table'))} aria-label="Insert Table">
        <TableIcon className="w-4 h-4" />
      </button>
      {onImageUpload && (
        <>
          <button onClick={handleImageClick} className={btnClass(false)} aria-label="Insert Image">
            <ImagePlus className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </>
      )}
    </div>
  );
};

export default function TipTapEditor({ content, onChange, onImageUpload }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      ImageResize.configure({
        inline: false,
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'divide-x divide-gray-200 dark:divide-gray-700',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'bg-gray-50 dark:bg-gray-800 p-2 font-semibold text-left text-gray-900 dark:text-gray-100',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'p-2',
        },
      }),
      Color,
      TextStyle,
      FontSize,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'p-3 min-h-[100px] focus:outline-none tiptap-editor',
      },
    },
  });

  const [currentFontSize, setCurrentFontSize] = useState('16px');

  useEffect(() => {
    if (!editor) return;

    const updateFontSize = () => {
      const { from, to, empty } = editor.state.selection;
      let sizes = new Set();
      
      if (empty) {
        const explicitSize = editor.getAttributes('textStyle').fontSize;
        if (explicitSize) {
          sizes.add(explicitSize);
        } else {
          sizes.add('default');
        }
      } else {
        let hasText = false;
        editor.state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.isText) {
            const MathMax = Math.max;
            const MathMin = Math.min;
            if (MathMax(from, pos) < MathMin(to, pos + node.nodeSize)) {
              hasText = true;
              const textStyle = node.marks.find(m => m.type.name === 'textStyle');
              if (textStyle && textStyle.attrs.fontSize) {
                sizes.add(textStyle.attrs.fontSize);
              } else {
                sizes.add('default');
              }
            }
          }
        });
        if (!hasText) {
          setCurrentFontSize('');
          return;
        }
      }

      if (sizes.size > 1) {
        setCurrentFontSize('');
        return;
      }
      
      let size = sizes.values().next().value;
      
      if (size !== 'default' && size !== undefined) {
        setCurrentFontSize(size);
        return;
      }
      
      try {
        const dom = editor.view.domAtPos(from);
        let node = dom.node;
        if (node && node.nodeType !== 1) {
          node = node.parentElement;
        }

        if (node && node.nodeType === 1) {
          const computedSize = window.getComputedStyle(node).fontSize;
          if (computedSize) {
            setCurrentFontSize(`${Math.round(parseFloat(computedSize))}px`);
            return;
          }
        }
      } catch (e) {
        // ignore
      }
      setCurrentFontSize('16px');
    };

    editor.on('transaction', updateFontSize);
    editor.on('selectionUpdate', updateFontSize);
    
    // Set initial size
    updateFontSize();

    return () => {
      editor.off('transaction', updateFontSize);
      editor.off('selectionUpdate', updateFontSize);
    };
  }, [editor]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
      <MenuBar editor={editor} onImageUpload={onImageUpload} currentFontSize={currentFontSize} />
      {editor && (
        <>
          {/* Table Bubble Menu */}
          <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} shouldShow={({ editor, from, to }) => editor.isActive('table') && from === to}>
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="flex items-center gap-0.5 p-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" title="Add Column">
                <Plus className="w-3 h-3" />
                <Columns className="w-4 h-4" />
              </button>
              <button onClick={() => editor.chain().focus().deleteColumn().run()} className="flex items-center gap-0.5 p-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" title="Delete Column">
                <Minus className="w-3 h-3" />
                <Columns className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
              <button onClick={() => editor.chain().focus().addRowAfter().run()} className="flex items-center gap-0.5 p-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" title="Add Row">
                <Plus className="w-3 h-3" />
                <Rows className="w-4 h-4" />
              </button>
              <button onClick={() => editor.chain().focus().deleteRow().run()} className="flex items-center gap-0.5 p-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" title="Delete Row">
                <Minus className="w-3 h-3" />
                <Rows className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
              <button onClick={() => editor.chain().focus().deleteTable().run()} className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors" title="Delete Table">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </BubbleMenu>

          {/* Text Formatting Bubble Menu */}
          <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} shouldShow={({ editor, from, to }) => from !== to && !editor.isActive('image')}>
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('bold') ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'text-gray-600 dark:text-gray-400'}`} aria-label="Bold">
                <Bold className="w-4 h-4" />
              </button>
              <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('italic') ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'text-gray-600 dark:text-gray-400'}`} aria-label="Italic">
                <Italic className="w-4 h-4" />
              </button>
              <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('strike') ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'text-gray-600 dark:text-gray-400'}`} aria-label="Strikethrough">
                <Strikethrough className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
              <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('codeBlock') ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'text-gray-600 dark:text-gray-400'}`} aria-label="Code Block">
                <Code className="w-4 h-4" />
              </button>
              <select
                className="bg-transparent text-sm text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500 p-1 ml-1"
                onChange={(e) => {
                  if (e.target.value) {
                    editor.chain().focus().setFontSize(e.target.value).run();
                  }
                }}
                value={currentFontSize}
              >
                {currentFontSize === '' && (
                  <option value="">-</option>
                )}
                {currentFontSize !== '' && !FONT_SIZES.includes(currentFontSize) && (
                  <option value={currentFontSize} hidden>{currentFontSize}</option>
                )}
                {FONT_SIZES.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <input
                type="color"
                onInput={event => editor.chain().focus().setColor(event.target.value).run()}
                value={editor.getAttributes('textStyle').color || '#000000'}
                className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer rounded-sm ml-1"
                title="Text Color"
              />
            </div>
          </BubbleMenu>
        </>
      )}
      <EditorContent editor={editor} className="text-gray-900 dark:text-gray-100" />
    </div>
  );
}
