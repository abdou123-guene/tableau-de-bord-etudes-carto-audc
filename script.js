const fichierCSV = "tableau-de-bord-web.csv";

let donnees = [];

const corpsTableau = document.getElementById("corps-tableau");
const recherche = document.getElementById("recherche");
const filtreThematique = document.getElementById("filtre-thematique");
const filtreStatut = document.getElementById("filtre-statut");
const boutonReinitialiser = document.getElementById("reinitialiser");

function analyserCSV(texte) {
  const lignes = texte
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);

  if (lignes.length < 2) {
    return [];
  }

  const entetes = lignes[0]
    .split(";")
    .map(entete => entete.trim());

  return lignes.slice(1)
    .filter(ligne => ligne.trim() !== "")
    .map(ligne => {
      const valeurs = ligne
        .split(";")
        .map(valeur => valeur.trim());

      const element = {};

      entetes.forEach((entete, index) => {
        element[entete] = valeurs[index] || "";
      });

      return element;
    });
}

function echapperHTML(valeur) {
  return String(valeur ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normaliserTexte(valeur) {
  return String(valeur ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function classeStatut(statut) {
  const valeur = normaliserTexte(statut);

  if (valeur.includes("valide")) {
    return "statut-valide";
  }

  if (valeur.includes("publie")) {
    return "statut-publie";
  }

  if (valeur.includes("en cours")) {
    return "statut-en-cours";
  }

  if (
    valeur.includes("corriger") ||
    valeur.includes("correction")
  ) {
    return "statut-a-corriger";
  }

  return "statut-autre";
}

function afficherTableau(liste) {
  corpsTableau.innerHTML = "";

  if (liste.length === 0) {
    corpsTableau.innerHTML = `
      <tr>
        <td colspan="12">Aucun résultat trouvé.</td>
      </tr>
    `;
    return;
  }

  liste.forEach(element => {
    const ligne = document.createElement("tr");

    ligne.innerHTML = `
      <td>${echapperHTML(element.Thematique || element.Thématique)}</td>
      <td>${echapperHTML(element.Code)}</td>
      <td>${echapperHTML(element.Format)}</td>
      <td>${echapperHTML(element.Titre)}</td>
      <td>${echapperHTML(element.Responsable)}</td>
      <td>${echapperHTML(element.Emprise)}</td>
      <td>${echapperHTML(element.Source)}</td>
      <td>${echapperHTML(element.Annee || element.Année)}</td>
      <td>${echapperHTML(element.Priorite || element.Priorité)}</td>
      <td>
        <span class="statut ${classeStatut(element.Statut)}">
          ${echapperHTML(element.Statut)}
        </span>
      </td>
      <td>${echapperHTML(element.Publication_Lizmap)}</td>
      <td>${echapperHTML(element.Commentaires)}</td>
    `;

    corpsTableau.appendChild(ligne);
  });
}

function remplirListe(selecteur, valeurs) {
  const valeursUniques = [...new Set(
    valeurs
      .map(valeur => String(valeur ?? "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "fr"));

  valeursUniques.forEach(valeur => {
    const option = document.createElement("option");
    option.value = valeur;
    option.textContent = valeur;
    selecteur.appendChild(option);
  });
}

function mettreAJourIndicateurs(liste) {
  document.getElementById("total-projets").textContent =
    liste.length;

  document.getElementById("total-en-cours").textContent =
    liste.filter(element =>
      normaliserTexte(element.Statut).includes("en cours")
    ).length;

  document.getElementById("total-valides").textContent =
    liste.filter(element => {
      const statut = normaliserTexte(element.Statut);

      return statut.includes("valide") ||
             statut.includes("publie");
    }).length;

  document.getElementById("total-lizmap").textContent =
    liste.filter(element => {
      const lizmap = normaliserTexte(
        element.Publication_Lizmap
      );

      return lizmap === "oui";
    }).length;
}

function appliquerFiltres() {
  const texteRecherche = normaliserTexte(recherche.value);
  const thematiqueChoisie = filtreThematique.value;
  const statutChoisi = filtreStatut.value;

  const resultats = donnees.filter(element => {
    const thematique =
      element.Thematique || element.Thématique || "";

    const contenuRecherche = normaliserTexte(
      Object.values(element).join(" ")
    );

    const correspondRecherche =
      !texteRecherche ||
      contenuRecherche.includes(texteRecherche);

    const correspondThematique =
      !thematiqueChoisie ||
      thematique === thematiqueChoisie;

    const correspondStatut =
      !statutChoisi ||
      element.Statut === statutChoisi;

    return (
      correspondRecherche &&
      correspondThematique &&
      correspondStatut
    );
  });

  afficherTableau(resultats);
  mettreAJourIndicateurs(resultats);
}

async function chargerDonnees() {
  try {
    const reponse = await fetch(fichierCSV);

    if (!reponse.ok) {
      throw new Error(
        `Erreur de chargement : ${reponse.status}`
      );
    }

    const texte = await reponse.text();
    donnees = analyserCSV(texte);

    remplirListe(
      filtreThematique,
      donnees.map(element =>
        element.Thematique || element.Thématique
      )
    );

    remplirListe(
      filtreStatut,
      donnees.map(element => element.Statut)
    );

    afficherTableau(donnees);
    mettreAJourIndicateurs(donnees);
  } catch (erreur) {
    console.error(erreur);

    corpsTableau.innerHTML = `
      <tr>
        <td colspan="12">
          Impossible de charger le fichier CSV.
        </td>
      </tr>
    `;
  }
}

recherche.addEventListener("input", appliquerFiltres);
filtreThematique.addEventListener("change", appliquerFiltres);
filtreStatut.addEventListener("change", appliquerFiltres);

boutonReinitialiser.addEventListener("click", () => {
  recherche.value = "";
  filtreThematique.value = "";
  filtreStatut.value = "";

  afficherTableau(donnees);
  mettreAJourIndicateurs(donnees);
});

chargerDonnees();
