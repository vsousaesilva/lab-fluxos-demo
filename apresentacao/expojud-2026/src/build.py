"""Gera a apresentação em um único HTML autônomo (funciona offline).

Uso: python build.py   (antes, se mudar os diagramas-resumo: python gen_resumo.py)
Lê template.html, os diagramas em fluxos/*.svg e as logos, e grava
../Lab-Fluxos-ExpoJud.html. Os SVGs recebem ids estáveis (n0.. para nós,
f0.. para transições, na ordem do documento) usados pelos cenários do simulador.
"""
import base64
import json
import re
from pathlib import Path
from xml.dom import minidom

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "Lab-Fluxos-ExpoJud.html"

FLOWS = {
    "RESUMO_ACORDO": ("Proposta de acordo", "Resumo em uma tela."),
    "RESUMO_MS": ("Mandado de Segurança", "Resumo em uma tela."),
    "MS_ANLIN": ("Análise da inicial", "Vincula a etiqueta da classe, identifica pedido de liminar não apreciado e oferece os encaminhamentos ao magistrado."),
    "MS_INTAUTIMPET": ("Notificação da autoridade coatora", "Notifica o polo passivo em 10 dias, trata parte sem procuradoria vinculada e despacho por central de mandados."),
    "MS_CONTRPRAZ": ("Controle de prazo", "Grava o marco temporal, controla os expedientes e só libera o processo quando todos estiverem fechados."),
    "MS_ANMANFEST": ("Análise de manifestação", "Apura se houve juntada por parte no período controlado, desconsiderando documentos de origem interna."),
    "MS_INTMPF": ("Intimação do MPF", "Intima o MPF em 10 dias, como fiscal da ordem jurídica, e devolve o processo ao controle de prazo."),
    "MS_INTIMPRET": ("Perda superveniente do objeto", "Intima o impetrante em 10 dias, vincula a etiqueta correspondente e devolve ao controle de prazo."),
    "ELSENT": ("Elaboração de sentença · recorte", "Do ato assinado até o desvio por classe. Minutar, revisar e assinar não foram alterados."),
    "MS_CONTRPRAZREC-1": ("Controle de prazo recursal · 1/2", "Entrada, marco temporal, classificação da sentença e gestão dos expedientes do prazo recursal."),
    "MS_CONTRPRAZREC-2": ("Roteamento recursal · 2/2", "Cadeia de decisões quando o prazo se encerra, na ordem de precedência, e os destinos de cada hipótese."),
    "MS_CONTRPRAZCONTREMB": ("Contrarrazões aos embargos", "Identifica o polo que embargou, intima o contrário e o MPF em 5 dias e conclui para julgamento."),
    "CONTRPRAZ": ("Controle de prazo geral · recorte", "Teste de classe na entrada (acrescentado) e na saída (já existia)."),
    "SJP": ("Sinalizar Juntada de Petição", "Serviço disparado em toda juntada por usuário externo: olha o tipo do documento e avisa quem precisa saber."),
    "JFCE_FLUXO_ACORDO": ("Fluxo de proposta de acordo", "Etiqueta, decide o primeiro passo, intima e espera a manifestação no anel de controle de prazo."),
    "JEF_INAUTJUNACORD": ("Intimação da juntada do acordo", "Ramo paralelo: chama o [CP] Intimação automática e trata quem não pôde ser intimado."),
    "JFCE_SENTACORDO": ("Sentença homologatória de acordo", "Minuta, assinatura, homologação dos movimentos, trânsito em julgado e fork para o cumprimento."),
    "CONTRDEVEXP": ("Devolução de expediente · recorte", "A saída para controle de prazo passou a respeitar a variável indicada pelo fluxo chamador."),
}

# Diagramas embutidos na apresentação (os detalhados ficam em fluxos/ como referência)
EMBED = ("RESUMO_ACORDO", "RESUMO_MS")

NODE_RECT = {"task", "sub", "auto", "link"}


def process_svg(key: str) -> dict:
    doc = minidom.parse(str(HERE / "fluxos" / f"{key}.svg"))
    svg = doc.documentElement
    for defs in list(svg.getElementsByTagName("defs")):
        defs.parentNode.removeChild(defs)

    lanes = []
    n = e = 0
    for el in list(svg.childNodes):
        if el.nodeType != 1:
            continue
        cls = el.getAttribute("class")
        tag = el.tagName
        if tag == "text" and (el.getAttribute("font-size") == "16" or cls == "note"):
            svg.removeChild(el)  # título e notas vão para a interface
            continue
        if tag == "rect" and el.getAttribute("x") == "0" and el.getAttribute("y") == "0":
            svg.removeChild(el)
            continue
        if tag == "rect" and cls in ("lane", "lanealt"):
            lanes.append([float(el.getAttribute(k)) for k in ("x", "y", "width", "height")])
        if (tag == "rect" and cls in NODE_RECT) or (tag == "path" and cls == "gw") or tag == "circle":
            el.setAttribute("id", f"{key}-n{n}")
            el.setAttribute("data-k", cls or "ev")
            n += 1
        elif tag == "path" and cls == "flow":
            el.setAttribute("id", f"{key}-f{e}")
            e += 1

    x0 = min(l[0] for l in lanes)
    y0 = min(l[1] for l in lanes)
    x1 = max(l[0] + l[2] for l in lanes)
    y1 = max(l[1] + l[3] for l in lanes)
    pad = 12
    vb = [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad]
    for a in ("width", "height", "font-family"):
        if svg.hasAttribute(a):
            svg.removeAttribute(a)
    svg.setAttribute("viewBox", " ".join(f"{v:g}" for v in vb))
    svg.setAttribute("class", "fsvg")
    svg.setAttribute("data-flow", key)
    markup = svg.toxml()
    markup = re.sub(r">\s+<", "><", markup)
    title, desc = FLOWS[key]
    return {"title": title, "desc": desc, "vb": vb, "svg": markup}


def b64(name: str) -> str:
    return "data:image/png;base64," + base64.b64encode((HERE.parent / name).read_bytes()).decode()


def main() -> None:
    flows = {k: process_svg(k) for k in EMBED}
    html = (HERE / "template.html").read_text(encoding="utf-8")
    html = html.replace("{{FLOWS_JSON}}", json.dumps(flows, ensure_ascii=False).replace("</", "<\\/"))
    html = html.replace("{{LOGO_LAB}}", b64("logo-lab.png"))
    html = html.replace("{{LOGO_LAB_W}}", b64("logo-lab-branco.png"))
    html = html.replace("{{LOGO_JCP}}", b64("logo-jcp.png"))
    html = html.replace("{{LOGO_TRF5}}", b64("logo-trf5.png"))
    OUT.write_text(html, encoding="utf-8")
    print(f"ok {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
