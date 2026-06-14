import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import ImageResize from 'tiptap-extension-resize-image';
import Link from '@tiptap/extension-link';
import { common, createLowlight } from 'lowlight';
import { useEffect, useRef, useCallback } from 'react';
import { Bold, Italic, Strikethrough, List, ListOrdered, CheckSquare, Code, ImagePlus, Link as LinkIcon } from 'lucide-react';

const lowlight = createLowlight(common);

const MenuBar = ({ editor, onImageUpload }) => {
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

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
      <MenuBar editor={editor} onImageUpload={onImageUpload} />
      <EditorContent editor={editor} className="text-gray-900 dark:text-gray-100" />
    </div>
  );
}
