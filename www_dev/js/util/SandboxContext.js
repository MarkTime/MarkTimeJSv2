/**
 * Sandboxes Javascript by placing it inside an iframe
 *
 * @param {Object?} globals Globals in the iframe
 */
function SandboxContext(globals) {
    var iframe = document.createElement('iframe');
    if (!iframe.style) iframe.style = {};
    iframe.style.display = 'none';

    if (iframe.setAttribute) iframe.setAttribute('sandbox', 'allow-scripts');
    else iframe.sandbox = 'allow-scripts';

    document.body.appendChild(iframe);

    var win = iframe.contentWindow;
    this.iframe = iframe;
    this.win = win;

    win.isSandbox = true;

    if (globals) this.copy(globals);
}

/**
 * Copies the items to the sandbox context
 *
 * @param {Object|Array} items
 */
SandboxContext.prototype.copy = function(items) {
    if (!items || typeof items !== "object" || items == null) return;

    for (var key in items) {
        if (!items.hasOwnProperty(key)) continue;
        this.win[key] = globals[key];
    }
};

/**
 * Runs code in the sandbox
 *
 * @param {String} code The code to run
 * @param {Object} ctx Optional, the context to run the code in (the value of 'this')
 */
SandboxContext.prototype.run = function(code, ctx) {
    var script = this.win.document.createElement('script');

    this.win.__sandboxContext = ctx || this.win;
    script.innerHTML = "(function() {delete window.__sandboxContext;" + code + "}).call(window.__sandboxContext)";
    this.win.document.body.appendChild(script);
};

module.exports = SandboxContext;
