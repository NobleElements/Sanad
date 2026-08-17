import { NoteShapeUtil } from 'tldraw';

export class CustomNoteShapeUtil extends NoteShapeUtil {
  static type = 'note';

  options = {
    ...this.options,
    resizeMode: 'scale'
  };

  hideResizeHandles(_shape) {
    return false;
  }

  getHandles(_shape) {
    // Remove the default 4 clone/duplicate handles on the edges
    return [];
  }
}
