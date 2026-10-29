const $ = (id) => document.getElementById(id);
const euro = (v) => Number(v).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const UNITE = { mensuel: "mois", trimestriel: "trimestre", annuel: "an" };
// Couleurs fixes pour certaines catégories, nuances de violet pour les autres
const COULEURS_CATEGORIES = { IA: "#f08a4b", Musique: "#e5484d", Cloud: "#3b82f6" };
const COULEURS_ZONES = { "Abonnements": "#8b5cf6", "Charges fixes": "#3b82f6", "Dépenses ponctuelles": "#f08a4b" };
const PALETTE = ["#8b5cf6", "#c4b5fd", "#6d28d9", "#a78bfa", "#5b21b6", "#ddd6fe"];
const NS = "http://www.w3.org/2000/svg";
const RAYON = 15.9155; // circonférence = 100, donc les pourcentages se lisent directement

const CATEGORIES_DEFAUT = [
  "Logement", "Énergie", "Transport", "Courses", "Santé", "Assurances",
  "Restaurants", "Loisirs", "Téléphone & Internet", "Shopping",
];

let PRESETS = [];
let synthese = null;
let enEdition = null; // id de l'abonnement en cours de modification
let iconeChoisie = null;
let typeDepense = "ponctuelle"; // ou "charge"
let depEdition = null; // { type, id } de la dépense en cours de modification
let moisAffiche = null; // mois affiché dans l'onglet Dépenses (AAAA-MM), fixé dans init()
let depensesDuMois = [];

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
  if (!rep.ok) {
    // FastAPI renvoie {"detail": "..."} ou, pour une erreur de validation, une liste d'erreurs
    const corps = await rep.json().catch(() => null);
    let message = corps?.detail;
    if (Array.isArray(message)) message = message.map((d) => d.msg).join(", ");
    throw new Error(message || "Erreur " + rep.status);
  }
  return rep.status === 204 ? null : rep.json();
}

function toast(message, type = "") {
  const t = h("div", "toast " + type, message);
  $("toasts").append(t);
  setTimeout(() => t.remove(), 3500);
}

// Remplace prompt()/confirm() : renvoie une promesse résolue à la fermeture
function ouvrirDialogue({ titre, texte = "", champ = false, valeur = "", okTexte = "OK", danger = false, effacer = false }) {
  const d = $("dialogue");
  $("dialogue-titre").textContent = titre;
  $("dialogue-texte").textContent = texte;
  $("dialogue-champ").hidden = !champ;
  $("dialogue-montant").required = champ;
  $("dialogue-montant").value = valeur;
  $("dialogue-ok").textContent = okTexte;
  $("dialogue-ok").classList.toggle("danger", danger);
  $("dialogue-effacer").hidden = !effacer;
  d.returnValue = ""; // Échap ferme sans valeur : équivaut à Annuler
  d.showModal();
  if (champ) $("dialogue-montant").select();
  return new Promise((resolve) => {
    d.addEventListener("close", () => resolve({ choix: d.returnValue, valeur: $("dialogue-montant").value }), { once: true });
  });
}

const json = (methode, corps) => ({
  method: methode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(corps),
});

