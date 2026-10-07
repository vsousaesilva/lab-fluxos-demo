"""Desenha os diagramas do fluxo de Acordo no mesmo padrão dos SVGs do MS.

Uso: python gen_acordo.py  (grava fluxos/SJP.svg, JFCE_FLUXO_ACORDO.svg,
JEF_INAUTJUNACORD.svg e JFCE_SENTACORDO.svg)

Fonte: especificação extraída dos XMLs jPDL de fluxos-pje-ativos-2026-09-26.
Cada nó e transição recebe data-name, usado pelos cenários do simulador.
"""
from html import escape
from pathlib import Path

OUT = Path(__file__).resolve().parent / "fluxos"


class Svg:
    def __init__(self, w, h, title, note):
        self.w, self.h, self.parts = w, h, []
        self.add(f'<text x="24" y="30" font-size="16" font-weight="700" fill="#111">{escape(title)}</text>')
        self.add(f'<text x="24" y="48" class="note">{escape(note)}</text>')

    def add(self, s):
        self.parts.append(s)

    def lanes(self, rows, x1):
        alt = False
        for name, y0, y1 in rows:
            self.add(f'<rect class="{"lanealt" if alt else "lane"}" x="24" y="{y0}" width="{x1 - 24}" height="{y1 - y0}"/>')
            alt = not alt
        alt = False
        for name, y0, y1 in rows:
            self.add(f'<rect class="{"lane" if alt else "lanealt"}" x="24" y="{y0}" width="34" height="{y1 - y0}"/>')
            self.add(f'<text class="lanelbl" transform="translate(46,{(y0 + y1) // 2 + len(name) * 4}) rotate(-90)">{name}</text>')
            alt = not alt

    def box(self, name, cls, x, y, w, h, title, subs=()):
        self.add(f'<rect class="{cls}" data-name="{name}" x="{x}" y="{y}" width="{w}" height="{h}"/>')
        lines = [("tt", t) for t in (title if isinstance(title, (list, tuple)) else [title])] + [("ts", s) for s in subs]
        lh = {"tt": 16, "ts": 13}
        total = sum(lh[c] for c, _ in lines)
        cy = y + (h - total) / 2 + 12
        for c, t in lines:
            self.add(f'<text x="{x + w / 2:g}" y="{cy:g}" class="{c}" text-anchor="middle">{escape(t)}</text>')
            cy += lh[c]

    def gw(self, name, cx, cy, label, lx, ly, anchor="start", sub=None):
        self.add(f'<path class="gw" data-name="{name}" d="M{cx},{cy - 44} L{cx + 45},{cy} L{cx},{cy + 44} L{cx - 45},{cy} z"/>')
        rows = label + ([sub] if sub else [])
        w = max(len(t) for t in rows) * 6.4 + 8
        rx = lx - 3 if anchor == "start" else lx - w + 3
        self.add(f'<rect x="{rx:g}" y="{ly - 10}" width="{w:g}" height="{13 * len(rows) + 2}" fill="#fff"/>')
        for i, t in enumerate(label):
            self.add(f'<text x="{lx}" y="{ly + i * 13}" class="gl" text-anchor="{anchor}">{escape(t)}</text>')
        if sub:
            self.add(f'<text x="{lx}" y="{ly + len(label) * 13}" class="ts" text-anchor="{anchor}">{escape(sub)}</text>')

    def ev(self, name, cx, cy, end=False, label=None):
        self.add(f'<circle class="ev" data-name="{name}" cx="{cx}" cy="{cy}" r="16" stroke-width="{3.4 if end else 1.8}"/>')
        if label:
            self.add(f'<text x="{cx}" y="{cy + 35}" class="ts" text-anchor="middle">{escape(label)}</text>')

    def flow(self, name, d, label=None, lx=0, ly=0, cls="flow"):
        self.add(f'<path class="{cls}" data-name="{name}" d="{d}"/>')
        if label:
            self.lbl(label, lx, ly)

    def par(self, name, d, label=None, lx=0, ly=0):
        self.flow(name, d, label, lx, ly, cls="par")

    def lbl(self, text, lx, ly):
        w = len(text) * 5.6 + 8
        self.add(f'<rect x="{lx - 3}" y="{ly - 11}" width="{w:g}" height="14" fill="#fff"/>')
        self.add(f'<text x="{lx}" y="{ly}" class="el">{escape(text)}</text>')

    def write(self, fname, source):
        self.add(f'<text x="24" y="{self.h - 14}" class="note">{escape(source)}</text>')
        body = "\n  ".join(self.parts)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" '
               f'font-family="Segoe UI, Arial, sans-serif">\n  {body}\n</svg>\n')
        (OUT / fname).write_text(svg, encoding="utf-8")


