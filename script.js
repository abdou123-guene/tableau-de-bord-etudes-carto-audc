// Tableau de bord des études cartographiques - AUDC
const FICHIER_CSV = "tableau-de-bord-web.csv";

const corps = document.getElementById("corps-tableau");
const champRecherche = document.getElementById("recherche");
const selThematique = document.getElementById("filtre-thematique");
const selStatut = document.getElementById("filtre-statut");
const boutonReset = document.getElementById("reinitialiser");

let projets = [];

// Normalise un texte : minuscules, sans accents, sans espaces superflus
function norm(texte) {
  return (texte || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Échappe le HTML pour un affichage sûr
function echapper(texte) {
  return (texte || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Lecture d'un CSV avec séparateur ; et champs entre guillemets
function lireCSV(texte, sep = ";") {
  const lignes = [];
  let ligne = [], champ = "", entreGuillemets = false;
  texte = texte.replace(/^\uFEFF/, "");

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (entreGuillemets) {
      if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') { entreGuillemets = false; }
      else { champ += c; }
    } else if (c === '"') {
      entreGuillemets = true;
    } else if (c === sep) {
      ligne.push(champ); champ = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      ligne.push(champ); champ = "";
      if (ligne.some((v) => v.trim() !== "")) lignes.push(ligne);
      ligne = [];
    } else {
      champ += c;
    }
  }
  if (champ !== "" || ligne.length) {
    ligne.push(champ);
    if (ligne.some((v) => v.trim() !== "")) lignes.push(ligne);
  }
  return lignes;
}

// Transforme les lignes en objets, selon l'ordre des colonnes
function versObjets(lignes) {
  const entetes = lignes[0].map((e) => norm(e));
  const idx = (nom) => entetes.indexOf(nom);
  const get = (l, nom) => (l[idx(nom)] || "").trim();

  return lignes.slice(1).map((l) => ({
    thematique: get(l, "thematique"),
    code: get(l, "code"),
    format: get(l, "format"),
    titre: get(l, "titre"),
    responsable: get(l, "responsable"),
    emprise: get(l, "emprise"),
    source: get(l, "source"),
    annee: get(l, "annee"),
    priorite: get(l, "priorite"),
    statut: get(l, "statut"),
    lizmap: get(l, "publication_lizmap"),
    commentaires: get(l, "commentaires")
  }));
}

function remplirFiltres() {
  const remplir = (select, valeurs) => {
    [...new Set(valeurs.filter(Boolean))].forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      select.appendChild(o);
    });
  };
  remplir(selThematique, projets.map((p) => p.thematique));
  remplir(selStatut, projets.map((p) => p.statut));
}

function majIndicateurs(liste) {
  document.getElementById("total-projets").textContent = liste.length;
  document.getElementById("total-en-cours").textContent =
    liste.filter((p) => norm(p.statut) === "en cours").length;
  document.getElementById("total-valides").textContent =
    liste.filter((p) => norm(p.statut).startsWith("valide")).length;
  document.getElementById("total-lizmap").textContent =
    liste.filter((p) => norm(p.lizmap) === "oui").length;
}

function afficher() {
  const q = norm(champRecherche.value);
  const them = selThematique.value;
  const stat = selStatut.value;

  const liste = projets.filter((p) => {
    if (them && p.thematique !== them) return false;
    if (stat && p.statut !== stat) return false;
    if (q) {
      const texte = norm(Object.values(p).join(" "));
      if (!texte.includes(q)) return false;
    }
    return true;
  });

  majIndicateurs(liste);

  if (liste.length === 0) {
    corps.innerHTML = '<tr><td colspan="12">Aucun résultat.</td></tr>';
    return;
  }

  corps.innerHTML = liste.map((p) => `
    <tr>
      <td>${echapper(p.thematique)}</td>
      <td>${echapper(p.code)}</td>
      <td>${echapper(p.format)}</td>
      <td>${echapper(p.titre)}</td>
      <td>${echapper(p.responsable)}</td>
      <td>${echapper(p.emprise)}</td>
      <td>${echapper(p.source)}</td>
      <td>${echapper(p.annee)}</td>
      <td>${echapper(p.priorite)}</td>
      <td>${echapper(p.statut)}</td>
      <td>${echapper(p.lizmap)}</td>
      <td>${echapper(p.commentaires)}</td>
    </tr>`).join("");
}

async function charger() {
  try {
    const reponse = await fetch(FICHIER_CSV, { cache: "no-store" });
    if (!reponse.ok) throw new Error("HTTP " + reponse.status);
    const texte = await reponse.text();
    projets = versObjets(lireCSV(texte));
    remplirFiltres();
    afficher();
  } catch (erreur) {
    console.error("Erreur de chargement :", erreur);
    corps.innerHTML =
      '<tr><td colspan="12">Impossible de charger ' + FICHIER_CSV +
      ' (' + echapper(String(erreur.message || erreur)) + ').</td></tr>';
  }
}

champRecherche.addEventListener("input", afficher);
selThematique.addEventListener("change", afficher);
selStatut.addEventListener("change", afficher);
boutonReset.addEventListener("click", () => {
  champRecherche.value = "";
  selThematique.value = "";
  selStatut.value = "";
  afficher();
});

charger();
