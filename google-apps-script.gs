// ============================================================
//  OLDA — Google Apps Script  |  Enregistrement des commandes
//  À déployer comme Application Web (voir instructions bas de page)
// ============================================================

const SHEET_NAME = 'Commandes';
const TIMEZONE   = 'Europe/Paris';

// ─── Structure exacte du Google Sheet (A → Q) ───────────────
const HEADERS = [
  'N° COMMANDE',              // A  col  1
  'DATE',                     // B  col  2
  'NOM',                      // C  col  3
  'TÉLÉPHONE',                // D  col  4  → format texte (conserve le 0)
  'COLLECTION / RÉFÉRENCE',   // E  col  5  → combiné : "Homme — H-001"
  'TAILLE',                   // F  col  6
  'COULEUR',                  // G  col  7  → couleur du t-shirt
  'T-SHIRT',                  // H  col  8  → laissé vide (remplissage manuel / image)
  'LOGO AVANT',               // I  col  9
  'COULEUR LOGO AVANT',       // J  col 10
  'LOGO ARRIÈRE',             // K  col 11
  'COULEUR LOGO ARRIÈRE',     // L  col 12
  'PRIX T-SHIRT',             // M  col 13
  'PERSONNALISATION',         // N  col 14
  'TOTAL',                    // O  col 15
  'PAYÉ',                     // P  col 16
  'FICHE (Lien Drive / Image)'// Q  col 17  → laissé vide (ajout manuel)
];

// ─── Couleurs en-têtes ───────────────────────────────────────
const COLOR_HEADER_BG = '#1C1C2E';
const COLOR_HEADER_FG = '#FFFFFF';

// ─── Couleurs Statut paiement (colonne P) ────────────────────
const COLOR_PAYE_OUI   = '#C6EFCE';  // vert
const COLOR_PAYE_ACPTE = '#FFEB9C';  // jaune
const COLOR_PAYE_NON   = '#FFC7CE';  // rouge

// ─── Couleurs de ligne par collection ────────────────────────
const COLOR_COLLECTION = {
  'HOMME'      : '#DBEAFE',  // bleu clair
  'FEMME'      : '#FCE7F3',  // rose clair
  'ENFANT'     : '#D1FAE5',  // vert clair
  'ACCESSOIRE' : '#EDE9FE',  // violet clair
  'DEFAULT'    : '#F8F9FA'   // gris neutre
};