SRC = "Fonte: XMLs jPDL de fluxos-pje-ativos-2026-09-26."

# ---------------------------------------------------------------- SJP
s = Svg(1480, 700, "SJP — Sinalizar Juntada de Petição (trecho do acordo)",
        "Fluxo de serviço disparado em toda juntada · só o trecho que leva à proposta de acordo")
s.lanes([("PARTE", 70, 220), ("SISTEMA", 220, 470), ("DESTINOS", 470, 650)], 1456)
s.box("P0", "task", 150, 100, 260, 80, ["Advogado ou procurador", "protocola a petição"], ["tipo de documento 40 — proposta de acordo"])
s.ev("INI", 280, 345, label="Início")
s.gw("EXT", 430, 345, ["Juntado por", "usuário externo?"], 375, 410)
s.box("SIG", "auto", 530, 314, 210, 62, "Sinalizar juntada geral", ["sinal sjp:aguardaPeticao", "acorda quem esperava petição"])
s.gw("LAUDO", 840, 345, ["Juntado laudo", "pericial?"], 795, 410)
s.box("ENT", "auto", 950, 305, 230, 80, "Proposta de Acordo?", ["se o tipo do documento = 40", "incluirNovoFluxo"])
s.ev("FIM", 1310, 345, end=True, label="Término")
s.box("INTERNO", "link", 330, 530, 190, 62, "Origem interna", ["não cria o fluxo de acordo"])
s.box("ESPERA", "link", 545, 530, 200, 62, "Fluxos que esperavam", ["petição são acordados"])
s.box("LAUDOD", "link", 770, 530, 170, 62, "Ramo do laudo", ["pericial"])
s.box("ACORDO", "sub", 990, 525, 250, 72, "Fluxo de proposta de acordo", ["JFCE_FLUXO_ACORDO", "criado ao lado · paralelo"])
s.flow("f_p0", "M280,180 L280,329", "juntada", 286, 262)
s.flow("f_ext", "M296,345 L385,345")
s.flow("f_sig", "M475,345 L530,345", "SIM", 485, 338)
s.flow("f_int", "M430,389 L430,530", "NÃO · interno", 436, 470)
s.flow("f_laudo", "M740,345 L795,345")
s.flow("f_laudosim", "M840,389 L840,530", "SIM", 846, 470)
s.flow("f_ent", "M885,345 L950,345", "NÃO", 896, 338)
s.flow("f_fim", "M1180,345 L1294,345")
s.par("p_sig", "M635,376 L635,530", "sinal genérico · antes de tudo", 641, 455)
s.par("p_ent", "M1065,385 L1065,525", "cria o fluxo ao lado", 1071, 455)
s.write("SJP.svg", SRC + " O sinal genérico sai antes da criação do fluxo de acordo.")

# ---------------------------------------------------- JFCE_FLUXO_ACORDO
s = Svg(1900, 880, "JFCE_FLUXO_ACORDO — [JFCE] Fluxo de proposta de acordo",
        "Contorno grosso = fluxo paralelo criado · caixa cinza = automático · caixa branca = tarefa humana · tracejado azul = incluirNovoFluxo")
