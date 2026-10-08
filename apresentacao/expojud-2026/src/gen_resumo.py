"""Diagramas-resumo (uma tela por fluxo) usados nos slides de casos práticos.

Uso: python gen_resumo.py   (grava fluxos/RESUMO_ACORDO.svg e fluxos/RESUMO_MS.svg)

Condensam o essencial dos diagramas detalhados (fluxos/*.svg) para que o
processo possa ser acompanhado do início ao fim numa única tela, sem zoom.
Cada nó e transição recebe data-name, usado pelos cenários do simulador.
"""
from html import escape
from pathlib import Path

OUT = Path(__file__).resolve().parent / "fluxos"
LH = {"tt": 21, "ts": 17}


class Svg:
    def __init__(self, w, h, title):
        self.w, self.h, self.parts = w, h, []
        self.add(f'<text x="24" y="20" font-size="16" font-weight="700" fill="#111">{escape(title)}</text>')

    def add(self, s):
        self.parts.append(s)

    def lanes(self, rows, x1):
        for k, (name, y0, y1) in enumerate(rows):
            self.add(f'<rect class="{"lanealt" if k % 2 else "lane"}" x="24" y="{y0}" width="{x1 - 24}" height="{y1 - y0}"/>')
        for k, (name, y0, y1) in enumerate(rows):
            self.add(f'<rect class="{"lane" if k % 2 else "lanealt"}" x="24" y="{y0}" width="40" height="{y1 - y0}"/>')
            self.add(f'<text class="lanelbl" transform="translate(50,{(y0 + y1) // 2 + len(name) * 5}) rotate(-90)">{name}</text>')

    def box(self, name, cls, x, y, w, h, title, subs=()):
        self.add(f'<rect class="{cls}" data-name="{name}" x="{x}" y="{y}" width="{w}" height="{h}"/>')
        lines = [("tt", t) for t in (title if isinstance(title, (list, tuple)) else [title])] + [("ts", s) for s in subs]
        total = sum(LH[c] for c, _ in lines)
        cy = y + (h - total) / 2 + 16
        for c, t in lines:
            self.add(f'<text x="{x + w / 2:g}" y="{cy:g}" class="{c}" text-anchor="middle">{escape(t)}</text>')
            cy += LH[c]

    def gw(self, name, cx, cy, label, lx, ly, anchor="start"):
        self.add(f'<path class="gw" data-name="{name}" d="M{cx},{cy - 46} L{cx + 47},{cy} L{cx},{cy + 46} L{cx - 47},{cy} z"/>')
        w = max(len(t) for t in label) * 8.6 + 10
        rx = lx - 4 if anchor == "start" else lx - w + 4
        self.add(f'<rect x="{rx:g}" y="{ly - 15}" width="{w:g}" height="{19 * len(label) + 4}" fill="#fff" rx="4"/>')
        for i, t in enumerate(label):
            self.add(f'<text x="{lx}" y="{ly + i * 19}" class="gl" text-anchor="{anchor}">{escape(t)}</text>')

    def flow(self, name, d, label=None, lx=0, ly=0, cls="flow"):
        self.add(f'<path class="{cls}" data-name="{name}" d="{d}"/>')
        if label:
            w = len(label) * 7.4 + 10
            self.add(f'<rect x="{lx - 4}" y="{ly - 14}" width="{w:g}" height="19" fill="#fff" rx="4"/>')
            self.add(f'<text x="{lx}" y="{ly}" class="el">{escape(label)}</text>')

    def par(self, name, d, label=None, lx=0, ly=0):
        self.flow(name, d, label, lx, ly, cls="par")

    def write(self, fname):
        body = "\n  ".join(self.parts)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" '
               f'font-family="Segoe UI, Arial, sans-serif">\n  {body}\n</svg>\n')
        (OUT / fname).write_text(svg, encoding="utf-8")


