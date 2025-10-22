import React, { useEffect, useRef, useState } from "react";
import { buildIframeContents, attachEditorIds } from "../utils/iframeUtils";

// Visual HTML Editor Component
// Provides: IMPORT HTML, visual editing inside a fixed design area (iframe),
// element selection, text editing (contentEditable), image replacement (upload / URL),
// simple layout controls (display, flex-direction, gap), and EXPORT HTML.

export default function VisualHtmlEditor() {
  const iframeRef = useRef(null);
  const fileInputRef = useRef(null);
  const [htmlSource, setHtmlSource] = useState(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Canvas</title>
    <style>
      body{font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding:16px}
      .card{border:1px solid #ddd;padding:12px;border-radius:8px}
      img{max-width:100%;height:auto}
    </style>
  </head>
  <body>
    <div class="card">Hello — edit this text by clicking on it.</div>
    <div style="margin-top:12px;display:flex;gap:12px">
      <img src="https://via.placeholder.com/240x140?text=Demo" alt="demo" />
      <div class="card">A second editable block</div>
    </div>
  </body>
</html>`);

  const [selectedId, setSelectedId] = useState(null);
  const [selectionInfo, setSelectionInfo] = useState(null);
  const [designWidth, setDesignWidth] = useState(800);

  // Write contents to iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const contents = buildIframeContents(htmlSource);
    doc.open();
    doc.write(contents);
    doc.close();
  }, [htmlSource]);

  // Listen to messages from iframe
  useEffect(() => {
    function handler(e) {
      const msg = e.data || {};
      if (msg.type === 'selection') {
        setSelectedId(msg.id);
        setSelectionInfo({ id: msg.id, tag: msg.tag, outerHTML: msg.outerHTML });
      } else if (msg.type === 'content-changed') {
        // update stored htmlSource (best-effort): pull fresh HTML from iframe
        const iframe = iframeRef.current;
        if (!iframe) return;
        try {
          const cur = iframe.contentDocument.documentElement.outerHTML;
          setHtmlSource(cur);
        } catch (err) {
          // ignore cross-origin or timing errors
        }
      } else if (msg.type === 'iframe-ready') {
        // store fresh HTML that the iframe reports
        setHtmlSource(msg.html);
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Import HTML file
  function handleImportFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setHtmlSource(String(r.result));
    r.readAsText(f);
  }

  // Export current iframe HTML
  function handleExport() {
    const iframe = iframeRef.current;
    let html = htmlSource;
    try {
      html = iframe.contentDocument.documentElement.outerHTML;
    } catch (err) {
      // fallback to stored source
    }
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Apply property changes to selected element inside iframe
  function applyPropsToSelected(props) {
    const iframe = iframeRef.current;
    if (!iframe || !selectedId) return;
    iframe.contentWindow.postMessage({ type: 'apply-props', id: selectedId, props }, '*');
    // also request selection clear to refresh HTML
    setTimeout(() => {
      try {
        const cur = iframe.contentDocument.documentElement.outerHTML;
        setHtmlSource(cur);
      } catch (e) {}
    }, 80);
  }

  function replaceImageWithFile(file) {
    const reader = new FileReader();
    reader.onload = function (ev) {
      applyPropsToSelected({ src: ev.target.result });
    };
    reader.readAsDataURL(file);
  }

  // Simple layout controls: toggle flex on selected element
  function toggleFlexDirection(direction) {
    applyPropsToSelected({ display: 'flex', flexDirection: direction });
  }

  // Clear selection in iframe
  function clearSelection() {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.contentWindow.postMessage({ type: 'clear-selection' }, '*');
    setSelectedId(null);
    setSelectionInfo(null);
  }

  return (
    <div className="p-4 min-h-screen gradient-bg">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-white text-center fade-in">🎨 Visual HTML Editor</h1>

        <div className="flex gap-6">
          {/* Left: controls */}
          <div className="w-80 modern-card rounded-3xl shadow-strong p-6 sticky top-4 h-[650px] overflow-auto slide-up">
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-800 mb-2">📁 Import HTML</label>
              <input ref={fileInputRef} onChange={handleImportFile} type="file" accept="text/html" className="mt-2 modern-input w-full p-3 rounded-xl" />
              <button className="mt-3 w-full btn-secondary py-3 rounded-xl font-medium" onClick={() => { setHtmlSource(prev => prev); fileInputRef.current && (fileInputRef.current.value = ''); }}>🔄 Reload</button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-800 mb-2">📏 Canvas Width</label>
              <input type="range" min="320" max="1200" value={designWidth} onChange={(e) => setDesignWidth(Number(e.target.value))} className="w-full" />
              <div className="text-sm text-gray-600 font-medium mt-1">{designWidth}px</div>
            </div>

            <div className="mb-6">
              <button onClick={handleExport} className="w-full btn-primary py-3 rounded-xl font-semibold text-lg">💾 Export HTML</button>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-bold text-lg text-gray-800 mb-4">🎯 Selected Element</h3>
              {selectedId ? (
                <div className="space-y-4">
                  <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded-lg font-mono">ID: {selectedId}</div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">✏️ Edit Text / HTML</label>
                    <textarea
                      className="w-full modern-input rounded-xl p-3 text-sm h-24 resize-none"
                      defaultValue={selectionInfo?.outerHTML ?? ''}
                      onBlur={(e) => {
                        const temp = document.createElement('div');
                        temp.innerHTML = e.target.value;
                        const newInner = temp.innerHTML;
                        applyPropsToSelected({ innerHTML: newInner });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">🔤 Font Size</label>
                    <input type="number" className="w-full modern-input rounded-xl p-3" onBlur={(e) => applyPropsToSelected({ fontSize: e.target.value ? e.target.value + 'px' : '' })} placeholder="px" />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">🎨 Background</label>
                    <input type="text" className="w-full modern-input rounded-xl p-3" placeholder="e.g. #fff or lightgray" onBlur={(e) => applyPropsToSelected({ background: e.target.value })} />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">📏 Padding (px)</label>
                    <input type="number" className="w-full modern-input rounded-xl p-3" onBlur={(e) => applyPropsToSelected({ padding: e.target.value ? e.target.value + 'px' : '' })} />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">🖼️ Image Replace</label>
                    <input type="file" accept="image/*" className="w-full modern-input rounded-xl p-3 mb-2" onChange={(ev) => { const f = ev.target.files?.[0]; if (f) replaceImageWithFile(f); }} />
                    <input type="text" placeholder="Image URL" className="w-full modern-input rounded-xl p-3 text-sm" onBlur={(e) => applyPropsToSelected({ src: e.target.value })} />
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 btn-secondary py-2 rounded-xl font-medium" onClick={() => toggleFlexDirection('row')}>↔️ Flex Row</button>
                    <button className="flex-1 btn-secondary py-2 rounded-xl font-medium" onClick={() => toggleFlexDirection('column')}>↕️ Flex Column</button>
                  </div>

                  <div className="text-right">
                    <button className="px-4 py-2 btn-secondary rounded-xl font-medium" onClick={clearSelection}>❌ Clear</button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">👆</div>
                  <div className="text-sm text-gray-500">Click a block inside the canvas to select and edit it.</div>
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="text-xs text-blue-700 font-medium">
                💡 <strong>Tip:</strong> Click items inside the design area to edit them. Use the controls above to change text, replace images or apply layout styles.
              </div>
            </div>
          </div>

          {/* Right: canvas area (fixed design area) */}
          <div className="flex-1">
            <div className="modern-card rounded-3xl shadow-strong p-6 slide-up">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-lg font-bold text-gray-800">🎨 Design Area</div>
                <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">Width: {designWidth}px</div>
              </div>
              <div className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-medium" style={{ width: designWidth + 'px', height: '600px' }}>
                <iframe
                  title="visual-editor-iframe"
                  ref={iframeRef}
                  style={{ width: '100%', height: '100%', border: 0 }}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>

              <div className="mt-6">
                <label className="block text-sm font-bold text-gray-800 mb-3">📝 Raw HTML Source</label>
                <textarea className="w-full modern-input rounded-xl p-4 font-mono text-xs h-40 resize-none" value={htmlSource} onChange={(e) => setHtmlSource(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="text-white text-lg font-medium">Made with ❤️ — Click elements to edit text inline, replace images, and export a standalone .html file.</div>
        </div>
      </div>
    </div>
  );
}
