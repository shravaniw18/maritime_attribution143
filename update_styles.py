import re

html_path = 'e:/sih/polaris-maritime-attribution-AIS/backend/app/static/index.html'
css_path = 'e:/sih/polaris-maritime-attribution-AIS/backend/app/static/css/styles.css'
js_path = 'e:/sih/polaris-maritime-attribution-AIS/backend/app/static/js/app.js'

with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()
    
# 1. Update Tailwind config
new_tailwind_config = '''tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        slate: { 100: "#1E293B", 200: "#1E293B", 300: "#334155", 400: "#475569", 500: "#64748b", 600: "#94a3b8", 700: "#CCFBF1", 800: "#F3EFE6", 900: "#F3EFE6", 950: "#F3EFE6" },
                        teal: { 200: "#0D9488", 300: "#0D9488", 400: "#0D9488", 500: "#0D9488", 600: "#0f766e" },
                        emerald: { 300: "#0D9488", 400: "#0D9488", 500: "#0D9488", 600: "#0f766e" },
                        cyan: { 300: "#0D9488", 400: "#0D9488", 500: "#0D9488", 600: "#0f766e" },
                        amber: { 300: "#f59e0b", 400: "#d97706", 500: "#b45309" },
                        red: { 300: "#f87171", 400: "#ef4444", 500: "#dc2626" },
                        black: "#FDFBF7",
                        white: "#FDFBF7",
                    },
                    fontFamily: {
                        sans: ["'Roboto Condensed'", "sans-serif"],
                        mono: ["'Roboto Condensed'", "sans-serif"],
                        title: ["'Roboto Condensed'", "sans-serif"],
                        pixel: ["'Roboto Condensed'", "sans-serif"]
                    },
                    borderRadius: {
                        DEFAULT: "16px",
                        'md': "16px",
                        'lg': "20px",
                        'full': "9999px"
                    },
                    boxShadow: {
                        'DEFAULT': '0 4px 20px -2px rgba(13, 148, 136, 0.1)',
                        'md': '0 8px 30px -4px rgba(13, 148, 136, 0.15)',
                        'lg': '0 12px 40px -6px rgba(13, 148, 136, 0.2)',
                        '2xl': '0 25px 50px -12px rgba(13, 148, 136, 0.25)',
                    }
                }
            }
        }'''

html = re.sub(r'tailwind\.config\s*=\s*\{.*?\}\s*\}', new_tailwind_config, html, flags=re.DOTALL)

# 2. Update specific hardcoded bg colors in HTML
html = html.replace('bg-[#070d0d]', 'bg-[#FDFBF7]')
html = html.replace('bg-black/60', 'bg-[#FDFBF7]/90')
html = html.replace('text-white', 'text-slate-100')
html = html.replace('glow-teal', '')
html = html.replace('glow-cyan', '')

# Remove uppercase tracking to make Roboto Condensed look normal
html = html.replace('tracking-wider', 'tracking-wide')
html = html.replace('tracking-widest', 'tracking-wider')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)


with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Replace fonts in CSS
css = re.sub(r'@import url\([^)]+\);', '@import url("https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@300;400;500;600;700&display=swap");', css)

new_root = '''
:root {
    --bg-dark: #FDFBF7;
    --bg-panel: rgba(243, 239, 230, 0.95);
    --bg-card: rgba(243, 239, 230, 0.95);
    --border-teal: rgba(13, 148, 136, 0.25);
    --border-cyan: rgba(13, 148, 136, 0.25);
    --text-main: #1E293B;
    --text-muted: #475569;
    --accent-teal: #0D9488;
    --accent-cyan: #0D9488;
    --accent-mint: #0D9488;
    --accent-amber: #f59e0b;
    --accent-red: #ef4444;
    --font-pixel: 'Roboto Condensed', sans-serif;
    --font-mono: 'Roboto Condensed', sans-serif;
    --font-sans: 'Roboto Condensed', sans-serif;
    --font-title: 'Roboto Condensed', sans-serif;
}
'''
css = re.sub(r':root\s*\{[^}]+\}', new_root, css, count=1)

# Modify Floating cards to have softer borders
css = css.replace('border-radius: 8px;', 'border-radius: 16px;')
css = css.replace('box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);', 'box-shadow: 0 12px 32px rgba(13, 148, 136, 0.15);')
css = css.replace('backdrop-filter: blur(12px);', 'backdrop-filter: blur(16px);')

# Modify nav buttons
css = css.replace('border-radius: 6px;', 'border-radius: 12px;')

# Rewrite light mode to match dark mode since we only have one theme now
css = re.sub(r'html\.light-mode,\s*body\.light-mode\s*\{[^}]+\}', '', css)
css = re.sub(r'body\.light-mode\s*\.polaris-navbar\s*\{[^}]+\}', '', css)
css = re.sub(r'body\.light-mode\s*\.icon-nav-sidebar\s*\{[^}]+\}', '', css)
css = re.sub(r'body\.light-mode\s*\.nav-icon-btn\.active\s*\{[^}]+\}', '', css)
css = re.sub(r'body\.light-mode\s*#gis-map\s*\{[^}]+\}', '', css)
css = re.sub(r'html\.light-mode\s*\.map-dark-tiles\s*\{[^}]+\}', '', css)
css = re.sub(r'body\.light-mode\s*\.floating-card\s*\{[^}]+\}', '', css)
css = re.sub(r'body\.light-mode\s*\.timeline-bar\s*\{[^}]+\}', '', css)
css = css.replace('filter: invert(100%) hue-rotate(180deg) brightness(80%) contrast(95%);', '')

# Remove neon glows
css = re.sub(r'\.glow-teal\s*\{[^}]+\}', '.glow-teal { color: var(--accent-teal); font-weight: 600; }', css)
css = re.sub(r'\.glow-cyan\s*\{[^}]+\}', '.glow-cyan { color: var(--accent-teal); font-weight: 600; }', css)
css = re.sub(r'\.glow-box\s*\{[^}]+\}', '.glow-box { box-shadow: 0 4px 12px rgba(13, 148, 136, 0.15); }', css)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Change default map to light marine and amber spill color
js = js.replace('currentTheme = localStorage.getItem("polaris_theme") || "dark"', 'currentTheme = "light"')
js = js.replace('currentBaseLayer = "dark"', 'currentBaseLayer = "light"')
js = js.replace('fillColor: "#991b1b"', 'fillColor: "#f59e0b"')
js = js.replace('color: "#ef4444"', 'color: "#d97706"')

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print("Styles updated successfully!")
