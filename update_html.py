import re

html_path = 'e:/sih/polaris-maritime-attribution-AIS/backend/app/static/index.html'
with open(html_path, 'r', encoding='utf-8') as f: 
    html = f.read()

# Replace the logo with the wave logo
wave_logo = '''<div class="flex flex-col items-center justify-center cursor-pointer relative" onclick="showConsoleView()">
                    <span class="font-title text-2xl font-bold tracking-wide text-teal-600">LEHAR</span>
                    <svg class="absolute -bottom-2 w-12 h-3 text-teal-400 opacity-60" viewBox="0 0 100 20" preserveAspectRatio="none">
                        <path d="M0,10 Q25,20 50,10 T100,10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                </div>'''

# Landing page logo
html = re.sub(r'<div class="flex items-center space-x-2 cursor-pointer" onclick="showConsoleView\(\)">\s*<span class="font-pixel text-2xl font-bold tracking-wider text-teal-400 glow-teal">LEHAR</span>\s*</div>', wave_logo, html, flags=re.DOTALL)
html = re.sub(r'<div class="flex items-center space-x-2 cursor-pointer" onclick="showConsoleView\(\)">\s*<span class="font-pixel text-2xl font-bold tracking-wider text-teal-400">LEHAR</span>\s*</div>', wave_logo, html, flags=re.DOTALL)

# Main console logo
wave_logo_console = '''<div class="flex flex-col items-center justify-center cursor-pointer relative" onclick="showLandingView()">
                    <span class="font-title text-lg font-bold tracking-wide text-teal-600">LEHAR</span>
                    <svg class="absolute -bottom-1.5 w-10 h-2 text-teal-400 opacity-60" viewBox="0 0 100 20" preserveAspectRatio="none">
                        <path d="M0,10 Q25,20 50,10 T100,10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                </div>'''

html = re.sub(r'<div class="flex items-center space-x-2 cursor-pointer" onclick="showLandingView\(\)">\s*<span class="font-pixel text-lg font-bold tracking-wider text-teal-400 glow-teal">LEHAR</span>\s*<span class="text-xs text-slate-400">&bull;</span>\s*<span class="font-pixel text-xs font-bold text-teal-300 tracking-wider">ACTIVE SIMULATION</span>\s*</div>', wave_logo_console + '''\n                    <span class="text-xs text-slate-400 ml-3">&bull;</span>\n                    <span class="font-title text-xs font-bold text-teal-600 tracking-wide ml-2">ACTIVE SIMULATION</span>''', html, flags=re.DOTALL)

# Add wave-border class to panel headers
html = html.replace('panel-header border-b border-teal-500/20 pb-2', 'panel-header wave-border border-b border-transparent pb-3')

# Clean up colors on buttons
html = html.replace('bg-teal-400 hover:bg-teal-300 text-slate-950', 'bg-teal-600 hover:bg-teal-500 text-white')
html = html.replace('bg-teal-500 hover:bg-teal-400 text-slate-950', 'bg-teal-600 hover:bg-teal-500 text-white')
html = html.replace('bg-teal-400 rounded flex items-center justify-center text-slate-950', 'bg-teal-600 rounded flex items-center justify-center text-white')

# Change dark card backgrounds to Pearl Shell 
html = html.replace('bg-slate-900/90', 'bg-slate-900 shadow-md border-slate-400/20')
html = html.replace('bg-slate-900/80', 'bg-slate-900 shadow-md border-slate-400/20')
html = html.replace('bg-slate-900/60', 'bg-slate-800 shadow-sm border-slate-400/20')
html = html.replace('border-slate-800', 'border-slate-400/20')
html = html.replace('border-slate-700', 'border-slate-400/20')
html = html.replace('border-teal-500/30', 'border-teal-600/30')

with open(html_path, 'w', encoding='utf-8') as f: 
    f.write(html)
