// Utility functions for iframe management in Visual HTML Editor

// Ensure every element has a data-editor-id attribute
export function attachEditorIds(doc) {
  let counter = 1;
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null, false);
  while (walker.nextNode()) {
    const el = walker.currentNode;
    if (!el.hasAttribute("data-editor-id")) {
      el.setAttribute("data-editor-id", `el-${counter++}`);
    }
  }
}

// Build an html + script that runs in iframe to enable selection and editing
export function buildIframeContents(html) {
  // We'll inject a small script into the body to handle clicks and notify parent
  // Use a <script> that sets up window.addEventListener('message') to receive commands
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  attachEditorIds(doc);

  // Inject helper styles for selection highlight
  const style = doc.createElement("style");
  style.innerHTML = `
    [data-editor-id][data-selected="true"]{outline:3px solid #2563eb66; box-shadow:0 2px 8px rgba(37,99,235,0.12);} 
    [data-editor-id]{cursor: pointer;}
  `;
  doc.head.appendChild(style);

  // Injection script
  const script = doc.createElement("script");
  script.type = "text/javascript";
  script.innerHTML = `
    (function(){
      function post(msg){ parent.postMessage(msg, '*'); }
      // make elements selectable and optionally editable
      function makeInteractive(){
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null, false);
        while(walker.nextNode()){
          const el = walker.currentNode;
          if(!el.hasAttribute('data-editor-id')){
            el.setAttribute('data-editor-id', 'el-'+Math.random().toString(36).slice(2,9));
          }
          // avoid adding handlers to the html/body root repeatedly
          el.addEventListener('click', function(ev){
            ev.stopPropagation();
            // set selected attribute
            Array.from(document.querySelectorAll('[data-editor-id]')).forEach(e=>e.removeAttribute('data-selected'));
            this.setAttribute('data-selected','true');
            // focus contentEditable for text-like elements
            const isImg = this.tagName.toLowerCase()==='img';
            if(!isImg){
              this.setAttribute('contentEditable','true');
              // ensure caret placement
              const sel = window.getSelection();
              sel.removeAllRanges();
              const range = document.createRange();
              range.selectNodeContents(this);
              sel.addRange(range);
            }
            post({type:'selection', id:this.getAttribute('data-editor-id'), tag:this.tagName.toLowerCase(), outerHTML:this.outerHTML});
          }, false);

          // make images non-contentEditable but clickable
          if(el.tagName.toLowerCase()==='img'){
            el.setAttribute('draggable','false');
          }
        }
      }

      // when content changes, notify parent
      document.addEventListener('input', function(ev){
        const target = ev.target;
        if(target && target.getAttribute && target.getAttribute('data-editor-id')){
          post({type:'content-changed', id: target.getAttribute('data-editor-id'), outerHTML: target.outerHTML});
        }
      }, true);

      // listen to messages from parent
      window.addEventListener('message', function(e){
        const msg = e.data || {};
        try{
          if(msg.type === 'apply-props'){
            const el = document.querySelector('[data-editor-id="'+msg.id+'"]');
            if(!el) return;
            if(msg.props){
              Object.entries(msg.props).forEach(([k,v])=>{
                if(k === 'innerHTML') el.innerHTML = v;
                else if(k === 'src' && el.tagName.toLowerCase()==='img') el.src = v;
                else el.style[k] = v;
              });
            }
          } else if(msg.type === 'clear-selection'){
            Array.from(document.querySelectorAll('[data-selected]')).forEach(e=>e.removeAttribute('data-selected'));
          }
        }catch(err){/* ignore */}
      });

      // initial setup
      makeInteractive();
      // observe DOM additions to make them interactive too
      const obs = new MutationObserver(()=>{ makeInteractive(); });
      obs.observe(document.body, {childList:true, subtree:true});

      // inform parent that iframe is ready and send full HTML
      post({type:'iframe-ready', html: document.documentElement.outerHTML});
    })();
  `;

  doc.body.appendChild(script);
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