// ─────────────────────────────────────────────────────────────
//  POINT D'ENTRÉE  —  reçoit les commandes du formulaire
// ─────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : '';
    if (!raw) throw new Error('Corps de requête vide');

    var data  = JSON.parse(raw);
    var sheet = getOrCreateSheet_();

    // ── Colonne E : "Collection — Référence" combiné ──────────
    var collectionRef = [data.collection, data.reference]
      .filter(function(v) { return v && v.trim(); })
      .join(' — ');

    // ── Ligne calée exactement sur les colonnes A → Q ─────────
    var row = [
      data.commande         || '',  // A  N° COMMANDE
      data.date             || '',  // B  DATE
      data.nom              || '',  // C  NOM
      data.telephone        || '',  // D  TÉLÉPHONE
      collectionRef         || '',  // E  COLLECTION / RÉFÉRENCE
      data.taille           || '',  // F  TAILLE
      data.couleurTshirt    || '',  // G  COULEUR
      '',                           // H  T-SHIRT (remplissage manuel)
      data.logoAvant        || '',  // I  LOGO AVANT
      data.couleurLogoAvant || '',  // J  COULEUR LOGO AVANT
      data.logoArriere      || '',  // K  LOGO ARRIÈRE
      data.couleurLogoArriere|| '', // L  COULEUR LOGO ARRIÈRE
      data.prixTshirt       || '',  // M  PRIX T-SHIRT
      data.personnalisation || '',  // N  PERSONNALISATION
      data.total            || '',  // O  TOTAL
      data.paye             || '',  // P  PAYÉ
      ''                            // Q  FICHE (ajout manuel)
    ];

    sheet.appendRow(row);

    var lastRow = sheet.getLastRow();

    // Force la colonne TÉLÉPHONE (D = col 4) en texte → conserve le 0
    sheet.getRange(lastRow, 4).setNumberFormat('@');

    formatDataRow_(sheet, lastRow, data.paye, data.collection);

    return jsonResponse_({ status: 'ok', row: lastRow });

  } catch (err) {
    logError_(err);
    return jsonResponse_({ status: 'error', message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
//  GET  —  vérification que le script est en ligne
// ─────────────────────────────────────────────────────────────
function doGet() {
  return jsonResponse_({ status: 'ok', message: 'OLDA API opérationnelle' });
}

// ─────────────────────────────────────────────────────────────
//  FEUILLE  —  récupération + vérification des en-têtes
// ─────────────────────────────────────────────────────────────
function getOrCreateSheet_() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    setupHeaders_(sheet);
    return sheet;
  }

  // Vérifie si la ligne 1 correspond aux en-têtes attendus
  var current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var match   = HEADERS.every(function(h, i) { return h === current[i]; });
  if (!match) setupHeaders_(sheet);

  return sheet;
}

// ─────────────────────────────────────────────────────────────
//  EN-TÊTES  —  écriture + style + format colonne Téléphone
// ─────────────────────────────────────────────────────────────
function setupHeaders_(sheet) {
  var n = HEADERS.length;

  sheet.getRange(1, 1, 1, n).setValues([HEADERS]);

  var hRange = sheet.getRange(1, 1, 1, n);
  hRange.setBackground(COLOR_HEADER_BG);
  hRange.setFontColor(COLOR_HEADER_FG);
  hRange.setFontWeight('bold');
  hRange.setFontSize(11);
  hRange.setHorizontalAlignment('center');
  hRange.setVerticalAlignment('middle');
  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);

  // Colonne TÉLÉPHONE (D = col 4) → toujours en texte
  sheet.getRange(1, 4, sheet.getMaxRows(), 1).setNumberFormat('@');

  // Largeurs
  sheet.setColumnWidth(1,  165);  // A  N° COMMANDE
  sheet.setColumnWidth(2,  110);  // B  DATE
  sheet.setColumnWidth(3,  160);  // C  NOM
  sheet.setColumnWidth(4,  120);  // D  TÉLÉPHONE
  sheet.setColumnWidth(5,  180);  // E  COLLECTION / RÉFÉRENCE
  sheet.setColumnWidth(6,   80);  // F  TAILLE
  sheet.setColumnWidth(7,  130);  // G  COULEUR
  sheet.setColumnWidth(8,  120);  // H  T-SHIRT
  sheet.setColumnWidth(9,  130);  // I  LOGO AVANT
  sheet.setColumnWidth(10, 150);  // J  COULEUR LOGO AVANT
  sheet.setColumnWidth(11, 130);  // K  LOGO ARRIÈRE
  sheet.setColumnWidth(12, 150);  // L  COULEUR LOGO ARRIÈRE
  sheet.setColumnWidth(13, 120);  // M  PRIX T-SHIRT
  sheet.setColumnWidth(14, 145);  // N  PERSONNALISATION
  sheet.setColumnWidth(15, 100);  // O  TOTAL
  sheet.setColumnWidth(16, 100);  // P  PAYÉ
  sheet.setColumnWidth(17, 200);  // Q  FICHE
}

