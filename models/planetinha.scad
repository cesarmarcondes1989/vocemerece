// Planetinha NFC — Universo 2026
// Token 2.5D estilo Saturno: base plana, sem suporte, sem nome (a identidade mora na tag NFC).
//
// COMO IMPRIMIR
// 1. Use planetinha.stl e duplique no fatiador (16 por placa 256 mm, 9 por placa 220 mm).
// 2. No fatiador, adicione PAUSA no início da camada Z = pausa_z (ver console: echo).
// 3. Na pausa: cole um adesivo NFC NTAG213 de 25 mm no bolso de CADA peça, retome.
// 4. Teste cada peça com o celular ANTES de gravar/travar qualquer tag.
// Sem metal perto da tag (nada de filamento com pó metálico, nem base magnética colada).

/* [Planeta] */
planeta_d   = 34;   // diâmetro do corpo
base_h      = 3.0;  // parte cilíndrica
cupula_h    = 5.0;  // altura da cúpula em cima
/* [Anel] */
anel_ext    = [62, 22];  // elipse externa (largura, altura)
anel_int    = [44, 13];  // elipse interna (furo)
anel_h      = 2.4;
anel_rot    = -22;
/* [Tag NFC] */
tag_d       = 26;   // adesivo de 25 mm + folga
tag_z       = 1.2;  // começa a 1.2 mm do chão (6 camadas de 0.2)
tag_prof    = 0.6;  // profundidade do bolso
/* [Placa] */
grade       = 1;    // 1 = peça única; 4 = placa 4x4 (cama 256 mm); 3 = 3x3 (cama 220 mm)
passo       = 64;

$fn = 96;
pausa_z = tag_z + tag_prof;
echo(str(">>> PAUSAR NO INÍCIO DA CAMADA Z = ", pausa_z, " mm para inserir as tags NFC"));

module cupula() {
  // calota esférica: convexa para cima, imprime sem suporte
  r = (pow(planeta_d / 2, 2) + pow(cupula_h, 2)) / (2 * cupula_h);
  translate([0, 0, base_h]) intersection() {
    translate([0, 0, cupula_h - r]) sphere(r = r, $fn = 128);
    cylinder(d = planeta_d, h = cupula_h);
  }
}

module anel() {
  rotate([0, 0, anel_rot]) linear_extrude(anel_h) difference() {
    scale([anel_ext[0] / 2, anel_ext[1] / 2]) circle(1);
    scale([anel_int[0] / 2, anel_int[1] / 2]) circle(1);
  }
}

module planetinha() {
  difference() {
    union() {
      cylinder(d = planeta_d, h = base_h);
      cupula();
      anel();
    }
    // bolso da tag (fica totalmente escondido depois da pausa)
    translate([0, 0, tag_z]) cylinder(d = tag_d, h = tag_prof);
    // marca de orientação no fundo: lado de encostar o celular é o de cima
    translate([0, 0, -0.01]) linear_extrude(0.4) text("2026", size = 6, halign = "center", valign = "center", font = "Liberation Sans:style=Bold");
  }
}

for (i = [0 : grade - 1], j = [0 : grade - 1])
  translate([(i - (grade - 1) / 2) * passo, (j - (grade - 1) / 2) * passo, 0]) planetinha();
