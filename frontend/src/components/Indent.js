import { Extension } from '@tiptap/core';

export const Indent = Extension.create({
  name: 'indent',

  priority: 1000,

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote'],
      minLevel: 0,
      maxLevel: 8,
      indentUnit: 2, // 2rem per level
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: element => {
              const dataIndent = element.getAttribute('data-indent');
              if (dataIndent) return parseInt(dataIndent, 10) || 0;
              const margin = element.style.marginInlineStart || element.style.marginLeft || element.style.paddingLeft;
              if (margin) {
                if (margin.endsWith('rem')) {
                  return Math.round(parseFloat(margin) / this.options.indentUnit) || 0;
                }
                if (margin.endsWith('px')) {
                  return Math.round(parseFloat(margin) / (this.options.indentUnit * 16)) || 0;
                }
              }
              return 0;
            },
            renderHTML: attributes => {
              if (!attributes.indent || attributes.indent <= 0) {
                return {};
              }
              return {
                'data-indent': attributes.indent,
                style: `margin-inline-start: ${attributes.indent * this.options.indentUnit}rem;`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent: () => ({ tr, state, dispatch, editor }) => {
        const { selection } = state;
        const { from, to } = selection;

        // 1. Table support: move to next cell
        if (editor.isActive('table')) {
          if (editor.commands.goToNextCell()) {
            return true;
          }
        }

        // 2. Code block support: insert 2 spaces
        if (editor.isActive('codeBlock')) {
          return editor.commands.insertContent('  ');
        }

        // 3. List item support (taskList, bulletList, orderedList)
        let hasListItem = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          const $pos = state.doc.resolve(pos);
          for (let d = $pos.depth; d > 0; d--) {
            const parentName = $pos.node(d).type.name;
            if (parentName === 'listItem' || parentName === 'taskItem') {
              hasListItem = true;
              return false;
            }
          }
        });

        if (hasListItem) {
          let handled = false;
          if (editor.isActive('taskItem') || editor.can().sinkListItem('taskItem')) {
            handled = editor.commands.sinkListItem('taskItem');
          }
          if (!handled && (editor.isActive('listItem') || editor.can().sinkListItem('listItem'))) {
            handled = editor.commands.sinkListItem('listItem');
          }
          // Return true so Tab never loses focus even if sink is not possible on the first item
          return true;
        }

        // 4. Standard block indentation (paragraph, heading, blockquote)
        const applicable = [];
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const $pos = state.doc.resolve(pos);
            let inList = false;
            for (let d = $pos.depth; d > 0; d--) {
              const parentName = $pos.node(d).type.name;
              if (parentName === 'listItem' || parentName === 'taskItem') {
                inList = true;
                break;
              }
            }
            if (!inList) {
              applicable.push({ node, pos });
            }
            return false;
          }
          return true;
        });

        if (applicable.length > 0) {
          if (dispatch) {
            applicable.forEach(({ node, pos }) => {
              const currentIndent = node.attrs.indent || 0;
              const nextIndent = Math.min(currentIndent + 1, this.options.maxLevel);
              if (nextIndent !== currentIndent) {
                tr.setNodeMarkup(pos, node.type, {
                  ...node.attrs,
                  indent: nextIndent,
                });
              }
            });
          }
          return true;
        }

        return true;
      },

      outdent: () => ({ tr, state, dispatch, editor }) => {
        const { selection } = state;
        const { from, to } = selection;

        // 1. Table support: move to previous cell
        if (editor.isActive('table')) {
          if (editor.commands.goToPreviousCell()) {
            return true;
          }
        }

        // 2. Code block support
        if (editor.isActive('codeBlock')) {
          return true;
        }

        // 3. List item support
        let hasListItem = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          const $pos = state.doc.resolve(pos);
          for (let d = $pos.depth; d > 0; d--) {
            const parentName = $pos.node(d).type.name;
            if (parentName === 'listItem' || parentName === 'taskItem') {
              hasListItem = true;
              return false;
            }
          }
        });

        if (hasListItem) {
          let handled = false;
          if (editor.isActive('taskItem') || editor.can().liftListItem('taskItem')) {
            handled = editor.commands.liftListItem('taskItem');
          }
          if (!handled && (editor.isActive('listItem') || editor.can().liftListItem('listItem'))) {
            handled = editor.commands.liftListItem('listItem');
          }
          return true;
        }

        // 4. Standard block indentation
        const applicable = [];
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const $pos = state.doc.resolve(pos);
            let inList = false;
            for (let d = $pos.depth; d > 0; d--) {
              const parentName = $pos.node(d).type.name;
              if (parentName === 'listItem' || parentName === 'taskItem') {
                inList = true;
                break;
              }
            }
            if (!inList) {
              applicable.push({ node, pos });
            }
            return false;
          }
          return true;
        });

        if (applicable.length > 0) {
          if (dispatch) {
            applicable.forEach(({ node, pos }) => {
              const currentIndent = node.attrs.indent || 0;
              const nextIndent = Math.max(currentIndent - 1, this.options.minLevel);
              if (nextIndent !== currentIndent) {
                tr.setNodeMarkup(pos, node.type, {
                  ...node.attrs,
                  indent: nextIndent,
                });
              }
            });
          }
          return true;
        }

        return true;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.indent(),
      'Shift-Tab': () => this.editor.commands.outdent(),
      Backspace: () => {
        const { selection } = this.editor.state;
        if (!selection.empty) return false;

        const { $from } = selection;
        if ($from.parentOffset !== 0) return false;

        const node = $from.parent;
        if (node && node.attrs && node.attrs.indent > 0) {
          for (let d = $from.depth; d > 0; d--) {
            const parentName = $from.node(d).type.name;
            if (parentName === 'listItem' || parentName === 'taskItem') {
              return false;
            }
          }
          return this.editor.commands.outdent();
        }
        return false;
      },
      Enter: () => {
        const { selection } = this.editor.state;
        if (!selection.empty) return false;

        const { $from } = selection;
        const node = $from.parent;
        if (node && node.content.size === 0 && node.attrs && node.attrs.indent > 0) {
          for (let d = $from.depth; d > 0; d--) {
            const parentName = $from.node(d).type.name;
            if (parentName === 'listItem' || parentName === 'taskItem') {
              return false;
            }
          }
          return this.editor.commands.outdent();
        }
        return false;
      },
    };
  },
});