# ------------------------------------------------------------- ACORDO
s = Svg(1560, 1060, "Proposta de acordo — resumo")
s.lanes([("PARTE", 30, 170), ("PJE AUTOMÁTICO", 170, 480), ("SECRETARIA", 480, 720), ("MAGISTRADO", 720, 880), ("NOVOS FLUXOS", 880, 1040)], 1540)
s.box("P0", "task", 90, 55, 240, 90, "Parte protocola", ["proposta de acordo (tipo 40)"])
s.box("P1", "task", 690, 55, 260, 90, "A parte se manifesta", ["nova petição juntada"])
s.box("SJP", "auto", 90, 220, 240, 100, "PJe reconhece a proposta", ["cria o fluxo de acordo", "[A] Proposta de acordo"])
s.gw("D1", 430, 270, ["Concluso?"], 384, 345)
s.box("N2", "auto", 520, 220, 230, 100, "Intima a parte", ["e recolhe o processo", "para o fluxo de acordo"])
s.box("INT", "sub", 520, 380, 230, 80, "Intimação em paralelo", ["certidão e pendências"])
s.gw("D2", 1010, 270, ["Chegou", "petição?"], 1022, 342)
s.gw("D3", 1150, 270, ["Tipo 190?"], 1112, 207)
s.box("SENT", "auto", 1250, 220, 270, 100, "Sentença homologatória", ["cria o fluxo de homologação", "[A] Homologar acordo"])
s.box("HOM", "auto", 80, 380, 210, 80, "Homologa o 466", ["movimento definitivo"])
s.box("TRA", "auto", 320, 380, 190, 80, "Trânsito em julgado", ["[A] Acordo homologado"])
s.gw("FORK", 415, 960, ["Fork"], 300, 965)
s.box("ESP", "task", 690, 530, 260, 110, "Controle de prazo", ["espera petição, prazo", "ou expediente fechado"])
s.box("TC", "task", 1040, 530, 200, 110, "Lê a manifestação", ["e decide o caminho"])
s.box("MIN", "task", 1260, 530, 240, 110, "Minuta da sentença", ["pronta pelo sistema", "466 temporário"])
s.box("MAG", "task", 1260, 755, 240, 90, "Juiz assina", ["a sentença de acordo"])
s.box("CUM", "auto", 520, 920, 250, 80, "Cumprimento de sentença")
s.box("OBR", "auto", 800, 920, 230, 80, "Obrigação de fazer")
s.flow("e_p0", "M210,145 L210,220", "juntada", 218, 190)
s.flow("e_d1", "M330,270 L383,270")
s.flow("e_n2", "M477,270 L520,270", "NÃO", 482, 260)
s.par("p_int", "M635,320 L635,380")
s.flow("e_esp", "M750,290 L800,290 L800,530")
s.par("p_sig", "M880,145 L880,530", "sinal: chegou petição", 888, 200)
s.flow("e_acordou", "M950,585 L1010,585 L1010,316", "acordou", 1018, 470)
s.flow("e_d2", "M1057,270 L1103,270", "SIM", 1062, 260)
s.flow("e_tc", "M1150,316 L1150,350 L1120,350 L1120,530", "NÃO", 1128, 400)
s.flow("e_atalho", "M1197,270 L1250,270", "SIM", 1204, 260)
s.flow("e_anel", "M1040,615 L950,615", "intimar de novo", 890, 668)
s.flow("e_homolog", "M1180,530 L1180,500 L1300,500 L1300,320")
s.flow("e_min", "M1440,320 L1440,345 L1515,345 L1515,585 L1500,585")
s.flow("e_mag", "M1380,640 L1380,755")
s.flow("e_ass", "M1260,800 L185,800 L185,460", "assinada", 1100, 790)
s.flow("e_tra", "M290,420 L320,420")
s.flow("e_fork", "M415,460 L415,914")
s.flow("e_cum", "M462,960 L520,960")
s.flow("e_obr", "M415,1006 L415,1025 L915,1025 L915,1000")
s.write("RESUMO_ACORDO.svg")

