/**
 * Usage:
 * - Run a local server: python -m http.server
 */

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 The Unperfect Archive running");

    /* -------------------------------
     * 🔗 ELEMENT REFERENCES
     * ----------------------------- */
    const contentEl = document.getElementById("content");
    const pageNav = document.getElementById("pageNav");
    const subtitleEl = document.getElementById("subtitle");
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");
    const overlay = document.getElementById("overlay");
    const sideSearch = document.getElementById("sideSearch");
    const themeToggle = document.getElementById("themeToggle");

    let currentFile = "Intro.md";

    /* -------------------------------
     * 🧰 CUSTOM MARKED RENDERER
     * ----------------------------- */
    class CustomRenderer extends (window.marked && marked.Renderer ? marked.Renderer : class {}) {
        heading(token) {
            const level = token.depth;
            const text = this.parseInline ? this.parseInline(token.tokens) : token.text;
            const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            return `<h${level} id="${id}"><a href="#${id}" class="heading-anchor">${text}</a></h${level}>\n`;
        }
        code(token) {
            const lang = token.lang || 'plaintext';
            const code = token.text || token;
            const highlighted = (window.hljs && hljs.getLanguage && lang && hljs.getLanguage(lang))
                ? hljs.highlight(code, { language: lang }).value
                : (window.hljs ? hljs.highlightAuto(code).value : escapeHtml(code));
            return `<pre class="code-block"><code class="language-${lang}">${highlighted}</code></pre>\n`;
        }
        table(token) {
            // token: { header:[], align:[], rows:[] }
            let html = '<div class="table-wrap"><table class="markdown-table"><thead><tr>';
            for (let i = 0; i < token.header.length; i++) {
                const align = token.align && token.align[i] ? ` style="text-align:${token.align[i]}"` : '';
                html += `<th${align}>${this.parseInline ? this.parseInline(token.header[i].tokens) : token.header[i].text}</th>`;
            }
            html += '</tr></thead><tbody>';
            for (let r = 0; r < token.rows.length; r++) {
                html += '<tr>';
                for (let c = 0; c < token.rows[r].length; c++) {
                    const align = token.align && token.align[c] ? ` style="text-align:${token.align[c]}"` : '';
                    html += `<td${align}>${this.parseInline ? this.parseInline(token.rows[r][c].tokens) : token.rows[r][c].text}</td>`;
                }
                html += '</tr>';
            }
            html += '</tbody></table></div>\n';
            return html;
        }
        image(token) {
            return `<img src="${token.href}" alt="${escapeHtml(token.text || '')}" class="markdown-image" loading="lazy">`;
        }
        link(token) {
            const text = this.parseInline ? this.parseInline(token.tokens) : token.text || token.href;
            const href = token.href || '#';
            return `<a href="${href}" class="markdown-link" target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
        paragraph(token) {
            const text = this.parseInline ? this.parseInline(token.tokens) : token.text || '';
            return `<p class="markdown-paragraph">${text}</p>\n`;
        }
        blockquote(token) {
            const text = this.parseInline ? this.parseInline(token.tokens) : token.text || '';
            return `<blockquote class="markdown-blockquote">${text}</blockquote>\n`;
        }
    }

    /* -------------------------------
     * 🧩 LOAD MARKDOWN LIBRARIES
     * ----------------------------- */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = src;
            s.async = true;
            s.onload = resolve;
            s.onerror = () => reject(new Error("Failed to load " + src));
            document.head.appendChild(s);
        });
    }
    function loadStyles(href) {
        return new Promise((resolve) => {
            const l = document.createElement("link");
            l.rel = "stylesheet";
            l.href = href;
            l.onload = resolve;
            document.head.appendChild(l);
        });
    }

    async function loadMarkdownLibs() {
        // conservative, resilient loader
        const needsMarked = !window.marked;
        const tasks = [];
        if (needsMarked) tasks.push(loadScript("https://cdn.jsdelivr.net/npm/marked/marked.min.js"));
        tasks.push(loadScript("https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/common.min.js"));
        tasks.push(loadStyles("https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/atom-one-dark.min.css"));

        const results = await Promise.allSettled(tasks);
        if (needsMarked && !window.marked) {
            console.error("marked.js failed to load", results);
            throw new Error("Markdown parser unavailable (marked.js).");
        }

        // configure marked
        try {
            marked.setOptions({
                gfm: true,
                breaks: true,
                headerIds: true,
                mangle: false,
                pedantic: false
            });
            // attach custom renderer if possible
            if (marked && typeof marked.use === "function") {
                marked.use({ renderer: new CustomRenderer() });
            } else {
                marked.setOptions({ renderer: new CustomRenderer() });
            }
        } catch (e) {
            console.warn("Failed to set marked options/renderer, continuing with defaults.", e);
        }
    }

    /* -------------------------------
     * 🎯 POST-RENDER ENHANCEMENTS
     * ----------------------------- */
    function enhanceContent() {
        // add copy buttons for code blocks
        contentEl.querySelectorAll(".code-block").forEach(block => {
            if (block.parentElement?.querySelector('.copy-btn')) return;
            const btn = document.createElement("button");
            btn.className = "copy-btn";
            btn.title = "Copy code";
            btn.textContent = "Copy";
            btn.addEventListener("click", async () => {
                try {
                    const codeText = block.textContent || '';
                    await navigator.clipboard.writeText(codeText.trim());
                    btn.textContent = "Copied";
                    setTimeout(() => btn.textContent = "Copy", 1500);
                } catch {
                    btn.textContent = "Err";
                    setTimeout(() => btn.textContent = "Copy", 1500);
                }
            });
            block.parentElement?.insertBefore(btn, block);
        });

        // hook highlight.js
        if (window.hljs) {
            contentEl.querySelectorAll("pre code").forEach(el => {
                try { hljs.highlightElement(el); } catch (e) { /* noop */ }
            });
        }
    }

    /* -------------------------------
     * 📄 LOAD & RENDER MARKDOWN
     * ----------------------------- */
    function setActiveNav(file) {
        pageNav.querySelectorAll(".nav-link").forEach(link => {
            link.classList.toggle("active", link.getAttribute("data-file") === file);
        });
    }

    async function loadAndRender(filename = currentFile) {
        currentFile = filename;
        setActiveNav(currentFile);
        subtitleEl.textContent = `📖 Rendering ${currentFile}`;
        contentEl.innerHTML = `<p class="loading">⏳ Loading markdown…</p>`;

        if (location.protocol === "file:") {
            contentEl.innerHTML = `
                <div class="error-box">
                    <p class="error">⚠️ Browser blocked local file access.</p>
                    <p>Run a local server, e.g. <code>python -m http.server</code></p>
                </div>`;
            return;
        }

        try {
            await loadMarkdownLibs();
        } catch (err) {
            console.error("Loader error:", err);
            contentEl.innerHTML = `
                <div class="error-box">
                    <p class="error">⚠️ Failed to load Markdown support.</p>
                    <p>${escapeHtml(err.message)}</p>
                </div>`;
            return;
        }

        try {
            const res = await fetch("./" + filename);
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            const md = await res.text();
            const html = marked.parse(md);
            contentEl.innerHTML = html;

            enhanceContent();

            // smooth-anchor scroll
            const anchor = location.hash.slice(1);
            if (anchor) {
                const el = document.getElementById(anchor);
                if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 80);
            }
        } catch (err) {
            console.error("Markdown load failed:", err);
            contentEl.innerHTML = `
                <div class="error-box">
                    <p class="error">❌ Failed to load <code>${escapeHtml(filename)}</code></p>
                    <p>${escapeHtml(err.message)}</p>
                </div>`;
        }
    }

    /* -------------------------------
     * 🧭 SIDEBAR, SEARCH, THEME
     * ----------------------------- */
    function openSidebar() { sidebar.classList.add("open"); overlay.hidden = false; }
    function closeSidebar() { sidebar.classList.remove("open"); overlay.hidden = true; }
    sidebarToggle.addEventListener("click", () => sidebar.classList.contains("open") ? closeSidebar() : openSidebar());
    overlay.addEventListener("click", closeSidebar);

    pageNav.addEventListener("click", (e) => {
        const toggle = e.target.closest(".group-toggle");
        if (toggle) {
            const expanded = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!expanded));
            const items = toggle.nextElementSibling;
            if (items) items.hidden = expanded;
            return;
        }
        const btn = e.target.closest(".nav-link");
        if (!btn) return;
        const file = btn.getAttribute("data-file");
        if (file) { loadAndRender(file); updateHash(file); }
        closeSidebar();
    });

    function filterNav(q) {
        q = (q || '').toLowerCase();
        pageNav.querySelectorAll(".nav-link").forEach(link => {
            link.hidden = !((link.textContent || '').toLowerCase().includes(q));
        });
    }
    sideSearch?.addEventListener("input", (e) => filterNav(e.target.value));

    function applyTheme(theme) { document.body.classList.toggle("dark", theme === "dark"); }
    const saved = localStorage.getItem("tua:theme") || "light";
    applyTheme(saved);
    themeToggle?.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark");
        localStorage.setItem("tua:theme", isDark ? "dark" : "light");
    });

    /* -------------------------------
     * 🔗 URL HASH
     * ----------------------------- */
    function parseHash() {
        const hash = location.hash.slice(1);
        const params = new URLSearchParams(hash);
        return params.get("file");
    }
    function updateHash(file) {
        const newHash = `#file=${encodeURIComponent(file)}`;
        if (location.hash !== newHash) history.replaceState(null, "", newHash);
    }
    window.addEventListener("hashchange", () => {
        const f = parseHash();
        if (f && f !== currentFile) loadAndRender(f);
    });

    /* -------------------------------
     * 🧰 UTIL
     * ----------------------------- */
    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" })[c]);
    }

    /* -------------------------------
     * 🚀 START
     * ----------------------------- */
    const fromUrl = parseHash();
    loadAndRender(fromUrl || currentFile);
});

