from PIL import Image
from pathlib import Path
import numpy as np, json, csv, html, base64, hashlib, argparse
parser=argparse.ArgumentParser(description="Reproduce the Murvi digital estimates (requires Pillow and numpy).")
parser.add_argument('source_dir',type=Path,help='Directory with originals/<code>.bmp; exports are written here')
parser.add_argument('--manifest',type=Path,default=Path('src/modules/customization/infrastructure/murvi-palette.json'))
args=parser.parse_args(); root=args.source_dir
manifest=json.loads(args.manifest.read_text())
source={**manifest, 'rows':manifest['colors']}
# Standard sRGB transfer + OKLab matrices; averaging the central texture avoids borders.
def linear(c): return np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4)
def encoded(c): return np.where(c<=.0031308,12.92*c,1.055*np.maximum(c,0)**(1/2.4)-.055)
def oklab(rgb):
 a=np.array([[.4122214708,.5363325363,.0514459929],[.2119034982,.6806995451,.1073969566],[.0883024619,.2817188376,.6299787005]])
 b=np.array([[.2104542553,.793617785,-.0040720468],[1.9779984951,-2.428592205,.4505937099],[.0259040371,.7827717662,-.808675766]])
 return np.cbrt(linear(rgb)@a.T)@b.T
def fromlab(lab):
 a=np.array([[1,.3963377774,.2158037573],[1,-.1055613458,-.0638541728],[1,-.0894841775,-1.291485548]])
 b=np.array([[4.0767416621,-3.3077115913,.2309699292],[-1.2684380046,2.6097574011,-.3413193965],[-.0041960863,-.7034186147,1.707614701]])
 return np.clip(encoded((lab@a.T)**3@b.T),0,1)
rows=[]
for item in source['rows']:
 path=root/'originals'/f"{item['code']}.bmp"
 if hashlib.sha256(path.read_bytes()).hexdigest()!=item['imageSha256']:
  raise ValueError(f"Source image changed: {item['code']}")
 im=Image.open(path).convert('RGB')
 if im.size!=(90,90): raise ValueError(f"Unexpected texture dimensions: {item['code']}")
 rgb=np.asarray(im,dtype=float)/255
 pixels=rgb[9:81,9:81].reshape(-1,3)
 lab=oklab(pixels); low,high=np.quantile(lab[:,0],[.1,.9]); sample=lab[(lab[:,0]>=low)&(lab[:,0]<=high)].mean(axis=0)
 out=np.floor(fromlab(sample)*255+.5).astype(int)
 row={**item,'id':'murvi-'+item['code'].lower().replace('.','-'),'hex':'#'+''.join(f'{x:02x}' for x in out),'rgb':out.tolist(),'status':'estimated-from-manufacturer-texture','calibrated':False}
 rows.append(row)
metadata={'version':'murvi-pdf-2026-10-27.1','manufacturer':'Murvi','retrievedOn':'2026-10-27','sourcePdfSha256':source['sourcePdfSha256'],'colorSpaceAssumption':'sRGB (original 90x90 BMPs have no ICC profile)','method':'Central 80% crop (9:81 pixels); discard lower/upper 10% OKLab lightness; mean remaining OKLab; convert to sRGB and round to 8-bit. No physical calibration.','scope':source['scope'],'colors':rows}
(root/'murvi-palette-estimated.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
with (root/'murvi-palette-estimated.csv').open('w') as f:
 w=csv.writer(f); w.writerow(['code','line','estimated_hex','red','green','blue','calibrated','source_url','image_url'])
 for r in rows: w.writerow([r['code'],r['line'],r['hex'],*r['rgb'],False,r['sourcePageUrl'],r['sourceImageUrl']])
parts=[]
for line in ['Clasico','Vitro','Nuevo']:
 parts.append(f'<h2>{line} <small>{sum(r["line"]==line for r in rows)} referencias</small></h2><div class="grid">')
 for r in rows:
  if r["line"] != line: continue
  # Embed original textures only in this local comparison artifact, not the storefront.
  import io
  im=Image.open(root/'originals'/f"{r['code']}.bmp"); buf=io.BytesIO(); im.save(buf,format='PNG'); img=base64.b64encode(buf.getvalue()).decode()
  parts.append(f'<article><div class="samples"><img alt="Textura original {r["code"]}" src="data:image/png;base64,{img}"><div style="background:{r["hex"]}" title="HEX estimado {r["hex"]}"></div></div><div class="labels"><span>Original Murvi</span><span>Promedio digital</span></div><h3>{r["code"]} <code>{r["hex"]}</code></h3><a href="{html.escape(r["sourcePageUrl"])}">Ver referencia ↗</a></article>')
 parts.append('</div>')
page='''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Canela · Referencias Murvi</title><style>
*{box-sizing:border-box}body{font-family:system-ui,sans-serif;margin:0;background:#f8f4eb;color:#3e3026}main{max-width:1180px;margin:auto;padding:40px 24px}header{max-width:820px;margin-bottom:36px}.eyebrow{letter-spacing:.2em;font-size:12px;font-weight:700;color:#8e6b2c}h1{font-size:clamp(28px,5vw,48px);line-height:1.08;letter-spacing:-.04em;margin:18px 0}p{line-height:1.7}aside{border-left:3px solid #b08847;padding:12px 18px;background:#eee5d3;line-height:1.6}h2{margin:40px 0 20px;font-size:24px}small{font-weight:400;font-size:13px;margin-left:12px;color:#77695d}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px}article{background:#fffdf7;border:1px solid #dfd4bf;padding:12px;border-radius:8px}.samples{display:flex;height:80px}.samples img,.samples div{width:50%;object-fit:cover}.labels{display:flex;justify-content:space-between;font-size:8px;color:#77695d;padding-top:4px}h3{font-size:14px;display:flex;justify-content:space-between;margin:12px 0}code{font-size:11px;font-weight:400}a{color:#725337;font-size:11px}footer{border-top:1px solid #dfd4bf;margin-top:36px;padding-top:20px;font-size:13px;color:#77695d}
</style><main><header><div class="eyebrow">CANELA / MATERIAL DE TRABAJO</div><h1>La paleta de Murvi,<br>con su referencia digital.</h1><p>62 muestras del PDF recibido: 38 Clásico, 17 Vitro y 7 Nuevo. Cada tarjeta compara la textura original del fabricante con el tono plano calculado para una previsualización.</p><aside><strong>Valores estimados, sin calibración física.</strong> El HEX representa la fotografía, no garantiza el tono de una venecita real. Vitro es transparente; la base, iluminación y partida pueden cambiar el resultado.</aside></header>'''+''.join(parts)+'''<footer>Fuentes: PDF aportado y archivos BMP de 90 × 90 px del interactivo oficial de Murvi. Consulta: 27/10/2026. DI99 se identificó en el enlace del último recuadro, que no tiene rótulo en el PDF. Los archivos no traen perfil ICC: se asumió sRGB. Método: región central, descarte de extremos de luminosidad, promedio OKLab y conversión a sRGB. Para validar la reproducción física hace falta una muestra del material y la base real.</footer></main></html>'''
(root/'murvi-palette.html').write_text(page)
print('Exported',len(rows),'unique codes',len(set(r['id'] for r in rows)),'hexes',len(set(r['hex'] for r in rows)))
print('\n'.join(f"{r['code']:7} {r['hex']}" for r in rows))