s.lanes([("SECRETARIA", 70, 330), ("SISTEMA", 330, 620), ("DESTINOS", 620, 820)], 1876)
s.ev("INI", 140, 470, label="Início")
s.box("ET1", "auto", 185, 439, 180, 62, "Vincular etiqueta", ["[A] Proposta de acordo"])
s.gw("D1", 455, 470, ["Está concluso", "para julgamento?"], 405, 535, anchor="end", sub="movimento CNJ 51")
s.box("N1", "auto", 550, 350, 200, 76, "Gerar despacho de vista", ["mov. 11022 temporário", "junta e manda intimar"])
s.box("N2", "auto", 550, 510, 200, 76, ["Intimar polo ativo", "via DJEN"], ["e encerra as tarefas abertas"])
s.box("ESP", "task", 800, 106, 250, 90, ["[JFCE] Controle de prazo", "— proposta de acordo"], ["espera: petição · prazo · expediente"])
s.gw("D2", 925, 470, ["Acordou por", "petição?"], 975, 512)
s.gw("D3", 1110, 470, ["A petição é", "do tipo 190?"], 1065, 535)
s.box("TC", "task", 1290, 100, 240, 70, ["[JFCE] Expediente de acordo", "— com manifestação"])
s.box("TS", "task", 1290, 220, 240, 70, ["[JFCE] Expediente de acordo", "— sem manifestação"])
s.box("PAC", "task", 1620, 160, 220, 70, ["[JEF] Comunicação", "acordo — elaborar"], ["PAC completo"])
s.box("N3", "auto", 1620, 500, 200, 72, "Intimar polo passivo", ["incluirNovoFluxo da intimação"])
s.box("DESV", "task", 110, 96, 240, 84, ["[JFCE] Proposta de acordo"], ["só pela tarefa de desvio", "“Cuidado ao movimentar…”"])
s.gw("D4", 230, 255, ["Há outro fluxo", "aberto?"], 282, 250)
s.ev("FIM", 200, 715, end=True, label="Término")
s.box("ANS", "auto", 300, 680, 190, 62, "Análise da secretaria", ["JEF_ANSECR"])
s.box("INT", "sub", 550, 680, 220, 72, "Intimação da juntada", ["JEF_INAUTJUNACORD", "fluxo paralelo"])
s.box("SENT", "auto", 1290, 670, 240, 72, "Sentença homologatória", ["JFCE_SENTACORDO", "incluirNovoFluxo · Término"])
s.flow("f_ini", "M156,470 L185,470")
s.flow("f_et", "M365,470 L410,470")
s.flow("f_d1sim", "M455,426 L455,388 L550,388", "SIM", 461, 405)
s.flow("f_d1nao", "M455,514 L455,520 L500,520 L500,548 L550,548")
s.lbl("NÃO", 506, 538)
s.flow("f_n1esp", "M750,388 L780,388 L780,165 L800,165")
s.flow("f_n2esp", "M750,548 L790,548 L790,180 L800,180")
s.flow("f_espd2", "M925,196 L925,426", "acordou", 931, 300)
s.flow("f_d2sim", "M970,470 L1065,470", "SIM", 990, 463)
s.flow("f_d2nao", "M925,514 L925,560 L960,560 L960,598 L1250,598 L1250,255 L1290,255", "NÃO · prazo ou expediente fechado", 990, 591)
s.flow("f_d3nao", "M1110,426 L1110,135 L1290,135", "NÃO · outra petição", 1116, 300)
s.flow("f_d3sim", "M1155,470 L1200,470 L1200,706 L1290,706", "SIM · atalho", 1206, 640)
s.flow("bus", "M1530,135 L1570,135 M1530,255 L1570,255 M1570,135 L1570,640", cls="bus")
s.lbl("saídas comuns", 1576, 420)
s.flow("f_bussent", "M1570,640 L1570,706 L1530,706", "gerar sentença", 1576, 660)
s.flow("f_buspac", "M1570,195 L1620,195")
s.flow("f_busn3", "M1570,536 L1620,536")
s.flow("f_tcn2", "M1410,100 L1410,78 L765,78 L765,525 L750,525", "intimar parte contrária", 1100, 74)
s.flow("f_pacesp", "M1730,160 L1730,92 L1000,92 L1000,106", "volta à espera", 1600, 88)
s.flow("f_n3esp", "M1680,500 L1680,312 L1010,312 L1010,196", "volta à espera", 1400, 308)
s.flow("f_espdesv", "M800,128 L350,128", "nó de desvio", 560, 122)
s.flow("f_desvd4", "M230,180 L230,211", "encerrar fluxo de acordo", 236, 200)
s.flow("f_d4sim", "M185,255 L90,255 L90,715 L184,715", "SIM", 96, 300)
s.flow("f_d4nao", "M230,299 L230,318 L387,318 L387,680", "NÃO · evita processo órfão", 393, 352)
s.flow("f_espans", "M820,196 L820,620 L470,620 L470,680", "análise de secretaria", 680, 614)
s.par("p_n2", "M650,586 L650,680", "cria ramo paralelo", 656, 650)
s.par("p_n1", "M550,410 L520,410 L520,660 L600,660 L600,680")
s.par("p_n3", "M1720,572 L1720,650 L760,650 L760,680", "cria ramo paralelo", 1300, 646)
s.write("JFCE_FLUXO_ACORDO.svg", SRC + " As saídas com e sem manifestação diferem só na intimação: parte contrária (com) ou polo passivo (sem).")

