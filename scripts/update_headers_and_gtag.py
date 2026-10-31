#!/usr/bin/env python3
import glob
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

GTAG = """  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-GY0KGRL32C"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-GY0KGRL32C');
  </script>
"""

def make_header(active_nav):
    return f"""<a class="skip-link" href="#content">Skip to content</a>
<header class="site-header">
  <a class="brand" href="../index.html" aria-label="Cedar home"><span class="brand-mark" aria-hidden="true">c.</span>Cedar<span class="brand-caption">Learning workspace</span></a>
  <nav aria-label="Course">
    <a href="../index.html"{' aria-current="page"' if active_nav == 'dashboard' else ''}>Dashboard</a>
    <a href="../exercise-dashboard.html"{' aria-current="page"' if active_nav == 'exercises' else ''}>Exercises</a>
    <a href="../flashcards.html"{' aria-current="page"' if active_nav == 'flashcards' else ''}>Flashcards</a>
    <a href="../glossary.html"{' aria-current="page"' if active_nav == 'glossary' else ''}>Glossary</a>
    <a href="../reference/0001-revenue-profit-cash.html"{' aria-current="page"' if active_nav == 'reference' else ''}>Reference</a>
  </nav>
</header>
"""

def process_file(file_path, active_nav):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add Google Tag if not present
    if "G-GY0KGRL32C" not in content:
        content = content.replace("</head>", f"{GTAG}</head>")

    # 2. Add header if not present
    if '<header class="site-header">' not in content:
        header_html = make_header(active_nav)
        
        # Replace <body><main> or <body>\n<main> with <body>\n{header_html}\n<main id="content">
        # Pattern matching body tag and main tag
        body_main_pattern = re.compile(r'<body([^>]*)>\s*<main([^>]*)>', re.IGNORECASE)
        match = body_main_pattern.search(content)
        if match:
            body_attrs = match.group(1)
            new_body_main = f'<body{body_attrs}>\n{header_html}\n<main id="content">'
            content = content[:match.start()] + new_body_main + content[match.end():]
        else:
            # Fallback for just <body>
            body_pattern = re.compile(r'<body([^>]*)>', re.IGNORECASE)
            match_body = body_pattern.search(content)
            if match_body:
                body_attrs = match_body.group(1)
                new_body = f'<body{body_attrs}>\n{header_html}'
                content = content[:match_body.start()] + new_body + content[match_body.end():]

    # 3. Ensure in-main nav has class="subnav"
    # Find <main id="content">\s*<nav> and replace with <nav class="subnav">
    content = re.sub(r'(<main[^>]*>\s*)<nav>', r'\1<nav class="subnav">', content)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Updated: {file_path}")

def main():
    # Exercises
    for p in sorted(glob.glob(str(BASE_DIR / "exercises" / "*.html"))):
        process_file(p, "exercises")

    # Lessons
    for p in sorted(glob.glob(str(BASE_DIR / "lessons" / "*.html"))):
        process_file(p, "lessons")

    # Reference
    for p in sorted(glob.glob(str(BASE_DIR / "reference" / "*.html"))):
        process_file(p, "reference")

if __name__ == "__main__":
    main()
