const $ = (id) => document.getElementById(id);
const euro = (v) => Number(v).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const UNITE = { mensuel: "mois", trimestriel: "trimestre", annuel: "an" };
const COULEURS = ["#E4572E", "#2E86AB", "#E9A23B", "#7D5BA6", "#2A9D8F", "#D1497B", "#6A994E", "#B5651D"];
const NEUTRE = "#9A948A";
const NS = "http://www.w3.org/2000/svg";
const RAYON = 15.9155; // circonférence = 100, donc les pourcentages se lisent directement

const ICONES = {
  modifier: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg>',
  supprimer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',
};

let PRESETS = [];
let enEdition = null;
let iconeChoisie = null;
const couleursCat = new Map();

/* ---------- Utilitaires ---------- */
function h(tag, classe, texte) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

function el(nom, attrs = {}) {
  const e = document.createElementNS(NS, nom);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

async function api(url, options) {
  const rep = await fetch(url, options);
  if (!rep.ok) throw new Error("Erreur " + rep.status);
  return rep.status === 204 ? null : rep.json();
}

const normaliser = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Une couleur fixe par catégorie, la même partout (donut, barres, liste, catalogue)
function couleurCategorie(cat) {
  if (!cat) return NEUTRE;
  const cle = cat.trim().toLowerCase();
  if (!couleursCat.has(cle)) couleursCat.set(cle, COULEURS[couleursCat.size % COULEURS.length]);
  return couleursCat.get(cle);
}

function couleurDepuisNom(nom) {
  let teinte = 0;
  for (const c of nom) teinte = (teinte * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${teinte} 55% 45%)`;
}

/* ---------- Logos ---------- */
function creerLogo(nom, slug, taille) {
  const preset = PRESETS.find((p) => p.slug === slug);
  const tuile = h("div", "logo");
  tuile.style.setProperty("--taille", taille + "px");

  const badge = () => {
    tuile.classList.add("badge");
    tuile.replaceChildren();
    tuile.style.background = preset?.couleur ? "#" + preset.couleur : couleurDepuisNom(nom);
    tuile.textContent = (nom.trim()[0] || "?").toUpperCase();
  };

  if (preset) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = "logos/" + preset.slug + ".svg";
    img.onerror = badge; // logo absent : pastille colorée
    tuile.append(img);
  } else {
    badge();
  }
  return tuile;
}

/* ---------- Catalogue des services ---------- */
function rendrePresets() {
  const zone = $("presets");
  zone.replaceChildren();

  if (PRESETS.length === 0) {
    zone.append(h("p", "vide", "Aucun service prédéfini."));
    return;
  }

  const groupes = new Map();
  for (const p of PRESETS) {
    const cat = p.categorie || "Autres";
    if (!groupes.has(cat)) groupes.set(cat, []);
    groupes.get(cat).push(p);
  }

  for (const [cat, services] of groupes) {
    const groupe = h("details", "groupe");
    groupe.open = true;
    groupe.style.setProperty("--c", couleurCategorie(cat));

    const titre = h("summary");
    titre.append(h("span", "point"), h("span", "", cat), h("span", "groupe-nb", String(services.length)));

    const ul = h("ul", "presets-liste");
    services.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    for (const p of services) {
      const li = h("li");
      li.dataset.recherche = normaliser(p.nom + " " + cat);

      const btn = h("button", "preset");
      btn.type = "button";
      btn.dataset.slug = p.slug;
      btn.setAttribute("aria-pressed", "false");
      btn.append(creerLogo(p.nom, p.slug, 28), h("span", "preset-nom", p.nom));
      if (p.prix) btn.append(h("span", "preset-prix", euro(p.prix)));
      btn.onclick = () => choisirPreset(p);

      li.append(btn);
      ul.append(li);
    }

    groupe.append(titre, ul);
    zone.append(groupe);
  }
}

function choisirPreset(p) {
  if (iconeChoisie === p.slug) {
    iconeChoisie = null;
  } else {
    iconeChoisie = p.slug;
    $("nom").value = p.nom;
    $("categorie").value = p.categorie ?? "";
    if (p.prix) $("prix").value = p.prix;
    $("prix").focus();
  }
  marquerActif();
}

function marquerActif() {
  for (const btn of document.querySelectorAll(".preset")) {
    const actif = btn.dataset.slug === iconeChoisie;
    btn.classList.toggle("actif", actif);
    btn.setAttribute("aria-pressed", String(actif));
  }
}

function filtrerPresets() {
  const q = normaliser($("recherche").value.trim());
  let visibles = 0;

  for (const groupe of $("presets").querySelectorAll(".groupe")) {
    let n = 0;
    for (const li of groupe.querySelectorAll("li")) {
      const ok = !q || li.dataset.recherche.includes(q);
      li.hidden = !ok;
      if (ok) n++;
    }
    groupe.hidden = n === 0;
    if (q && n) groupe.open = true;
    visibles += n;
  }
  $("presets-vide").hidden = visibles > 0 || PRESETS.length === 0;
}

/* ---------- Graphiques ---------- */
function rendreDonut(parCategorie, mensuel) {
  const svg = $("donut");
  const legende = $("legende");
  svg.replaceChildren();
  legende.replaceChildren();

  const entrees = Object.entries(parCategorie)
    .map(([nom, v]) => [nom, Number(v)])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const somme = entrees.reduce((s, [, v]) => s + v, 0);

  const groupe = el("g", { transform: "rotate(-90 21 21)" });
  groupe.append(el("circle", { cx: 21, cy: 21, r: RAYON, class: "anneau-fond" }));

  let cumul = 0;
  for (const [nom, valeur] of entrees) {
    const pct = (valeur / somme) * 100;
    const couleur = couleurCategorie(nom);
    const longueur = Math.max(pct - (entrees.length > 1 ? 0.8 : 0), 0.1);

    const arc = el("circle", {
      cx: 21, cy: 21, r: RAYON, class: "anneau-arc", stroke: couleur,
      "stroke-dasharray": `${longueur} ${100 - longueur}`,
      "stroke-dashoffset": -cumul,
    });
    const titre = el("title");
    titre.textContent = `${nom} : ${euro(valeur)} (${pct.toFixed(0)} %)`;
    arc.append(titre);
    groupe.append(arc);
    cumul += pct;

    const li = h("li");
    const point = h("span", "point");
    point.style.setProperty("--c", couleur);
    li.append(point, h("span", "", nom), h("span", "montant", `${euro(valeur)} · ${pct.toFixed(0)} %`));
    legende.append(li);
  }

  if (entrees.length === 0) legende.append(h("li", "discret", "Rien pour l'instant"));

  svg.append(groupe);
  const valeur = el("text", { x: 21, y: 22, class: "centre-valeur" });
  valeur.textContent = euro(mensuel);
  const label = el("text", { x: 21, y: 26.5, class: "centre-label" });
  label.textContent = "par mois";
  svg.append(valeur, label);
}

function rendreBarres(abos) {
  const zone = $("barres");
  zone.replaceChildren();
  const tries = [...abos].sort((a, b) => Number(b.cout_mensuel) - Number(a.cout_mensuel)).slice(0, 8);
  if (tries.length === 0) {
    zone.append(h("p", "vide", "Aucune donnée pour le moment"));
    return;
  }
  const max = Number(tries[0].cout_mensuel);

  for (const a of tries) {
    const ligne = h("div", "barre-ligne");
    const nom = h("div", "barre-nom");
    nom.append(creerLogo(a.nom, a.icone, 22), h("span", "", a.nom));
    const piste = h("div", "piste");
    const rempli = h("div", "remplissage");
    rempli.style.background = couleurCategorie(a.categorie);
    piste.append(rempli);
    ligne.append(nom, piste, h("span", "barre-valeur", euro(a.cout_mensuel)));
    zone.append(ligne);

    void rempli.offsetWidth; // force le calcul pour déclencher l'animation
    rempli.style.width = (Number(a.cout_mensuel) / max) * 100 + "%";
  }
}

/* ---------- Liste ---------- */
function boutonIcone(svg, titre, classe, action) {
  const b = h("button", "icone-btn " + classe);
  b.type = "button";
  b.title = titre;
  b.setAttribute("aria-label", titre);
  b.innerHTML = svg;
  b.onclick = action;
  return b;
}

function creerLigne(a) {
  const li = h("li", "ligne");
  li.dataset.id = a.id;
  if (a.id === enEdition) li.classList.add("en-edition");

  const infos = h("div", "ligne-infos");
  infos.append(h("span", "ligne-nom", a.nom));
  const meta = h("div", "meta");
  if (a.categorie) {
    const pill = h("span", "pill", a.categorie);
    pill.style.setProperty("--c", couleurCategorie(a.categorie));
    meta.append(pill);
  }
  meta.append(h("span", "freq", a.frequence));
  infos.append(meta);

  const prix = h("div", "ligne-prix");
  prix.append(h("strong", "", euro(a.cout_mensuel) + " / mois"));
  if (a.frequence !== "mensuel") {
    prix.append(h("span", "discret", euro(a.prix) + " / " + UNITE[a.frequence]));
  }

  const actions = h("div", "ligne-actions");
  actions.append(
    boutonIcone(ICONES.modifier, "Modifier " + a.nom, "", () => editer(a)),
    boutonIcone(ICONES.supprimer, "Supprimer " + a.nom, "danger", () => supprimer(a))
  );

  li.append(creerLogo(a.nom, a.icone, 40), infos, prix, actions);
  return li;
}

function majCategories(abos) {
  const cats = new Set([...PRESETS.map((p) => p.categorie), ...abos.map((a) => a.categorie)].filter(Boolean));
  const options = [...cats].sort((a, b) => a.localeCompare(b, "fr")).map((c) => {
    const o = document.createElement("option");
    o.value = c;
    return o;
  });
  $("liste-categories").replaceChildren(...options);
}

/* ---------- Chargement ---------- */
async function charger() {
  const [abos, total] = await Promise.all([api("/api/abonnements"), api("/api/total")]);

  $("mensuel").textContent = euro(total.mensuel);
  $("annuel").textContent = euro(total.annuel);
  $("jour").textContent = euro(Number(total.annuel) / 365);
  $("compteur").textContent = abos.length + (abos.length > 1 ? " abonnements" : " abonnement");

  const plusCher = [...abos].sort((a, b) => Number(b.cout_mensuel) - Number(a.cout_mensuel))[0];
  $("plus-cher").textContent = plusCher ? euro(plusCher.cout_mensuel) : "—";
  $("plus-cher-nom").textContent = plusCher ? plusCher.nom : "";

  rendreDonut(total.par_categorie, total.mensuel);
  rendreBarres(abos);
  majCategories(abos);

  const liste = $("lignes");
  liste.replaceChildren();
  if (abos.length === 0) {
    liste.append(h("li", "vide", "Aucun abonnement pour l'instant. Choisis un service dans la liste pour commencer."));
  }
  for (const a of abos) liste.append(creerLigne(a));
}

/* ---------- Actions ---------- */
function marquerEdition() {
  for (const li of document.querySelectorAll(".ligne")) {
    li.classList.toggle("en-edition", enEdition !== null && li.dataset.id === String(enEdition));
  }
}

function editer(a) {
  enEdition = a.id;
  iconeChoisie = a.icone ?? null;
  $("nom").value = a.nom;
  $("prix").value = a.prix;
  $("frequence").value = a.frequence;
  $("categorie").value = a.categorie ?? "";
  $("titre-form").textContent = "Modifier « " + a.nom + " »";
  $("valider").textContent = "Enregistrer";
  $("annuler").hidden = false;
  marquerActif();
  marquerEdition();
  $("formulaire").scrollIntoView({ behavior: "smooth", block: "center" });
  $("nom").focus({ preventScroll: true });
}

function reinitialiser() {
  enEdition = null;
  iconeChoisie = null;
  $("formulaire").reset();
  $("titre-form").textContent = "Nouvel abonnement";
  $("valider").textContent = "Ajouter";
  $("annuler").hidden = true;
  marquerActif();
  marquerEdition();
}

async function supprimer(a) {
  if (!confirm("Supprimer « " + a.nom + " » ?")) return;
  try {
    await api("/api/abonnements/" + a.id, { method: "DELETE" });
    if (enEdition === a.id) reinitialiser();
    await charger();
  } catch (err) {
    alert("Suppression impossible : " + err.message);
  }
}

$("formulaire").addEventListener("submit", async (e) => {
  e.preventDefault();
  const corps = {
    nom: $("nom").value.trim(),
    prix: $("prix").value,
    frequence: $("frequence").value,
    categorie: $("categorie").value.trim() || null,
    icone: iconeChoisie,
  };
  const url = enEdition ? "/api/abonnements/" + enEdition : "/api/abonnements";
  try {
    await api(url, {
      method: enEdition ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    reinitialiser();
    await charger();
  } catch (err) {
    alert("Enregistrement impossible : " + err.message);
  }
});

$("annuler").addEventListener("click", reinitialiser);

$("recherche").addEventListener("input", filtrerPresets);
$("recherche").addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.target.value = "";
    filtrerPresets();
  }
  if (e.key === "Enter") {
    e.preventDefault();
    const premier = $("presets").querySelector("li:not([hidden]) .preset");
    if (premier) premier.click();
  }
});

async function init() {
  $("mois").textContent = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  PRESETS = await fetch("presets.json").then((r) => r.json()).catch(() => []);
  for (const p of PRESETS) couleurCategorie(p.categorie); // fixe l'ordre des couleurs
  rendrePresets();
  await charger();
}
init();