# ---------------------------------------------------- JEF_INAUTJUNACORD
s = Svg(1520, 680, "JEF_INAUTJUNACORD — [JEF] Intimação automática da juntada do Acordo",
        "Ramo paralelo criado pelo fluxo de acordo · o subfluxo [CP] Intimação automática aparece aberto")
s.lanes([("SECRETARIA", 70, 230), ("SISTEMA", 230, 470), ("DESTINOS", 470, 630)], 1496)
s.add('<rect class="grp" x="150" y="244" width="1012" height="196" rx="14"/>')
s.add('<text x="164" y="264" class="gl" fill="#00699F">dentro do [CP] Intimação automática (CP_INTAUT)</text>')
s.ev("INI", 105, 350, label="Início")
s.box("C1", "auto", 170, 319, 170, 62, "Criar documento", ["minuta do modelo · juntada", "movimento 581"])
s.box("C2", "auto", 380, 307, 210, 86, "Processar intimação", ["advogados → DJEN", "órgãos e defensoria → sistema", "prazo em dobro onde cabe"])
s.gw("C3", 660, 350, ["Intimação", "realizada?"], 616, 412)
s.box("C4", "auto", 740, 270, 170, 56, "Gerar certidão", ["certidão de intimação"])
s.box("C5", "auto", 950, 319, 190, 62, "Verificar pendência", ["lista de partes não intimadas"])
s.gw("PEND", 1240, 350, ["Sobrou parte", "sem intimar?"], 1290, 372)
s.box("TPEND", "task", 1110, 95, 300, 84, ["[JEF] Acordo — Analisar pendência", "de intimação do acordo"], ["miniPAC · prazo sugerido de 5 dias"])
s.ev("FIM", 1240, 545, end=True, label="Término")
s.box("ANCOM", "auto", 1320, 515, 160, 62, "Análise de comunicação", ["JEF_ANCOM"])
s.flow("f_ini", "M121,350 L170,350")
s.flow("f_c1", "M340,350 L380,350")
s.flow("f_c2", "M590,350 L615,350")
s.flow("f_c3sim", "M660,306 L660,298 L740,298", "SIM", 666, 292)
s.flow("f_c4", "M910,298 L1045,298 L1045,319")
s.flow("f_c3nao", "M705,350 L950,350", "NÃO", 760, 343)
s.flow("f_c5", "M1140,350 L1195,350")
s.flow("f_vazia", "M1240,394 L1240,529", "NÃO · todos intimados", 1246, 470)
s.flow("f_sobrou", "M1285,350 L1330,350 L1330,179", "SIM", 1336, 260)
s.flow("f_ancom", "M1410,137 L1440,137 L1440,515")
s.flow("f_pendfim", "M1170,179 L1170,545 L1224,545", "término", 1176, 500)
s.write("JEF_INAUTJUNACORD.svg", SRC + " O prazo de 5 dias da tarefa de pendência é o único prazo fixado no fluxo de acordo.")