# ------------------------------------------------------------- MANDADO DE SEGURANÇA
s = Svg(1560, 1000, "Mandado de Segurança — resumo")
s.lanes([("SECRETARIA", 30, 230), ("PJE AUTOMÁTICO", 230, 560), ("MAGISTRADO", 560, 720), ("DESTINOS", 720, 900)], 1540)
s.box("T1", "task", 270, 75, 230, 100, "Analisa a inicial", ["e escolhe o caminho"])
s.box("CP", "task", 760, 70, 260, 120, "Controle de prazo", ["só libera quando todos", "os expedientes fecham"])
s.box("T2", "task", 1080, 75, 230, 100, "Analisa a manifestação", ["e escolhe o caminho"])
s.box("A1", "auto", 80, 290, 200, 110, "Inicial de MS", ["etiqueta da classe", "aplicada sozinha"])
s.gw("G1", 365, 345, ["Liminar", "pendente?"], 320, 420)
s.box("A2", "auto", 450, 290, 220, 110, "Notifica a autoridade", ["coatora · 10 dias"])
s.gw("G2", 1110, 345, ["Houve", "manifestação?"], 1060, 420, anchor="end")
s.box("A4", "auto", 1300, 290, 220, 110, "Intima o MPF", ["10 dias · automático"])
s.box("A5", "auto", 1300, 445, 220, 90, "Intima as partes", ["15 dias, em dobro"])
s.gw("G4", 1180, 490, ["É MS?"], 1133, 568, anchor="start")
s.box("A6", "auto", 790, 445, 260, 90, "Prazo recursal do MS", ["identifica o tipo da sentença"])
s.gw("G5", 670, 490, ["Houve", "recurso?"], 625, 568)
s.gw("G6", 470, 490, ["Sentença", "concessiva?"], 425, 568)
s.box("SENT", "task", 1300, 590, 220, 100, "Juiz profere", ["a sentença"])
s.box("REM", "auto", 80, 765, 250, 95, "Remessa necessária", ["reexame no TRF5"])
s.box("CERT", "auto", 360, 765, 240, 95, "Trânsito em julgado", ["denegatória ou extinção"])
s.box("EMB", "auto", 630, 765, 240, 95, "Embargos", ["contrarrazões · 5 dias"])
s.box("AP", "auto", 900, 765, 240, 95, "Apelação", ["contrarrazões → TRF5"])
s.flow("e1", "M280,345 L318,345")
s.flow("e2", "M365,299 L365,175", "NÃO", 373, 250)
s.flow("e3", "M450,175 L450,232 L560,232 L560,290", "notificar", 470, 225)
s.flow("e4", "M670,345 L715,345 L715,130 L760,130", "todos intimados", 600, 262)
s.flow("e5", "M1020,160 L1045,160 L1045,345 L1063,345", "expedientes fechados", 878, 246)
s.flow("e6", "M1110,299 L1110,175", "SIM", 1118, 250)
s.flow("e7", "M1310,125 L1410,125 L1410,290", "intimar MPF", 1418, 210)
s.flow("e8", "M1410,400 L1410,420 L830,420 L830,190", "volta ao controle de prazo", 870, 412)
s.flow("e9", "M1310,150 L1530,150 L1530,640 L1520,640", "conclusão", 1460, 250)
s.flow("e10", "M1410,590 L1410,535")
s.flow("e11", "M1300,490 L1227,490")
s.flow("e12", "M1133,490 L1050,490", "SIM", 1070, 480)
s.flow("e13", "M790,490 L717,490")
s.flow("e14", "M623,490 L517,490", "NÃO", 550, 480)
s.flow("e15", "M423,490 L205,490 L205,765", "SIM", 213, 640)
s.flow("e16", "M470,536 L470,765", "NÃO", 478, 640)
s.flow("e17", "M670,536 L670,640 L750,640 L750,765", "embargos", 690, 630)
s.flow("e18", "M670,536 L670,640 L1020,640 L1020,765", "apelação", 900, 630)
s.write("RESUMO_MS.svg")
print("ok")
