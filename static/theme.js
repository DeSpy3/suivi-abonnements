// Mon budget — Copyright (c) 2026 Maël Sohier. Tous droits réservés. Voir LICENSE.
// Chargé avant l'affichage (sans defer) pour éviter un flash de l'ancien thème.
// « auto » suit le réglage clair/sombre du système.
function appliquerTheme(choix) {
  const systemeClair = matchMedia("(prefers-color-scheme: light)").matches;
  document.documentElement.dataset.theme = choix === "auto" ? (systemeClair ? "clair" : "violet") : choix;
}
let themeChoisi = "auto";
try { themeChoisi = localStorage.getItem("theme") || "auto"; } catch (e) { /* stockage indisponible */ }
appliquerTheme(themeChoisi);
