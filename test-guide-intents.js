
// harnais de test : on simule un navigateur minimal
global.window = {};
global.document = { readyState: 'complete', addEventListener: function(){}, body: {} };
global.fetch = function(){ return Promise.reject(new Error('pas de reseau en test')); };
global.sessionStorage = { getItem: function(){return null;}, setItem: function(){}, removeItem: function(){} };
global.localStorage = { getItem: function(){return null;}, setItem: function(){}, removeItem: function(){} };
require('./guide-intents.js');
var I = global.window.CCGuideIntents;

function ok(nom, cond) { console.log((cond ? '  OK        ' : '  ECHEC     ') + nom); return cond; }
var bons = 0, total = 0;

console.log('=== 1. RESOLUTION d une demande ecrite ===');
[['ou sont les pays', 'find_country'],
 ['Montre-moi où chercher les pays', 'find_country'],
 ['pays de départ', 'find_country'],
 ['comment publier un trajet', 'publish_trip'],
 ['je veux publier', 'publish_trip'],
 ['mon numéro de téléphone', 'set_phone'],
 ['trouver un voyageur', 'find_offer'],
 ['mon profil', 'my_profile']].forEach(function(c){
  total++;
  var r = I.resoudre(c[0]);
  if (ok('"' + c[0] + '" -> ' + c[1] + '  (obtenu: ' + r + ')', r === c[1])) bons++;
});

console.log('');
console.log('=== 2. WHITELIST : ce que l IA a le droit de demander ===');
[['find_country', true], ['publish_trip', true], ['set_phone', true],
 ['unknown_guide', false], ['delete_site', false], ['javascript:alert(1)', false],
 ['all_users', false], ['../etc/passwd', false]].forEach(function(c){
  total++;
  var r = I.estAutorise(c[0]);
  if (ok('autorise("' + c[0] + '") = ' + c[1] + '  (obtenu: ' + r + ')', r === c[1])) bons++;
});

console.log('');
console.log('=== 3. VALIDATION des reponses de l IA ===');
var cas = [
  [{type:'guide', intent:'find_country'}, true,  'guide + cible valide'],
  [{type:'guide', intent:'delete_site'}, false,  'guide + cible interdite'],
  [{type:'chat', message:'Bonjour !'}, true,     'chat normal'],
  [{type:'chat', message:''}, false,             'chat vide'],
  [{type:'guide_confirmation', intent:'find_country', message:'Je peux te montrer.'}, true, 'confirmation valide'],
  [{type:'exec', code:'alert(1)'}, false,        'type exec interdit'],
  [{type:'guide', intent:'javascript:fetch("x")'}, false, 'injection javascript'],
  [null, false,                                   'reponse nulle'],
  ['du texte brut', false,                        'reponse non-objet']
];
cas.forEach(function(c){
  total++;
  var v = I.valider(c[0]);
  var attendu = c[1];
  if (ok(c[2] + '  -> ' + (attendu ? 'accepte' : 'rejete') + '  (obtenu: ' + (v ? JSON.stringify(v).slice(0,50) : 'null') + ')', (!!v) === attendu)) bons++;
});

console.log('');
console.log('RESULTAT : ' + bons + ' / ' + total + ' tests passes');
process.exit(bons === total ? 0 : 1);