// ─────────────────────────────────────────────────────────────
//  MISE EN FORME  —  ligne de données
// ─────────────────────────────────────────────────────────────
function formatDataRow_(sheet, rowIndex, paye, collection) {
  var n        = HEADERS.length;
  var rowRange = sheet.getRange(rowIndex, 1, 1, n);

  // Couleur de ligne selon la collection
  var collKey = (collection || '').toUpperCase().trim();
  var bgColor = COLOR_COLLECTION[collKey] || COLOR_COLLECTION['DEFAULT'];
  rowRange.setBackground(bgColor);
  rowRange.setVerticalAlignment('middle');
  sheet.setRowHeight(rowIndex, 28);

  // Cellule PAYÉ (P = col 16)
  var payCell   = sheet.getRange(rowIndex, 16);
  var payeUpper = (paye || '').toUpperCase();
  if (payeUpper === 'OUI') {
    payCell.setBackground(COLOR_PAYE_OUI);
    payCell.setFontWeight('bold');
  } else if (payeUpper === 'ACOMPTE') {
    payCell.setBackground(COLOR_PAYE_ACPTE);
    payCell.setFontWeight('bold');
  } else {
    payCell.setBackground(COLOR_PAYE_NON);
    payCell.setFontWeight('bold');
  }
}

// ─────────────────────────────────────────────────────────────
//  RÉINITIALISER LES EN-TÊTES  —  à lancer UNE FOIS manuellement
//  si le sheet existant avait d'autres colonnes
// ─────────────────────────────────────────────────────────────
function reinitialiserEntetes() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Feuille "' + SHEET_NAME + '" introuvable.');
    return;
  }
  setupHeaders_(sheet);
  SpreadsheetApp.getUi().alert('En-têtes réinitialisées. Les données existantes restent intactes.');
}

// ─────────────────────────────────────────────────────────────
//  UTILITAIRES
// ─────────────────────────────────────────────────────────────
function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function logError_(err) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Erreurs');
  if (!sheet) sheet = ss.insertSheet('Erreurs');
  var ts = Utilities.formatDate(new Date(), TIMEZONE, 'dd/MM/yyyy HH:mm:ss');
  sheet.appendRow([ts, err.message, err.stack || '']);
}

// ─────────────────────────────────────────────────────────────
//  FONCTION DE TEST  —  à lancer manuellement depuis l'éditeur
// ─────────────────────────────────────────────────────────────
function testerAvecCommandeFactice() {
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        commande           : '2026-0217-Test',
        date               : '17/02/2026',
        nom                : 'Client Test',
        telephone          : '0612345678',
        collection         : 'Femme',
        reference          : 'F-002',
        taille             : 'M',
        couleurTshirt      : 'Rose',
        logoAvant          : 'OLDA-03',
        couleurLogoAvant   : 'Blanc',
        logoArriere        : '',
        couleurLogoArriere : '',
        prixTshirt         : '25',
        personnalisation   : '10',
        total              : '35 €',
        paye               : 'ACOMPTE',
        acompte            : '15'
      })
    }
  };

  var result = doPost(fakeEvent);
  Logger.log('Résultat : ' + result.getContent());
}

// ─────────────────────────────────────────────────────────────
//  INSTRUCTIONS DE DÉPLOIEMENT
// ─────────────────────────────────────────────────────────────
//
//  1. Google Sheet → Extensions → Apps Script
//  2. Supprimer le code existant, coller CE fichier
//  3. Sauvegarder (Ctrl+S)
//  4. Lancer "reinitialiserEntetes" (une seule fois)
//     → aligne les en-têtes sur vos colonnes A–Q actuelles
//  5. Lancer "testerAvecCommandeFactice"
//     → vérifier : ligne rose (Femme), 0612... intact, logos OK
//  6. Déployer → Nouveau déploiement
//       Type        : Application Web
//       Exécuter en : Moi
//       Accès       : Tout le monde
//  7. Copier l'URL → index.html const API = "..."
//
//  RÉSULTAT ATTENDU (colonnes A–Q) :
//  A: N° commande   B: Date      C: Nom       D: Téléphone (0 conservé)
//  E: Homme — H-001 F: Taille    G: Couleur   H: (vide — manuel)
//  I: Logo Avant    J: Coul.Logo K: Logo Arr. L: Coul.Logo
//  M: Prix          N: Perso     O: Total     P: Payé (coloré)
//  Q: Fiche (vide — à coller manuellement)
//
//  COULEURS DE LIGNE :
//  Homme → bleu  |  Femme → rose  |  Enfant → vert  |  Accessoire → violet
//
// ─────────────────────────────────────────────────────────────
