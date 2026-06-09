import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useEffect } from 'react';
import { Bold, Italic, Strikethrough, List, ListOrdered, CheckSquare } from 'lucide-react';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleStrike = () => editor.chain().focus().toggleStrike().run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  const toggleTaskList = () => editor.chain().focus().toggleTaskList().run();

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
    </div>
  );
};

export default function TipTapEditor({ content, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'p-4 min-h-[150px] focus:outline-none tiptap-editor',
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
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="text-gray-900 dark:text-gray-100" />
    </div>
  );
}
