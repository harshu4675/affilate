import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../../src/App.jsx';
export function mount(el) {
  const root = createRoot(el);
  root.render(React.createElement(App));
  return root;
}
