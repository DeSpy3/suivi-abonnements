const $ = (id) => document.getElementById(id);
const euro = (v) => Number(v).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const UNITE = { mensuel: "mois", trimestriel: "trimestre", annuel: "an" };
const PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#ef4444", "#8b5cf6", "#14b8a6"];
const NS = "http://www.w3.org/2000/svg";
const RAYON = 15.9155; // circonférence = 100, donc les pourcentages se lisent directement

let PRESETS = [];
let enEdition = null;
let iconeChoisie = null;

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

function couleurDepuisNom(nom) {
  let teinte = 0;
  for (const c of nom) teinte = (teinte * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${teinte} 62% 46%)`;
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

/* ---------- Services prédéfinis ---------- */
function rendrePresets() {
  const zone = $("presets");
  zone.replaceChildren();
  for (const p of PRESETS) {
    const chip = h("button", "chip");
    chip.type = "button";
    chip.dataset.slug = p.slug;
    chip.append(creerLogo(p.nom, p.slug, 26), document.createTextNode(p.nom));
    chip.onclick = () => {
      if (iconeChoisie === p.slug) {
        iconeChoisie = null;
      } else {
        iconeChoisie = p.slug;
        $("nom").value = p.nom;
        $("categorie").value = p.categorie;
        $("prix").focus();
      }
      marquerActif();
    };
    zone.append(chip);
  }
}

function marquerActif() {
  for (const chip of document.querySelectorAll(".chip")) {
    chip.classList.toggle("actif", chip.dataset.slug === iconeChoisie);
  }
}

/* ---------- Graphiques ---------- */
function rendreDonut(parCategorie, mensuel) {
  const svg = $("donut");
  const legende = $("legende");
  svg.replaceChildren();
  legende.replaceChildren();

  const entrees = Object.entries(parCategorie).map(([nom, v]) => [nom, Number(v)]);
  const somme = entrees.reduce((s, [, v]) => s + v, 0);

  const groupe = el("g", { transform: "rotate(-90 21 21)" });
  groupe.append(el("circle", { cx: 21, cy: 21, r: RAYON, class: "anneau-fond" }));

  let cumul = 0;
  entrees.forEach(([nom, valeur], i) => {
    const pct = (valeur / somme) * 100;
    const couleur = PALETTE[i % PALETTE.length];
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
    point.style.background = couleur;
    li.append(point, h("span", "", nom), h("span", "montant", `${euro(valeur)} · ${pct.toFixed(0)} %`));
    legende.append(li);
  });

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
    piste.append(rempli);
    ligne.append(nom, piste, h("span", "barre-valeur", euro(a.cout_mensuel)));
    zone.append(ligne);

    void rempli.offsetWidth; // force le calcul pour déclencher l'animation
    rempli.style.width = (Number(a.cout_mensuel) / max) * 100 + "%";
  }
}

/* ---------- Liste ---------- */
function creerLigne(a) {
  const li = h("li", "ligne");

  const infos = h("div", "ligne-infos");
  infos.append(h("strong", "", a.nom));
  const meta = h("div", "meta");
  if (a.categorie) meta.append(h("span", "pill", a.categorie));
  meta.append(h("span", "pill pill-freq", a.frequence));
  infos.append(meta);

  const prix = h("div", "ligne-prix");
  prix.append(
    h("strong", "", euro(a.cout_mensuel) + " / mois"),
    h("span", "discret", euro(a.prix) + " / " + UNITE[a.frequence])
  );

  const actions = h("div", "ligne-actions");
  const modifier = h("button", "icone-btn", "✎");
  modifier.title = "Modifier";
  modifier.onclick = () => editer(a);
  const supprimerBtn = h("button", "icone-btn danger", "✕");
  supprimerBtn.title = "Supprimer";
  supprimerBtn.onclick = () => supprimer(a);
  actions.append(modifier, supprimerBtn);

  li.append(creerLogo(a.nom, a.icone, 44), infos, prix, actions);
  return li;
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
  $("plus-cher-nom").textContent = plusCher ? plusCher.nom + " / mois" : "";

  rendreDonut(total.par_categorie, total.mensuel);
  rendreBarres(abos);

  const liste = $("lignes");
  liste.replaceChildren();
  if (abos.length === 0) {
    liste.append(h("li", "vide", "Aucun abonnement pour l'instant : choisis un service ci-dessus pour commencer."));
  }
  for (const a of abos) liste.append(creerLigne(a));
}

/* ---------- Actions ---------- */
function editer(a) {
  enEdition = a.id;
  iconeChoisie = a.icone ?? null;
  $("nom").value = a.nom;
  $("prix").value = a.prix;
  $("frequence").value = a.frequence;
  $("categorie").value = a.categorie ?? "";
  $("valider").textContent = "Enregistrer";
  $("annuler").hidden = false;
  marquerActif();
  $("formulaire").scrollIntoView({ behavior: "smooth", block: "center" });
  $("nom").focus();
}

function reinitialiser() {
  enEdition = null;
  iconeChoisie = null;
  $("formulaire").reset();
  $("valider").textContent = "Ajouter";
  $("annuler").hidden = true;
  marquerActif();
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

async function init() {
  $("mois").textContent = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  PRESETS = await fetch("presets.json").then((r) => r.json()).catch(() => []);
  rendrePresets();
  await charger();
}
init();