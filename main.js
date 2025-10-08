/**
 * The Unperfect Archive — Clean Markdown Viewer (Final)
 * -----------------------------------------------------
 * Features:
 * ✅ Sidebar navigation & search
 * ✅ Light/Dark theme toggle
 * ✅ Markdown rendering with syntax highlighting
 * ✅ Shareable URLs (via #file=Page.md)
 *
 * Usage:
 * - Run a local server:  python -m http.server
 * - Share links like:    http://localhost:8000/#file=Intro.md
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
	 * 🧭 SIDEBAR TOGGLE
	 * ----------------------------- */
	function openSidebar() {
		sidebar.classList.add("open");
		overlay.hidden = false;
	}
	function closeSidebar() {
		sidebar.classList.remove("open");
		overlay.hidden = true;
	}
	sidebarToggle.addEventListener("click", () =>
		sidebar.classList.contains("open") ? closeSidebar() : openSidebar()
	);
	overlay.addEventListener("click", closeSidebar);

	/* -------------------------------
	 * 📚 SIDEBAR NAVIGATION
	 * ----------------------------- */
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
		if (file) {
			loadAndRender(file);
			updateHash(file);
		}
		closeSidebar();
	});

	/* -------------------------------
	 * 🔍 SEARCH FILTER
	 * ----------------------------- */
	function filterNav(query) {
		query = query.toLowerCase();
		pageNav.querySelectorAll(".nav-link").forEach(link => {
			const match = (link.textContent || "").toLowerCase().includes(query);
			link.hidden = !match;
		});
	}
	if (sideSearch)
		sideSearch.addEventListener("input", (e) => filterNav(e.target.value));

	/* -------------------------------
	 * 🌗 THEME TOGGLE (Light/Dark)
	 * ----------------------------- */
	function applyTheme(theme) {
		document.body.classList.toggle("dark", theme === "dark");
	}
	const savedTheme = localStorage.getItem("tua:theme") || "light";
	applyTheme(savedTheme);
	if (themeToggle) {
		themeToggle.addEventListener("click", () => {
			const isDark = document.body.classList.toggle("dark");
			localStorage.setItem("tua:theme", isDark ? "dark" : "light");
		});
	}

	/* -------------------------------
	 * 🔗 URL SHARE FEATURE
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
		const fileFromUrl = parseHash();
		if (fileFromUrl && fileFromUrl !== currentFile) {
			loadAndRender(fileFromUrl);
		}
	});

	/* -------------------------------
	 * 🧩 LOAD MARKDOWN LIBRARIES
	 * ----------------------------- */
	async function loadMarkdownLibs() {
		if (!window.marked) {
			await Promise.all([
				loadScript("https://cdn.jsdelivr.net/npm/marked/marked.min.js"),
				loadScript("https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/common.min.js"),
				loadStyles("https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css")
			]);

			marked.setOptions({
				gfm: true,
				breaks: true,
				highlight: (code, lang) => {
					try {
						return window.hljs.highlight(code, { language: lang }).value;
					} catch {
						return window.hljs.highlightAuto(code).value;
					}
				}
			});
		}
	}

	function loadScript(src) {
		return new Promise((resolve, reject) => {
			const s = document.createElement("script");
			s.src = src;
			s.onload = resolve;
			s.onerror = reject;
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

	/* -------------------------------
	 * 📄 LOAD & RENDER MARKDOWN
	 * ----------------------------- */
	async function loadAndRender(filename = currentFile) {
		currentFile = filename;
		subtitleEl.textContent = `Rendering ${currentFile}`;
		contentEl.innerHTML = `<p>Loading markdown…</p>`;

		// Prevent file:// issues
		if (location.protocol === "file:") {
			contentEl.innerHTML = `
				<p class="error">⚠️ Browser blocked local file access.</p>
				<p>Please run a local server using:</p>
				<pre><code>python -m http.server</code></pre>`;
			return;
		}

		await loadMarkdownLibs();

		try {
			const res = await fetch("./" + filename);
			if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
			const md = await res.text();
			const html = marked.parse(md);
			contentEl.innerHTML = html;

			// Syntax highlighting
			contentEl.querySelectorAll("pre code").forEach(el => window.hljs.highlightElement(el));
		} catch (err) {
			console.error("Markdown load failed:", err);
			contentEl.innerHTML = `
				<p class="error">❌ Failed to load <code>${escapeHtml(filename)}</code></p>
				<p>${escapeHtml(err.message)}</p>`;
		}
	}

	/* -------------------------------
	 * 🧰 UTILITY
	 * ----------------------------- */
	function escapeHtml(s) {
		return String(s).replace(/[&<>"']/g, (c) => ({
			"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
		}[c]));
	}

	/* -------------------------------
	 * 🚀 INITIALIZATION
	 * ----------------------------- */
	const fileFromUrl = parseHash();
	loadAndRender(fileFromUrl || currentFile);
});