const normaliser = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const dateLocale = (iso) => new Date(iso + "T00:00:00");
const jourCourt = (iso) => dateLocale(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

function dansCombienDeJours(iso) {
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  const n = Math.round((dateLocale(iso) - auj) / 86400000);
  if (n <= 0) return "aujourd'hui";
  if (n === 1) return "demain";
  return "dans " + n + " j";
}

// Associe une couleur à chaque catégorie, dans l'ordre de la liste
function couleursCategories(categories) {
  const couleurs = {};
  let i = 0;
  for (const c of categories) {
    couleurs[c.nom] = COULEURS_CATEGORIES[c.nom] ?? PALETTE[i++ % PALETTE.length];
  }
  return couleurs;
}

function couleurDepuisNom(nom) {
  let teinte = 0;
  for (const c of nom) teinte = (teinte * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${teinte} 55% 42%)`;
}

/* ---------- Logos ---------- */
function creerLogo(nom, slug, taille) {
  const preset = PRESETS.find((p) => p.slug === slug);
  const tuile = h("div", "logo");
  tuile.style.setProperty("--taille", taille + "px");

  const badge = () => {
    tuile.classList.add("badge");
    tuile.style.background = preset ? "#" + preset.couleur : couleurDepuisNom(nom);
    tuile.textContent = (nom.trim()[0] || "?").toUpperCase();
  };

  if (preset && preset.logo !== false) {
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

/* ---------- Services prédéfinis ---------- */
function rendrePresets() {
  const q = normaliser($("recherche").value.trim());
  const filtre = $("filtre-presets").value;
  const zone = $("presets");
  zone.replaceChildren();
  const liste = PRESETS.filter((p) =>
    (!filtre || p.categorie === filtre) && normaliser(p.nom + " " + p.categorie).includes(q));

  let groupe = null;
  for (const p of liste) {
    // Titre de groupe à chaque nouvelle catégorie (presets.json est rangé par catégorie)
    if (!filtre && p.categorie !== groupe) {
      groupe = p.categorie;
      zone.append(h("div", "groupe-presets", groupe));
    }
    const actif = p.slug === iconeChoisie;
    const ligne = h("button", "service" + (actif ? " actif" : ""));
    ligne.type = "button";
    ligne.setAttribute("aria-pressed", actif);
    const infos = h("span", "service-infos");
    infos.append(h("strong", "", p.nom), h("span", "", p.categorie));
    ligne.append(creerLogo(p.nom, p.slug, 32), infos, h("span", "coche", "✓"));
    ligne.onclick = () => {
      if (iconeChoisie === p.slug) {
        iconeChoisie = null;
      } else {
        iconeChoisie = p.slug;
        $("nom").value = p.nom;
        $("categorie").value = p.categorie;
        $("prix").focus();
      }
      rendrePresets();
    };
    zone.append(ligne);
  }
  if (liste.length === 0) zone.append(h("p", "vide", "Aucun service ne correspond."));
}

/* ---------- Graphiques ---------- */
// Dessine un donut dans le SVG idSvg, avec sa légende dans idLegende.
// parts : [{ nom, montant, pourcentage }], couleurs : { nom: couleur }
function rendreDonut(idSvg, idLegende, parts, total, couleurs) {
  const svg = $(idSvg);
  const legende = $(idLegende);
  svg.replaceChildren();
  legende.replaceChildren();

  const entrees = parts.filter((c) => Number(c.montant) > 0);
  const groupe = el("g", { transform: "rotate(-90 21 21)" });
  groupe.append(el("circle", { cx: 21, cy: 21, r: RAYON, class: "anneau-fond" }));

  let cumul = 0;
  entrees.forEach((c) => {
    const pct = c.pourcentage;
    const couleur = couleurs[c.nom];
    const longueur = Math.max(pct - (entrees.length > 1 ? 0.8 : 0), 0.1);

    const arc = el("circle", {
      cx: 21, cy: 21, r: RAYON, class: "anneau-arc", stroke: couleur,
      "stroke-dasharray": `${longueur} ${100 - longueur}`,
      "stroke-dashoffset": -cumul,
    });
    const titre = el("title");
    titre.textContent = `${c.nom} : ${euro(c.montant)} (${pct.toFixed(0)} %)`;
    arc.append(titre);
    groupe.append(arc);
    cumul += pct;

    const li = h("li");
    const point = h("span", "point");
    point.style.background = couleur;
    li.append(point, h("span", "legende-nom", c.nom), h("span", "discret", pct.toFixed(0) + " %"));
    legende.append(li);
  });

  svg.append(groupe);
  const valeur = el("text", { x: 21, y: 22, class: "centre-valeur" });
  valeur.textContent = euro(total);
  const label = el("text", { x: 21, y: 26.5, class: "centre-label" });
  label.textContent = "par mois";
  svg.append(valeur, label);
}

function rendreProjection(projection) {
  const zone = $("projection");
  zone.replaceChildren();
  const max = Math.max(...projection.map((p) => Number(p.total)), 1);
  const grille = h("div", "colonnes");

  projection.forEach((p, i) => {
    const col = h("div", "col");
    const zoneBarre = h("div", "col-zone");
    const barre = h("div", "col-barre" + (i === 0 ? " courant" : ""));
    barre.style.setProperty("--r", Number(p.total) / max);
    zoneBarre.append(h("span", "col-valeur", Math.round(Number(p.total)) + " €"), barre);
    const mois = dateLocale(p.mois + "-01").toLocaleDateString("fr-FR", { month: "short" });
    col.append(zoneBarre, h("span", "col-mois", mois));
    grille.append(col);
  });
  zone.append(grille);
}

function rendreBudgets(categories) {
  const zone = $("budgets");
  zone.replaceChildren();
  if (categories.length === 0) {
    zone.append(h("p", "vide", "Aucune catégorie pour l'instant."));
    return;
  }
  const couleurs = couleursCategories(categories);
  for (const c of categories) {
    const depense = Number(c.montant);
    const budget = c.budget === null ? null : Number(c.budget);

    const ligne = h("button", "budget-ligne");
    ligne.type = "button";
    ligne.title = "Cliquer pour définir le budget";
    const haut = h("div", "budget-haut");
    const detail = budget === null
      ? euro(depense) + " · " + c.pourcentage.toFixed(0) + " % · définir un budget"
      : euro(depense) + " / " + euro(budget);
    const nom = h("span", "budget-nom");
    const point = h("span", "point");
    point.style.background = couleurs[c.nom];
    nom.append(point, document.createTextNode(c.nom));
    haut.append(nom, h("span", "discret", detail));

    // Sans budget : la barre montre la part de la catégorie dans les dépenses
    const piste = h("div", "piste");
    const rempli = h("div", "remplissage");
    rempli.style.background = couleurs[c.nom];
    if (budget === null) {
      rempli.style.width = c.pourcentage + "%";
      rempli.classList.add("part");
    } else {
      rempli.style.width = (budget > 0 ? Math.min((depense / budget) * 100, 100) : 100) + "%";
      if (depense > budget) rempli.classList.add("depasse");
    }
    piste.append(rempli);
    ligne.append(haut, piste);
    ligne.onclick = () => definirBudgetCategorie(c);
    zone.append(ligne);
  }
}

/* ---------- Listes ---------- */
function rendreProchains(prochains) {
  const liste = $("prochains");
  liste.replaceChildren();
  if (prochains.length === 0) {
    liste.append(h("li", "vide", "Aucun prélèvement dans les 60 jours. Renseigne une date de prélèvement sur tes abonnements."));
    return;
  }
  for (const p of prochains) {
    const li = h("li", "proche");
    const infos = h("div", "proche-infos");
    infos.append(h("strong", "", p.nom), h("span", "discret", jourCourt(p.date) + " · " + dansCombienDeJours(p.date)));
    li.append(creerLogo(p.nom, p.icone, 36), infos, h("strong", "montant", "−" + euro(p.montant)));
    liste.append(li);
  }
}

function boutonIcone(texte, titre, classe, action) {
  const b = h("button", "icone-btn " + classe, texte);
  b.type = "button";
  b.title = titre;
  b.onclick = action;
  return b;
}

function creerLigne(a) {
  const li = h("li", "ligne");
  li.dataset.cle = "r-" + a.id; // r = récurrente (table abonnements)
  const infos = h("div", "ligne-infos");
  infos.append(h("strong", "", a.nom));
  const meta = h("div", "meta");
  if (a.categorie) meta.append(h("span", "pill", a.categorie));
  meta.append(h("span", "pill pill-freq", a.frequence));
  if (a.date_prelevement) meta.append(h("span", "pill pill-freq", "prélèvement le " + jourCourt(a.date_prelevement)));
  infos.append(meta);

  const prix = h("div", "ligne-prix");
  prix.append(
    h("strong", "", euro(a.cout_mensuel) + " / mois"),
    h("span", "discret", euro(a.prix) + " / " + UNITE[a.frequence])
  );

  const estCharge = a.type === "charge";
  const actions = h("div", "ligne-actions");
  actions.append(
    boutonIcone("✎", "Modifier", "", () => (estCharge ? editerDepense("charge", a) : editer(a))),
    boutonIcone("✕", "Supprimer", "danger", () => supprimer(a))
  );
  li.append(creerLogo(a.nom, a.icone, 40), infos, prix, actions);
  return li;
}

function rendreListe(abos) {
  $("compteur").textContent = abos.length + (abos.length > 1 ? " abonnements" : " abonnement");
  const liste = $("lignes");
  liste.replaceChildren();
  if (abos.length === 0) {
    liste.append(h("li", "vide", "Aucun abonnement pour l'instant : choisis un service à gauche pour commencer."));
  }
  for (const a of abos) liste.append(creerLigne(a));
}

function rendreCharges(charges) {
  $("compteur-charges").textContent = charges.length + (charges.length > 1 ? " charges" : " charge");
  const liste = $("lignes-charges");
  liste.replaceChildren();
  if (charges.length === 0) {
    liste.append(h("li", "vide", "Aucune charge fixe. Choisis « Charge fixe » à gauche pour ajouter ton loyer, ton assurance…"));
  }
  for (const c of charges) liste.append(creerLigne(c));
}

// Suggestions de catégories : celles par défaut, celles des services et celles déjà utilisées
function majCategories(recurrentes) {
  const noms = new Set([
    ...CATEGORIES_DEFAUT,
    ...PRESETS.map((p) => p.categorie),
    ...recurrentes.map((a) => a.categorie),
    ...depensesDuMois.map((d) => d.categorie),
  ].filter(Boolean));
  $("liste-categories").replaceChildren(...[...noms].sort((a, b) => a.localeCompare(b, "fr")).map((n) => {
    const o = document.createElement("option");
    o.value = n;
    return o;
  }));
}

/* ---------- Chargement ---------- */
async function charger() {
  const [recurrentes, s] = await Promise.all([api("/api/abonnements"), api("/api/synthese"), chargerDepenses()]);
  synthese = s;

  $("budget").textContent = s.budget === null ? "À définir" : euro(s.budget);
  $("mensuel").textContent = euro(s.mensuel);
  $("detail-mensuel").textContent = euro(s.recurrent) + " récurrent · " + euro(s.ponctuel) + " ponctuel";
  $("reste").textContent = s.reste === null ? "—" : euro(s.reste);
  $("kpi-reste").classList.toggle("negatif", s.reste !== null && Number(s.reste) < 0);

  rendreDonut("donut", "legende", s.zones, s.mensuel, COULEURS_ZONES);
  rendreDonut("donut-abos", "legende-abos", s.categories_abonnements, s.abonnements,
    couleursCategories(s.categories_abonnements));
  rendreProjection(s.projection);
  rendreBudgets(s.categories);
  rendreProchains(s.prochains);
  rendreListe(recurrentes.filter((a) => a.type !== "charge"));
  rendreCharges(recurrentes.filter((a) => a.type === "charge"));
  majCategories(recurrentes);
  marquerEdition();
}

/* ---------- Budgets ---------- */
// Renvoie le montant saisi, null pour effacer le budget, ou undefined si annulé
async function demanderMontant(titre, actuel) {
  const { choix, valeur } = await ouvrirDialogue({
    titre, texte: "Montant mensuel à ne pas dépasser.", champ: true,
    valeur: actuel ?? "", okTexte: "Enregistrer", effacer: actuel != null,
  });
  if (choix === "effacer") return null;
  if (choix !== "ok") return undefined;
  return valeur.trim().replace(",", ".");
}

async function definirBudget() {
  const montant = await demanderMontant("Budget mensuel", synthese?.budget);
  if (montant === undefined) return;
  try {
    await api("/api/budget", json("PUT", { montant }));
    await charger();
    toast(montant === null ? "Budget effacé" : "Budget enregistré");
  } catch (err) {
    toast("Budget invalide : " + err.message, "erreur");
  }
}

async function definirBudgetCategorie(c) {
  const montant = await demanderMontant("Budget mensuel pour « " + c.nom + " »", c.budget);
  if (montant === undefined) return;
  try {
    await api("/api/budgets", json("PUT", { categorie: c.nom, montant }));
    await charger();
    toast(montant === null ? "Budget « " + c.nom + " » effacé" : "Budget « " + c.nom + " » enregistré");
  } catch (err) {
    toast("Budget invalide : " + err.message, "erreur");
  }
}

/* ---------- Formulaire ---------- */
// Surligne les lignes en cours de modification (abonnement et/ou dépense)
function marquerEdition() {
  const cles = new Set();
  if (enEdition !== null) cles.add("r-" + enEdition);
  if (depEdition) cles.add((depEdition.type === "charge" ? "r-" : "d-") + depEdition.id);
  for (const li of document.querySelectorAll(".ligne")) {
    li.classList.toggle("en-edition", cles.has(li.dataset.cle));
  }
}

function editer(a) {
  afficherOnglet("abonnements");
  enEdition = a.id;
  iconeChoisie = a.icone ?? null;
  $("nom").value = a.nom;
  $("prix").value = a.prix;
  $("frequence").value = a.frequence;
  $("categorie").value = a.categorie ?? "";
  $("date").value = a.date_prelevement ?? "";
  $("titre-form").textContent = "Modifier l'abonnement";
  $("valider").textContent = "Enregistrer";
  $("annuler").hidden = false;
  rendrePresets();
  marquerEdition();
  $("ajouter").scrollIntoView({ behavior: "smooth", block: "center" });
  $("nom").focus();
}

function reinitialiser() {
  enEdition = null;
  iconeChoisie = null;
  $("formulaire").reset();
  $("titre-form").textContent = "Ajouter un abonnement";
  $("valider").textContent = "Ajouter";
  $("annuler").hidden = true;
  rendrePresets();
  marquerEdition();
}

async function supprimer(a) {
  const { choix } = await ouvrirDialogue({
    titre: "Supprimer « " + a.nom + " » ?", texte: "Cette action est définitive.", okTexte: "Supprimer", danger: true,
  });
  if (choix !== "ok") return;
  try {
    await api("/api/abonnements/" + a.id, { method: "DELETE" });
    if (enEdition === a.id) reinitialiser();
    if (depEdition?.type === "charge" && depEdition.id === a.id) reinitialiserDepense();
    await charger();
    toast("« " + a.nom + " » supprimé");
  } catch (err) {
    toast("Suppression impossible : " + err.message, "erreur");
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
    date_prelevement: $("date").value || null,
  };
  const url = enEdition ? "/api/abonnements/" + enEdition : "/api/abonnements";
  const message = enEdition ? "Modifications enregistrées" : "« " + corps.nom + " » ajouté";
  try {
    await api(url, json(enEdition ? "PUT" : "POST", corps));
    reinitialiser();
    await charger();
    toast(message);
  } catch (err) {
    toast("Enregistrement impossible : " + err.message, "erreur");
  }
});

$("annuler").addEventListener("click", reinitialiser);
$("recherche").addEventListener("input", rendrePresets);
$("filtre-presets").addEventListener("change", rendrePresets);
$("recherche").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  $("presets").querySelector(".service")?.click();
});

// Si le nom ne correspond plus au service choisi, on retire son logo
$("nom").addEventListener("input", () => {
  const preset = PRESETS.find((p) => p.slug === iconeChoisie);
  if (preset && normaliser($("nom").value.trim()) !== normaliser(preset.nom)) {
    iconeChoisie = null;
    rendrePresets();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || $("dialogue").open) return;
  if (enEdition !== null) reinitialiser();
  if (depEdition) reinitialiserDepense();
});
$("kpi-budget").addEventListener("click", definirBudget);

/* ---------- Dépenses ---------- */
// Date du jour au format AAAA-MM-JJ, en heure locale (toISOString serait en UTC)
function isoLocal(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

async function chargerDepenses() {
  const r = await api("/api/depenses?mois=" + moisAffiche);
  depensesDuMois = r.depenses;
  $("mois-affiche").textContent = dateLocale(moisAffiche + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  $("mois-suivant").disabled = moisAffiche >= isoLocal().slice(0, 7);
  $("total-depenses").textContent = euro(r.total);
  $("repartition").replaceChildren(...r.categories.map((c) => h("span", "pill", c.nom + " · " + euro(c.montant))));

  const liste = $("lignes-depenses");
  liste.replaceChildren();
  if (r.depenses.length === 0) {
    liste.append(h("li", "vide", "Aucune dépense ponctuelle ce mois-ci."));
  }
  for (const d of r.depenses) liste.append(creerLigneDepense(d));
  marquerEdition();
}

function creerLigneDepense(d) {
  const li = h("li", "ligne");
  li.dataset.cle = "d-" + d.id; // d = dépense ponctuelle
  const infos = h("div", "ligne-infos");
  infos.append(h("strong", "", d.libelle));
  const meta = h("div", "meta");
  if (d.categorie) meta.append(h("span", "pill", d.categorie));
  meta.append(h("span", "pill pill-freq", jourCourt(d.date)));
  infos.append(meta);

  const actions = h("div", "ligne-actions");
  actions.append(
    boutonIcone("✎", "Modifier", "", () => editerDepense("ponctuelle", d)),
    boutonIcone("✕", "Supprimer", "danger", () => supprimerDepense(d))
  );
  li.append(creerLogo(d.libelle, null, 40), infos, h("strong", "montant", euro(d.montant)), actions);
  return li;
}

function choisirTypeDepense(type) {
  typeDepense = type;
  for (const b of document.querySelectorAll(".bascule button")) b.setAttribute("aria-pressed", b.dataset.type === type);
  const charge = type === "charge";
  for (const e of document.querySelectorAll(".seulement-charge")) e.hidden = !charge;
  for (const e of document.querySelectorAll(".seulement-ponctuelle")) e.hidden = charge;
  $("dep-date").required = !charge;
  $("dep-libelle").placeholder = charge ? "Loyer, assurance auto…" : "Essence, courses…";
  $("aide-depense").textContent = charge
    ? "Saisie une seule fois, comptée automatiquement à chaque échéance."
    : "Une dépense à une date précise, comptée dans son mois.";
}

function editerDepense(type, d) {
  afficherOnglet("depenses");
  depEdition = { type, id: d.id };
  choisirTypeDepense(type);
  for (const b of document.querySelectorAll(".bascule button")) b.disabled = true;
  if (type === "charge") {
    $("dep-libelle").value = d.nom;
    $("dep-montant").value = d.prix;
    $("dep-frequence").value = d.frequence;
    $("dep-prelevement").value = d.date_prelevement ?? "";
  } else {
    $("dep-libelle").value = d.libelle;
    $("dep-montant").value = d.montant;
    $("dep-date").value = d.date;
  }
  $("dep-categorie").value = d.categorie ?? "";
  $("titre-depense").textContent = type === "charge" ? "Modifier la charge fixe" : "Modifier la dépense";
  $("dep-valider").textContent = "Enregistrer";
  $("dep-annuler").hidden = false;
  marquerEdition();
  $("ajouter-depense").scrollIntoView({ behavior: "smooth", block: "center" });
  $("dep-libelle").focus();
}

function reinitialiserDepense() {
  depEdition = null;
  $("form-depense").reset();
  $("dep-date").value = isoLocal();
  for (const b of document.querySelectorAll(".bascule button")) b.disabled = false;
  $("titre-depense").textContent = "Ajouter une dépense";
  $("dep-valider").textContent = "Ajouter";
  $("dep-annuler").hidden = true;
  marquerEdition();
}

async function supprimerDepense(d) {
  const { choix } = await ouvrirDialogue({
    titre: "Supprimer « " + d.libelle + " » ?", texte: "Cette action est définitive.", okTexte: "Supprimer", danger: true,
  });
  if (choix !== "ok") return;
  try {
    await api("/api/depenses/" + d.id, { method: "DELETE" });
    if (depEdition?.type === "ponctuelle" && depEdition.id === d.id) reinitialiserDepense();
    await charger();
    toast("« " + d.libelle + " » supprimé");
  } catch (err) {
    toast("Suppression impossible : " + err.message, "erreur");
  }
}

$("form-depense").addEventListener("submit", async (e) => {
  e.preventDefault();
  const charge = typeDepense === "charge";
  const libelle = $("dep-libelle").value.trim();
  const categorie = $("dep-categorie").value.trim() || null;
  const corps = charge
    ? {
      nom: libelle, prix: $("dep-montant").value, frequence: $("dep-frequence").value,
      categorie, icone: null, date_prelevement: $("dep-prelevement").value || null, type: "charge",
    }
    : { libelle, montant: $("dep-montant").value, categorie, date: $("dep-date").value };
  const base = charge ? "/api/abonnements" : "/api/depenses";
  const id = depEdition?.id;
  const message = id ? "Modifications enregistrées" : "« " + libelle + " » ajouté";
  try {
    await api(id ? base + "/" + id : base, json(id ? "PUT" : "POST", corps));
    if (!charge) moisAffiche = corps.date.slice(0, 7); // affiche le mois de la dépense
    reinitialiserDepense();
    await charger();
    toast(message);
  } catch (err) {
    toast("Enregistrement impossible : " + err.message, "erreur");
  }
});

$("dep-annuler").addEventListener("click", reinitialiserDepense);
for (const b of document.querySelectorAll(".bascule button")) {
  b.addEventListener("click", () => choisirTypeDepense(b.dataset.type));
}

function changerMois(n) {
  const d = dateLocale(moisAffiche + "-01");
  d.setMonth(d.getMonth() + n);
  moisAffiche = isoLocal(d).slice(0, 7);
  chargerDepenses().catch((err) => toast(err.message, "erreur"));
}
$("mois-precedent").addEventListener("click", () => changerMois(-1));
$("mois-suivant").addEventListener("click", () => changerMois(1));

/* ---------- Onglets ---------- */
const ONGLETS = ["apercu", "abonnements", "depenses"];

function afficherOnglet(nom) {
  if (!ONGLETS.includes(nom)) nom = "apercu";
  for (const b of document.querySelectorAll(".onglet")) b.setAttribute("aria-selected", b.dataset.onglet === nom);
  for (const p of document.querySelectorAll("[data-panneau]")) p.hidden = p.dataset.panneau !== nom;
  history.replaceState(null, "", "#" + nom); // garde l'onglet au rechargement de la page
}

for (const b of document.querySelectorAll(".onglet")) {
  b.addEventListener("click", () => afficherOnglet(b.dataset.onglet));
}

async function init() {
  $("date-jour").textContent = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  afficherOnglet(location.hash.slice(1));
  moisAffiche = isoLocal().slice(0, 7);
  choisirTypeDepense("ponctuelle");
  reinitialiserDepense();
  PRESETS = await fetch("presets.json").then((r) => r.json()).catch(() => []);
  // Une option de filtre par catégorie, dans l'ordre du catalogue
  for (const c of new Set(PRESETS.map((p) => p.categorie))) {
    const o = document.createElement("option");
    o.value = o.textContent = c;
    $("filtre-presets").append(o);
  }
  rendrePresets();
  await charger();
}
init();