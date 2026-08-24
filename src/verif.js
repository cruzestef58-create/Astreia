const fs=require("fs"), path=require("path");
const ici=f=>path.join(__dirname,f);   // marche depuis n'importe quel dossier
const gen1=fs.readFileSync(ici("astreia.html"),"utf8");
let ok=true;
const chk=(c,m)=>{ if(!c){ ok=false; console.log("ECHEC :",m); } else console.log("  ok  :",m); };

// 1) syntaxe du script principal
const script=gen1.match(/<script>([\s\S]*)<\/script>/)[1];
fs.writeFileSync(ici("_app.js"),script);
try{ new Function(script); chk(true,"le script principal est syntaxiquement valide"); }
catch(e){ chk(false,"syntaxe : "+e.message); }

// 2) le JSON de campagne est lisible
const cj=gen1.match(/<script type="application\/json" id="campagne">([\s\S]*?)<\/script>/)[1];
let camp; try{ camp=JSON.parse(cj); chk(true,`campagne lisible : ${camp.maps.length} cartes, ${camp.codex.length} entrees de codex`); }
catch(e){ chk(false,"campagne illisible : "+e.message); }

// 3) le gabarit embarque
const lit=gen1.match(/const PAGE_TPL=("(?:[^"\\]|\\.)*");/)[1];
const TPL=JSON.parse(lit);
chk(TPL.startsWith("<!doctype html>"),"le gabarit est un document complet (doctype)");
chk(TPL.split("%%CAMPAIGN%%").length-1===1,"le gabarit contient exactement 1 marqueur CAMPAIGN");
chk(TPL.split("%%TPL%%").length-1===1,"le gabarit contient exactement 1 marqueur TPL");

// 4) republication : la page doit savoir se regenerer a l'identique
function construirePage(tpl,camp){
  const c=JSON.stringify(camp).replace(/</g,"\\u003c");
  const t=JSON.stringify(tpl).replace(/<\//g,"<\\/");
  return tpl.replace("%%CAMPAIGN%%",()=>c).replace("%%TPL%%",()=>t);
}
const camp2=JSON.parse(JSON.stringify(camp)); camp2.rev=1; camp2.updatedBy="Esteban";
const gen2=construirePage(TPL,camp2);
const TPL2=JSON.parse(gen2.match(/const PAGE_TPL=("(?:[^"\\]|\\.)*");/)[1]);
chk(TPL2===TPL,"le gabarit survit intact a une republication");
const gen3=construirePage(TPL2,camp2);
chk(gen2===gen3,"republication idempotente (gen2 === gen3)");
const camp2b=JSON.parse(gen2.match(/<script type="application\/json" id="campagne">([\s\S]*?)<\/script>/)[1]);
chk(camp2b.rev===1&&camp2b.updatedBy==="Esteban","la campagne republiee est bien relue");
chk(!gen2.slice(gen2.indexOf("const PAGE_TPL=")).slice(0,TPL.length).includes("</script>"),
    "aucun </script> non echappe dans le litteral du gabarit");
try{ new Function(gen2.match(/<script>([\s\S]*)<\/script>/)[1]); chk(true,"le script de la page republiee est valide"); }
catch(e){ chk(false,"syntaxe apres republication : "+e.message); }

console.log(ok?"\nTOUTES LES VERIFICATIONS PASSENT":"\nDES VERIFICATIONS ONT ECHOUE");
process.exit(ok?0:1);
