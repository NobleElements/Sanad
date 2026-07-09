import { Extension } from '@tiptap/core';

export const TextDirection = Extension.create({
  name: 'textDirection',

  addOptions() {
    return {
      types: ['heading', 'paragraph', 'bulletList', 'orderedList', 'taskList'],
      directions: ['ltr', 'rtl', 'auto'],
      defaultDirection: 'auto',
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          dir: {
            default: this.options.defaultDirection,
            parseHTML: element => element.dir || this.options.defaultDirection,
            renderHTML: attributes => {
              return { dir: attributes.dir || this.options.defaultDirection };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextDirection: direction => ({ commands }) => {
        if (!this.options.directions.includes(direction)) {
          return false;
        }
        
        // Use forEach to apply to any valid type in the selection
        let anyUpdated = false;
        this.options.types.forEach(type => {
          if (commands.updateAttributes(type, { dir: direction })) {
            anyUpdated = true;
          }
        });
        
        return anyUpdated;
      },
      
      toggleTextDirection: () => ({ editor, commands }) => {
        const activeTypes = this.options.types.filter(type => editor.isActive(type));
        if (activeTypes.length === 0) {
          return false;
        }
        
        const currentDir = editor.getAttributes(activeTypes[0]).dir || this.options.defaultDirection;
        const newDir = currentDir === 'rtl' ? 'ltr' : 'rtl';
        
        let anyUpdated = false;
        activeTypes.forEach(type => {
          if (commands.updateAttributes(type, { dir: newDir })) {
            anyUpdated = true;
          }
        });
        
        return anyUpdated;
      },
    };
  },
  
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-l': () => this.editor.commands.setTextDirection('ltr'),
      'Mod-Shift-r': () => this.editor.commands.setTextDirection('rtl'),
    };
  },
});
