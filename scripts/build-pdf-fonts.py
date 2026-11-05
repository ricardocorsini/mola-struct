"""Regenerate the licensed PDF font subsets (optional developer asset task).

Requires fonttools and DejaVuSans.ttf / DejaVuSans-Bold.ttf. Does not alter engine data.
Usage: python scripts/build-pdf-fonts.py [directory-containing-DejaVu-fonts]
"""
from pathlib import Path
import base64
import sys
from fontTools import subset

root = Path(__file__).resolve().parents[1]
font_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/usr/share/fonts/truetype/dejavu')
sources = [p for p in (root / 'src').rglob('*') if p.suffix in {'.ts', '.tsx'} and p.name != 'pdfFonts.ts']
characters = ''.join(p.read_text() for p in sources) + ''.join(chr(c) for c in range(32, 256))
entries = []
for name, filename in [('regular', 'DejaVuSans'), ('bold', 'DejaVuSans-Bold')]:
    options = subset.Options()
    options.drop_tables.append('FFTM')
    font = subset.load_font(str(font_dir / (filename + '.ttf')), options)
    selection = subset.Subsetter(options=options)
    selection.populate(text=characters)
    selection.subset(font)
    from io import BytesIO
    output = BytesIO()
    font.save(output)
    encoded = base64.b64encode(output.getvalue()).decode('ascii')
    entries.append('export const ' + name + ' =\n  "' + encoded + '";')
(root / 'src' / 'pdfFonts.ts').write_text('// Embedded subset of DejaVu Sans. See docs/THIRD_PARTY_NOTICES.md.\n' + '\n'.join(entries) + '\n')
print('DejaVu subsets regenerated; original font licenses are preserved.')
