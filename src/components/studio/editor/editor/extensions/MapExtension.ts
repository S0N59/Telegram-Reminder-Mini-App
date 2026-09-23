import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mapBlock: {
      insertMapBlock: (attributes: {
        latitude: number;
        longitude: number;
        title?: string;
        address?: string;
      }) => ReturnType;
    };
  }
}

export const MapExtension = Node.create({
  name: 'mapBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      latitude: {
        default: 40.7128,
        parseHTML: (element) => parseFloat(element.getAttribute('data-lat') || '40.7128'),
        renderHTML: (attributes) => ({ 'data-lat': attributes.latitude }),
      },
      longitude: {
        default: -74.006,
        parseHTML: (element) => parseFloat(element.getAttribute('data-lng') || '-74.0060'),
        renderHTML: (attributes) => ({ 'data-lng': attributes.longitude }),
      },
      title: {
        default: 'Location Pin',
        parseHTML: (element) => element.getAttribute('data-title') || 'Location Pin',
        renderHTML: (attributes) => ({ 'data-title': attributes.title }),
      },
      address: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-address') || '',
        renderHTML: (attributes) => ({ 'data-address': attributes.address }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="tg-map"]' },
      { tag: 'div.tiptap-map-block' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const title = HTMLAttributes['data-title'] || 'Location Pin';
    const address = HTMLAttributes['data-address'] || '';
    const lat = HTMLAttributes['data-lat'] || '0';
    const lng = HTMLAttributes['data-lng'] || '0';

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'tiptap-map-block',
        'data-type': 'tg-map',
      }),
      ['div', { class: 'tiptap-map-badge' }, '📍 Telegram Map'],
      ['div', { class: 'tiptap-map-title' }, title],
      address ? ['div', { class: 'tiptap-map-address' }, address] : ['span', {}],
      ['div', { class: 'tiptap-map-coords' }, `Geo: ${lat}, ${lng}`],
    ];
  },

  addCommands() {
    return {
      insertMapBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});