# ---------------------------------------------------- JFCE_SENTACORDO
s = Svg(1900, 860, "JFCE_SENTACORDO — [JEF] Elaboração de Sentença - proposta acordo",
        "Movimento 466 nasce temporário na minuta e só vira definitivo depois da assinatura")
s.lanes([("SECRETARIA", 70, 250), ("MAGISTRADO", 250, 400), ("SISTEMA", 400, 640), ("DESTINOS", 640, 810)], 1876)
s.ev("INI", 105, 520, label="Início")
s.box("S1", "auto", 150, 489, 180, 62, "Vincular etiqueta", ["[A] Homologar acordo"])
s.gw("S2", 420, 520, ["Já está", "concluso?"], 377, 585, sub="Conclusão × Magistrado")
s.box("S3", "auto", 500, 489, 180, 62, "Lançar concluso", ["para julgamento · mov. 51"])
s.box("MIN", "task", 540, 110, 270, 90, ["[JEF] Minutar sentença — Acordo"], ["minuta gerada do modelo", "mov. 466 lançado temporário"])
s.box("COR", "task", 900, 110, 250, 80, ["[JEF] Minutar sentença", "de acordo — Corrigir"])
s.box("ASS", "auto", 860, 470, 200, 62, "Encaminhar para assinatura", ["opção: obrigação de fazer (CEAB)"])
s.box("MAG", "task", 900, 290, 250, 80, ["[JEF] Ato do magistrado", "— Sentença de acordo"], ["o juiz assina"])
s.box("HOM", "auto", 1220, 489, 220, 62, "Homologar movimentos", ["temporários · 466 definitivo"])
s.box("TRA", "auto", 1480, 478, 230, 84, ["Certificação do", "trânsito em julgado"], ["certidão · movimentos 848 e 581", "[A] Acordo homologado"])
s.gw("FORK", 1790, 520, ["Fork"], 1868, 446, anchor="end", sub="dois fluxos em paralelo")
s.box("CUM", "auto", 1440, 680, 200, 62, "Cumprimento de sentença", ["JEF_CUMPRSENT"])
s.box("OBR", "auto", 1670, 680, 190, 62, "Obrigação de fazer", ["JEF_INTOBRFAZ"])
s.ev("FIM", 1655, 785, end=True)
s.add('<text x="1682" y="789" class="ts">join · Término</text>')
s.flow("f_ini", "M121,520 L150,520")
s.flow("f_s1", "M330,520 L375,520")
s.flow("f_s2sim", "M420,476 L420,155 L540,155", "SIM", 426, 300)
s.flow("f_s2nao", "M465,520 L500,520", "NÃO", 470, 513)
s.flow("f_s3", "M640,489 L640,200")
s.flow("f_minass", "M760,200 L760,501 L860,501", "ato do magistrado", 766, 440)
s.flow("f_assmag", "M960,470 L960,370")
s.flow("f_magcor", "M1040,290 L1040,190", "corrigir", 1046, 245)
s.flow("f_cormin", "M900,150 L810,150")
s.flow("f_maghom", "M1150,330 L1330,330 L1330,489", "assinada", 1170, 324)
s.flow("f_minhom", "M700,200 L700,612 L1290,612 L1290,551", "homologar direto", 1000, 606)
s.flow("f_homtra", "M1440,520 L1480,520")
s.flow("f_trafork", "M1710,520 L1745,520")
s.flow("f_forkcum", "M1790,564 L1790,620 L1540,620 L1540,680")
s.flow("f_forkobr", "M1790,564 L1790,620 L1765,620 L1765,680")
s.flow("f_cumfim", "M1540,742 L1540,785 L1639,785")
s.flow("f_obrfim", "M1765,742 L1765,765 L1655,765 L1655,769")
s.write("JFCE_SENTACORDO.svg", SRC + " Os escapes de minuta (urgente, despacho, decisão, cálculo, extinção) foram omitidos para não poluir o desenho.")
print("ok")
