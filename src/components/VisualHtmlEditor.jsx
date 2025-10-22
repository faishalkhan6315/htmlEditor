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
    <div className="p-4 min-h-screen bg-gray-50">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Visual HTML Editor</h1>

        <div className="flex gap-4">
          {/* Left: controls */}
          <div className="w-72 bg-white rounded-2xl shadow p-4 sticky top-4 h-[620px] overflow-auto">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Import HTML</label>
              <input ref={fileInputRef} onChange={handleImportFile} type="file" accept="text/html" className="mt-2" />
              <button className="mt-3 w-full rounded-md border px-3 py-2" onClick={() => { setHtmlSource(prev => prev); fileInputRef.current && (fileInputRef.current.value = ''); }}>Reload</button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Canvas width</label>
              <input type="range" min="320" max="1200" value={designWidth} onChange={(e) => setDesignWidth(Number(e.target.value))} />
              <div className="text-xs text-gray-500">{designWidth}px</div>
            </div>

            <div className="mb-4">
              <button onClick={handleExport} className="w-full bg-blue-600 text-white py-2 rounded-md">Export HTML</button>
            </div>

            <div className="border-t pt-3">
              <h3 className="font-medium">Selected Element</h3>
              {selectedId ? (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-2">ID: {selectedId}</div>
                  <div className="mb-2">
                    <label className="text-sm">Edit text / HTML</label>
                    <textarea
                      className="w-full mt-1 border rounded p-2 text-sm h-24"
                      defaultValue={selectionInfo?.outerHTML ?? ''}
                      onBlur={(e) => {
                        // when user finishes editing, set innerHTML via applyProps
                        // user can paste HTML — we'll set innerHTML
                        const temp = document.createElement('div');
                        temp.innerHTML = e.target.value;
                        const newInner = temp.innerHTML;
                        applyPropsToSelected({ innerHTML: newInner });
                      }}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="text-sm">Font size</label>
                    <input type="number" className="w-full mt-1 border rounded p-1" onBlur={(e) => applyPropsToSelected({ fontSize: e.target.value ? e.target.value + 'px' : '' })} placeholder="px" />
                  </div>

                  <div className="mb-2">
                    <label className="text-sm">Background</label>
                    <input type="text" className="w-full mt-1 border rounded p-1" placeholder="e.g. #fff or lightgray" onBlur={(e) => applyPropsToSelected({ background: e.target.value })} />
                  </div>

                  <div className="mb-2">
                    <label className="text-sm">Padding (px)</label>
                    <input type="number" className="w-full mt-1 border rounded p-1" onBlur={(e) => applyPropsToSelected({ padding: e.target.value ? e.target.value + 'px' : '' })} />
                  </div>

                  <div className="mb-2">
                    <label className="text-sm">Image replace</label>
                    <input type="file" accept="image/*" className="w-full mt-1" onChange={(ev) => { const f = ev.target.files?.[0]; if (f) replaceImageWithFile(f); }} />
                    <input type="text" placeholder="Image URL" className="w-full mt-2 border rounded p-1 text-sm" onBlur={(e) => applyPropsToSelected({ src: e.target.value })} />
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button className="flex-1 rounded border px-2 py-1" onClick={() => toggleFlexDirection('row')}>Make flex row</button>
                    <button className="flex-1 rounded border px-2 py-1" onClick={() => toggleFlexDirection('column')}>Make flex column</button>
                  </div>

                  <div className="mt-3 text-right">
                    <button className="px-3 py-1 rounded border" onClick={clearSelection}>Clear</button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 mt-2">Click a block inside the canvas to select and edit it.</div>
              )}
            </div>

            <div className="mt-4 text-xs text-gray-400">
              Tip: click items inside the design area (right) to edit them. Use the panel above to change text, replace images or apply simple layout styles.
            </div>
          </div>

          {/* Right: canvas area (fixed design area) */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm text-gray-600">Design area (fixed)</div>
                <div className="text-xs text-gray-500">Preview width: {designWidth}px</div>
              </div>
              <div className="border rounded-lg overflow-hidden" style={{ width: designWidth + 'px', height: '600px' }}>
                <iframe
                  title="visual-editor-iframe"
                  ref={iframeRef}
                  style={{ width: '100%', height: '100%', border: 0 }}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium">Raw HTML source (editable)</label>
                <textarea className="w-full mt-1 h-40 border rounded p-2 font-mono text-xs" value={htmlSource} onChange={(e) => setHtmlSource(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">Made with ❤️ — click elements to edit text inline, replace images, and export a standalone .html file.</div>
      </div>
    </div>
  );
}
