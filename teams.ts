export type ClubLevel = 1 | 2 | 3 | 4;
export type PlayerStatus = 'star'|'starter'|'rotation'|'reserve'|'prospect';
export type PlayerPersonality = 'leader'|'professional'|'temperamental'|'quiet'|'ambitious';

export interface Player {
  id:number; name:string; position:string; age:number;
  overall:number; potential:number; height:number;
  pace:number; shooting:number; passing:number;
  dribbling:number; defense:number; physical:number;
  fatigue:number; morale:number; happiness:number;
  status:PlayerStatus; salary:number; contractYears:number;
  injuryWeeks:number; personality:PlayerPersonality;
}
export interface Team {
  id:number; name:string; abbreviation:string; city:string;
  clubLevel:ClubLevel; balance:number; monthlyIncome:number;
  objective:string; players:Player[];
}

// ─── RNG com semente ──────────────────────────────────────────────────────────
function createRNG(seed:number){
  let s=seed>>>0;
  return()=>{
    s+=0x6D2B79F5;
    let t=Math.imul(s^(s>>>15),1|s);
    t^=t+Math.imul(t^(t>>>7),61|t);
    return((t^(t>>>14))>>>0)/4294967296;
  };
}
const personalities:PlayerPersonality[]=['leader','professional','temperamental','quiet','ambitious'];

// ─── Builder de elenco real ───────────────────────────────────────────────────
// [nome, pos, idade, altura_cm, ovr]
type RP=[string,string,number,number,number];

function attrsByPos(pos: string, ovr: number, rng: ()=>number): {pace:number;shooting:number;passing:number;dribbling:number;defense:number;physical:number} {
  const ri = (a:number,b:number) => Math.floor(rng()*(b-a+1))+a;
  const sc = (base:number, bonus:number) => Math.min(99, Math.round(base * (ovr/75) + ri(-3,3) + bonus));

  switch(pos) {
    case 'GK':  return {pace:ri(40,60),  shooting:ri(20,40),  passing:ri(40,65),  dribbling:ri(30,55),  defense:sc(75,10),  physical:sc(70,5)};
    case 'CB':  return {pace:ri(50,70),  shooting:ri(25,50),  passing:ri(50,68),  dribbling:ri(35,58),  defense:sc(78,12),  physical:sc(72,8)};
    case 'LB':
    case 'RB':  return {pace:sc(70,8),   shooting:ri(40,62),  passing:sc(65,5),   dribbling:ri(50,70),  defense:sc(70,8),   physical:sc(68,5)};
    case 'CDM': return {pace:ri(55,72),  shooting:ri(40,62),  passing:sc(68,8),   dribbling:ri(50,70),  defense:sc(72,10),  physical:sc(72,8)};
    case 'CM':  return {pace:ri(58,75),  shooting:ri(50,70),  passing:sc(72,10),  dribbling:sc(65,5),   defense:ri(45,68),  physical:sc(65,3)};
    case 'CAM': return {pace:ri(62,80),  shooting:sc(68,8),   passing:sc(74,10),  dribbling:sc(74,12),  defense:ri(30,55),  physical:ri(50,68)};
    case 'LM':
    case 'RM':  return {pace:sc(74,10),  shooting:sc(65,5),   passing:sc(68,8),   dribbling:sc(72,10),  defense:ri(40,62),  physical:sc(65,5)};
    case 'LW':
    case 'RW':  return {pace:sc(78,12),  shooting:sc(70,8),   passing:sc(66,5),   dribbling:sc(78,15),  defense:ri(28,50),  physical:ri(55,72)};
    case 'ST':  return {pace:sc(72,8),   shooting:sc(82,15),  passing:ri(45,68),  dribbling:sc(68,8),   defense:ri(22,45),  physical:sc(70,8)};
    default:    return {pace:sc(65,0),   shooting:sc(65,0),   passing:sc(65,0),   dribbling:sc(65,0),   defense:sc(65,0),   physical:sc(65,0)};
  }
}
  const rng=createRNG(teamId*777777+54321);
  const ri=(a:number,b:number)=>Math.floor(rng()*(b-a+1))+a;
  const pick=<T>(arr:T[])=>arr[Math.floor(rng()*arr.length)];
  const st:PlayerStatus[]=['star','starter','starter','starter','starter','rotation','rotation','rotation','rotation','rotation','rotation','rotation','rotation','rotation','reserve','reserve','reserve','reserve','reserve','reserve','reserve','reserve','reserve','reserve','reserve'];
  return data.slice(0,25).map(([name,pos,age,height,ovr],i)=>{
    const pot=Math.min(99,ovr+(age<=19?ri(12,22):age<=22?ri(6,16):age<=25?ri(0,8):0));
    const attrs=attrsByPos(pos,ovr,rng);
    return{
      id:teamId*1000+i,name,position:pos,age,overall:ovr,potential:pot,height,
      ...attrs,
      fatigue:100,morale:ri(68,88),happiness:ri(68,88),
      status:st[i]??'reserve',salary:Math.max(5,Math.round((ovr-55)*clubLevel*1.8)),
      contractYears:ri(1,4),injuryWeeks:0,personality:pick(personalities),
    };
  });
}

// ─── ELENCOS ──────────────────────────────────────────────────────────────────

const PAL:RP[]=[
  ["Carlos Miguel","GK",27,196,83],["Marcelo Lomba","GK",39,189,68],["Aranha","GK",21,190,64],
  ["Murilo","CB",29,188,82],["Bruno Fuchs","CB",27,190,79],["Gustavo Gómez","CB",33,185,80],["Luis Benedetti","CB",19,187,63],
  ["Piquerez","LB",27,184,82],["Jefté","LB",22,178,73],["Arthur Gabriel","LB",20,180,63],
  ["Agustín Giay","RB",22,180,74],
  ["Andreas Pereira","CM",30,178,83],["Maurício","CM",24,174,79],["Marlon Freitas","CDM",30,185,80],
  ["Felipe Anderson","CAM",33,175,77],["Allan","CM",22,174,68],["Figueiredo","CM",20,176,64],["Erick Belé","CAM",19,178,62],
  ["Jhon Arias","RW",28,168,82],["Paulinho","ST",25,177,83],["Ramón Sosa","LW",26,179,80],
  ["Vitor Roque","ST",21,174,79],["Flaco López","ST",25,190,81],["Luighi","ST",20,182,67],["Riquelme Fillipi","LW",19,178,63],
];

const FLA:RP[]=[
  ["Agustín Rossi","GK",30,195,83],["Andrew","GK",24,190,70],["Dyogo Alves","GK",22,188,63],
  ["Léo Ortiz","CB",30,185,82],["Léo Pereira","CB",30,189,83],["Vitão","CB",26,184,79],["Danilo","CB",34,184,74],["João Souza","CB",19,187,62],
  ["Ayrton Lucas","LB",28,180,82],["Alex Sandro","LB",35,180,71],["Emerson Royal","RB",27,181,80],["Guillermo Varela","RB",33,173,72],
  ["Gerson","CM",29,184,84],["Arrascaeta","CAM",32,174,85],["Lucas Paquetá","CAM",28,180,86],["Nicolás De La Cruz","CAM",28,167,82],
  ["Erick Pulgar","CDM",32,187,76],["Jorginho","CDM",34,180,76],["Evertton Araújo","CDM",23,173,70],["Lorran","CAM",19,180,68],
  ["Pedro","ST",28,185,87],["Samuel Lino","LW",26,178,80],["Everton","LW",29,174,78],["Gonzalo Plata","RW",25,178,79],["Bruno Henrique","ST",35,184,72],
];

const COR:RP[]=[
  ["Hugo Souza","GK",27,199,80],["Matheus Donelli","GK",24,189,74],["Felipe Longo","GK",20,194,60],["Kauê","GK",21,197,61],
  ["Cacá","CB",26,187,81],["Félix Torres","CB",29,187,80],["André Ramalho","CB",33,182,76],["Gustavo Henrique","CB",33,196,73],["João Pedro Tchoca","CB",22,188,67],
  ["Matheuzinho","RB",25,171,78],["Matheus Bidu","LB",26,172,77],["Hugo","LB",28,179,72],["Fabrizio Angileri","LB",32,185,70],["Pedro Milans","RB",23,173,71],
  ["Raniele","CDM",29,183,78],["Charles","CDM",29,188,79],["Rodrigo Garro","CAM",28,174,82],["Breno Bidon","CM",20,178,76],
  ["José Martínez","CDM",31,179,78],["Ryan","CDM",22,177,70],["André Carrillo","CM",34,180,73],
  ["Memphis Depay","ST",32,178,81],["Yuri Alberto","ST",25,182,83],["Pedro Raul","ST",29,193,77],["Vitinho","RW",32,180,72],
];

const CAM:RP[]=[
  ["Everson","GK",36,192,78],["Matheus Mendes","GK",27,187,71],["Robert","GK",21,189,63],
  ["Lyanco","CB",29,187,79],["Junior Alonso","CB",33,184,78],["Mauricio Lemos","CB",30,186,79],["Igor Rabello","CB",30,190,78],["Rômulo","CB",21,182,65],
  ["Guilherme Arana","LB",29,176,82],["Rubens","LB",25,179,78],["Saravia","RB",33,179,72],["Mariano","RB",39,177,63],
  ["Alan Franco","CDM",29,172,78],["Fausto Vera","CDM",26,181,79],["Battaglia","CDM",34,187,72],
  ["Igor Gomes","CM",27,181,79],["Gustavo Scarpa","CAM",32,176,80],["Bernard","CAM",33,164,75],["Pedrinho","CAM",28,172,77],["Patrick","CDM",21,180,67],
  ["Hulk","ST",39,180,74],["Paulinho","ST",26,177,82],["Cristian Pavón","RW",30,174,78],["Palacios","LW",24,181,77],["Deyverson","ST",35,187,71],
];

const GRE:RP[]=[
  ["Weverton","GK",38,188,78],["Gabriel Grando","GK",26,180,71],["Thiago Stallbaum","GK",22,190,63],["Gabriel Menegon","GK",17,189,57],
  ["Kannemann","CB",35,185,76],["Balbuena","CB",34,188,77],["Rodrigo Ely","CB",32,188,76],["Wagner Leonardo","CB",26,187,76],["Gustavo Martins","CB",22,186,70],
  ["Marlon","LB",28,178,77],["Caio Paulista","LB",28,184,76],["João Pedro","RB",29,180,77],["João Lucas","RB",27,179,74],["Marcos Rocha","RB",37,176,67],
  ["Villasanti","CDM",29,178,80],["Cuéllar","CDM",33,178,75],["Juan Nardoni","CDM",24,179,77],["Arthur","CM",29,172,80],["Cristaldo","CAM",29,175,81],
  ["Monsalve","CAM",21,178,75],["Dodi","CDM",30,180,74],["Edenilson","CM",36,175,66],
  ["Carlos Vinícius","ST",31,190,79],["Tetê","RW",26,175,78],["Aravena","LW",23,172,74],
];

const INT:RP[]=[
  ["Sergio Rochet","GK",33,189,80],["Anthoni","GK",23,190,70],["Diego Esser","GK",20,189,60],["Kauan Jesus","GK",21,192,61],
  ["Juninho","CB",32,185,77],["Félix Torres","CB",28,187,79],["Clayton Sampaio","CB",25,187,76],["Victor Gabriel","CB",21,186,65],["Gabriel Mercado","CB",38,181,63],
  ["Bernabei","LB",24,169,78],["Matheus Bahia","LB",26,179,77],["Bruno Gomes","LB",24,174,72],["Braian Aguirre","RB",24,175,76],
  ["Alan Patrick","CAM",34,177,83],["Thiago Maia","CDM",28,179,80],["Richard","CDM",31,178,78],["Ronaldo","CDM",28,178,77],
  ["Bruno Tabata","CM",28,175,78],["Alan Rodríguez","CDM",25,185,76],["Villagra","CDM",24,178,73],["Paulinho","CM",21,173,69],
  ["Rafael Borré","ST",29,174,81],["Alerrandro","ST",25,180,78],["Johan Carbonero","LW",25,170,78],["Kayky","RW",22,175,73],
];

const SPA:RP[]=[
  ["Carlos Coronel","GK",29,192,80],["Rafael","GK",36,186,74],["Young","GK",24,197,66],["Felipe Preis","GK",20,190,60],
  ["Alan Franco","CB",29,183,78],["Matheus Dória","CB",31,188,77],["Sabino","CB",29,192,77],["Robert Arboleda","CB",34,192,73],["Rafael Tolói","CB",35,185,72],
  ["Enzo Díaz","LB",30,175,79],["Wendell","LB",32,176,74],["Nicolas","LB",19,178,63],["Maik","RB",21,179,64],["Cédric Soares","RB",34,172,71],
  ["Pablo Maia","CDM",24,178,80],["Marcos Antônio","CM",25,168,77],["Damián Bobadilla","CM",24,175,77],["Cauly","CAM",30,174,76],["Luan","CDM",26,181,73],
  ["Ferreirinha","LW",28,174,80],["Artur","RW",28,168,78],["Lucas Moura","RW",33,172,75],
  ["Jonathan Calleri","ST",32,181,79],["Luciano","ST",32,181,74],["André Silva","ST",28,185,75],
];

const CRU:RP[]=[
  ["Cássio","GK",38,196,76],["Matheus Cunha","GK",24,180,67],["Otávio Costa","GK",20,191,62],
  ["Fabrício Bruno","CB",30,191,80],["João Marcelo","CB",25,188,74],["Lucas Villalba","CB",31,178,72],["Jonathan Jesus","CB",21,185,64],["Bruno Alves","CB",20,185,63],
  ["Fagner","RB",36,168,67],["William","RB",31,175,70],["Kauã Moraes","RB",19,175,62],["Kaiki","LB",23,173,66],["Nicolas Pontes","LB",20,175,63],
  ["Walace","CDM",31,188,76],["Lucas Silva","CDM",33,180,72],["Matheus Henrique","CM",28,175,76],["Gerson","CM",28,183,73],["Matheus Pereira","CAM",30,175,78],
  ["Lucas Romero","CDM",23,188,67],["Christian","CM",25,175,70],
  ["Kaio Jorge","ST",24,175,76],["Luis Sinisterra","LW",26,173,78],["Bruno Rodrigues","ST",29,178,71],["Chico","ST",31,183,69],["Wanderson","RW",31,175,67],
];

const VAS:RP[]=[
  ["Léo Jardim","GK",31,188,77],["Daniel Fuzato","GK",28,191,73],["Pablo","GK",23,188,64],["Phillipe Gabriel","GK",20,196,61],
  ["Carlos Cuesta","CB",27,178,76],["Alan Saldivia","CB",24,180,71],["Robert","CB",22,185,64],["Lucas Freitas","CB",25,183,71],["Walace","CB",21,188,63],
  ["Lucas Piton","LB",25,175,73],["Cuiabano","LB",23,180,69],["José Luis Rodríguez","RB",29,183,72],["Paulo Henrique","RB",29,175,69],
  ["Thiago Mendes","CDM",34,175,71],["Hugo Moura","CDM",28,183,70],["Tchê Tchê","CM",33,175,69],["Matheus Carvalho","CM",24,175,70],
  ["Johan Rojas","CAM",23,175,72],["Jair","CM",31,178,67],["Cauan Barros","CDM",22,175,64],
  ["Brenner","ST",26,175,74],["Matheus França","ST",22,178,72],["Claudio Spinelli","ST",29,180,69],["David","LW",30,178,67],["Marino Hinestroza","LW",23,173,67],
];

const FLU:RP[]=[
  ["Fábio","GK",45,188,72],["Marcelo Pitaluga","GK",23,193,70],["Vitor Eudes","GK",27,193,67],
  ["Ignácio","CB",29,183,76],["Juan Freytes","CB",26,185,73],["Julian Millan","CB",28,185,72],["Igor Rabello","CB",31,191,75],["Jemmes","CB",26,182,68],
  ["Samuel Xavier","RB",35,168,69],["Guga","RB",27,173,71],["René","LB",33,175,70],["Guilherme Arana","LB",29,175,73],
  ["Martinelli","CM",24,178,73],["Otávio","CDM",32,175,71],["Nonato","CM",28,175,69],["Hércules","CM",25,178,70],
  ["Luciano Acosta","CAM",31,160,77],["Ganso","CAM",36,183,71],["Facundo Bernal","CDM",22,188,72],["David Terans","CAM",31,173,71],
  ["Germán Cano","ST",38,178,74],["John Kennedy","ST",23,173,73],["Yeferson Soteldo","LW",28,160,75],["Jefferson Savarino","RW",29,168,71],["Agustín Canobbio","RW",27,175,72],
];

const BAH:RP[]=[
  ["Marcos Felipe","GK",30,189,79],["Ronaldo","GK",29,190,71],["João Paulo","GK",30,186,69],["Léo Vieira","GK",35,190,62],
  ["Santiago Ramos Mingo","CB",24,186,78],["Gabriel Xavier","CB",25,190,79],["Kanu","CB",29,186,78],["David Duarte","CB",31,192,74],["Marcos Victor","CB",24,188,70],
  ["Gilberto","RB",33,181,71],["Román Gómez","RB",21,178,68],["Luciano Juba","LB",26,176,77],["Iago Borduchi","LB",29,182,75],["Zé Guilherme","LB",21,179,64],
  ["Jean Lucas","CM",27,181,79],["Rodrigo Nestor","CM",25,175,77],["Caio Alexandre","CDM",27,174,77],["Nicolás Acevedo","CDM",27,173,75],
  ["Everton Ribeiro","CAM",37,170,75],["Erick","CDM",28,176,73],
  ["Erick Pulga","LW",25,169,80],["Kike Olivera","RW",24,171,75],["Willian José","ST",34,189,72],["Everaldo","ST",34,181,69],["Mateo Sanabria","LW",22,172,69],
];

const APA:RP[]=[
  ["Santos","GK",36,188,74],["Mycael","GK",22,188,71],["Matheus Soares","GK",21,193,62],
  ["Carlos Terán","CB",25,188,79],["Habraão","CB",24,184,76],["Tobias Figueiredo","CB",31,188,77],["Léo","CB",30,183,76],["Aguirre","CB",29,188,75],["Lucas Belezi","CB",22,195,66],
  ["Lucas Esquivel","LB",24,184,77],["Fernando","LB",26,176,74],["Gastón Benavídez","RB",30,175,75],["Madson","RB",34,183,68],
  ["Patrick","CDM",33,179,78],["Raul","CDM",29,178,77],["Giuliano","CAM",35,174,72],["Bruno Zapelli","CAM",23,174,76],["Felipinho","CDM",24,176,73],
  ["João Cruz","CM",19,172,64],["Élan Ricardo","CDM",21,183,66],
  ["Kevin Viveros","ST",25,182,77],["Luiz Fernando","ST",29,181,78],["Kevin Velasco","RW",28,172,76],["Steven Mendoza","LW",33,171,71],["Julimar","LW",24,184,73],
];

const BOT:RP[]=[
  ["Leo Linck","GK",25,196,80],["Raul","GK",28,188,75],["Neto","GK",36,191,67],["Cristian Loor","GK",20,188,61],
  ["Alexander Barboza","CB",31,193,80],["Nahuel Ferraresi","CB",27,191,79],["Bastos","CB",35,183,71],["Ythallo","CB",21,193,66],["Anthony","CB",20,193,64],
  ["Alex Telles","LB",33,180,77],["Lucas Villalba","LB",31,178,73],["Vitinho","RB",26,175,74],["Mateo Ponte","RB",22,178,74],
  ["Santiago Rodríguez","CAM",26,173,82],["Cristian Medina","CM",23,178,80],["Danilo","CDM",25,175,79],["Allan","CDM",35,175,70],["Edenilson","CM",36,175,66],
  ["Álvaro Montoro","CAM",19,170,65],["Jordan Barrera","CAM",20,180,65],
  ["Arthur Cabral","ST",28,185,82],["Júnior Santos","RW",31,188,79],["Matheus Martins","LW",22,178,78],["Joaquín Correa","ST",31,188,74],["Nathan Fernandes","LW",21,193,68],
];

const CHA:RP[]=[
  ["Rafael Santos","GK",37,191,66],["Léo","GK",35,193,64],["Gabriel Werner","GK",22,185,61],["Devity Cherutti","GK",35,191,63],
  ["Eduardo Doma","CB",27,185,67],["João Paulo","CB",28,188,67],["Bressan","CB",33,185,65],["Victor Caetano","CB",28,183,63],["Bruno Leonardo","CB",29,188,64],
  ["Mancha","LB",25,175,62],["Everton","LB",31,176,62],["Felipe Vieira","LB",27,178,63],["Walter Clar","LB",31,178,63],["Gabriel Inocêncio","RB",31,177,64],
  ["Jorge Roa","CDM",33,180,66],["Marlon","CDM",28,178,64],["Vinicius","CM",26,178,64],["Eduardo Person","CM",29,177,63],
  ["Giovanni Augusto","CAM",36,175,65],["Rafael Carvalheira","CAM",26,175,62],["Bruno Matias","CDM",27,177,63],
  ["Pedro Perotti","ST",28,185,65],["Getúlio","ST",28,185,65],["Kaíque Maciel","LW",25,183,63],["Rômulo","ST",31,175,63],
];

const COR_ITB:RP[]=[  // Coritiba
  ["Pedro Luccas","GK",22,191,69],["Gabriel Leite","GK",38,188,64],["Benassi","GK",22,185,61],
  ["Matías Fracchia","CB",30,188,70],["Bruno Melo","CB",33,183,66],["Jacy Maranhão","CB",28,193,67],["Tiago","CB",22,191,62],["Rodrigo Moledo","CB",38,188,63],
  ["Zeca","RB",31,170,63],["Alex","LB",32,180,67],["Geovane","RB",37,178,62],
  ["Machado","CDM",30,175,67],["Sebastián Gómez","CM",29,173,70],["Clayson","CAM",31,170,67],["Carlos De Peña","CAM",34,178,67],["Wallison Luiz","CM",28,183,65],
  ["Josué Pesqueira","CAM",35,175,64],["Jean Gabriel","CM",23,177,62],
  ["Nicolas Careca","ST",28,188,69],["Vini Paulista","RW",25,180,67],["Everaldo","LW",31,185,67],["Dellatorre","ST",34,183,66],["Iury","ST",30,185,67],
  ["Lucas Ronier","RW",21,163,62],["Brandão","ST",21,191,63],
];

const SNT:RP[]=[  // Santos
  ["Gabriel Brazão","GK",25,193,74],["Diógenes","GK",25,185,69],["Rodrigo Falcão","GK",21,191,63],
  ["Zé Ivaldo","CB",29,185,74],["Lucas Veríssimo","CB",30,188,74],["Luan Peres","CB",31,191,71],["Adonis Frias","CB",28,188,70],
  ["Mayke","RB",33,178,69],["Igor","RB",29,175,69],["Gonzalo Escobar","LB",29,170,69],
  ["Willian Arão","CDM",34,183,72],["João Schmidt","CDM",32,183,73],["Zé Rafael","CM",32,175,70],["Gabriel Menino","CM",25,178,74],
  ["Thaciano","CM",31,183,70],["Christian Oliva","CM",29,178,71],["Álvaro Barreal","CAM",25,173,71],["Miguel Terceros","CAM",22,178,67],
  ["Neymar","LW",34,175,83],["Gabriel Barbosa","ST",29,178,80],["Rony","RW",31,168,73],
  ["Moisés","LW",29,178,71],["Benjamín Rollheiser","RW",26,173,70],["Lautaro Díaz","ST",27,180,71],["Marcelo Tórrez","CB",19,188,61],
];

const VIT:RP[]=[  // Vitória
  ["Lucas Arcanjo","GK",27,188,73],["Yuri Sena","GK",25,191,65],["Gabriel","GK",33,193,67],["Fintelman","GK",24,196,64],
  ["Cacá","CB",27,188,71],["Camutanga","CB",32,188,67],["Riccieli","CB",27,183,67],["Neris","CB",33,191,65],["Edu","CB",25,185,66],
  ["Nathan","RB",23,180,65],["Ramon","RB",25,173,64],["Luan Cândido","LB",25,188,68],["Jamerson","LB",27,180,64],
  ["Gabriel Baralhas","CDM",27,178,69],["Ronald","CM",28,170,67],["Rúben Ismael","CM",27,183,67],["Matheusinho","CAM",27,175,68],
  ["Emmanuel Martínez","CM",31,170,67],["Zé Vitor","CDM",26,193,65],["Caique","CDM",30,178,65],
  ["Renato Kayzer","ST",30,178,70],["Renzo López","ST",32,193,68],["Marinho","RW",35,168,66],["Erick","RW",28,173,66],["Aitor Cantalapiedra","RW",30,178,65],
];

const MIR:RP[]=[  // Mirassol
  ["Georgemy","GK",30,196,71],["Alex Muralha","GK",36,188,67],["Walter","GK",38,188,64],
  ["Lucas Oliveira","CB",30,188,69],["Willian Machado","CB",29,183,68],["João Victor Carroll","CB",28,188,68],["Rodrigues","CB",28,188,68],["Igor Marques","RB",27,178,67],
  ["Reinaldo","LB",36,178,64],["Victor Luis","LB",32,180,66],["Daniel Borges","RB",33,175,66],
  ["Neto Moura","CM",29,175,71],["Yuri","CDM",32,173,67],["Shaylon","CAM",29,180,70],["José Aldo","CAM",27,175,68],
  ["Gabriel","CDM",32,185,67],["Lucas Mugni","CAM",34,180,67],["Chico","CM",34,175,66],
  ["Tiquinho Soares","ST",35,188,70],["Nathan Fogaça","ST",26,178,70],["Alesson","RW",27,173,67],
  ["Everton","LW",29,178,67],["Antonio Galeano","RW",26,170,66],["André Luis","ST",32,183,66],["Edson Carioca","LW",28,178,66],
];

const REM:RP[]=[  // Remo
  ["Marcelo Rangel","GK",37,185,67],["Ygor Vinhas","GK",32,193,65],["Leo Lang","GK",27,168,63],
  ["Klaus","CB",32,188,66],["Reynaldo","CB",29,185,65],["Luan Martins","CB",26,188,65],["Cristian Tassano","CB",29,185,64],["Rafael Castro","CB",30,188,64],
  ["Pedro","RB",32,183,63],["Savio","RB",30,175,62],["Alan Rodríguez","LB",25,173,64],["Jorge","LB",30,183,62],
  ["Victor Cantillo","CDM",32,180,67],["Pedro Castro","CM",33,180,65],["Giovanni Pavani","CM",29,178,64],
  ["Nathan","CAM",30,180,64],["Régis","CAM",33,170,63],["Dodô","CAM",31,178,64],["Yago","CM",24,175,62],
  ["Madison","CDM",27,173,63],
  ["Pedro Rocha","ST",31,180,65],["Jaderson","RW",25,170,64],["Marrony","LW",27,180,64],["Diego Hernández","RW",25,175,63],["João Pedro","ST",29,185,64],
];

const RBB:RP[]=[  // Red Bull Bragantino
  ["Cleiton","GK",28,191,78],["Tiago Volpi","GK",35,191,69],["Fernando Costa","GK",22,191,66],["Fabrício","GK",25,191,66],
  ["Guzmán Rodríguez","CB",26,183,71],["Eduardo Santos","CB",28,196,69],["Alix Vinicius","CB",26,196,69],["Pedro Henrique","CB",30,188,71],["Gustavo Marques","CB",24,188,68],
  ["Juninho Capixaba","LB",28,175,70],["Vanderlan","LB",23,183,68],["Agustín Sant'Anna","RB",28,175,70],["José Hurtado","RB",24,178,68],
  ["Fabinho","CDM",24,178,71],["Gabriel","CDM",33,170,67],["Matheus Fernandes","CM",27,183,70],["Ramires","CM",25,175,68],
  ["Ignacio Sosa","CM",22,175,68],["Lucas Barbosa","CAM",25,193,68],["Gustavinho","CAM",22,175,67],
  ["Eduardo Sasha","ST",34,175,67],["Isidro Pitta","ST",26,183,70],["Fernando","ST",27,175,68],["José Herrera","RW",23,173,65],["Henry Mosquera","LW",24,173,67],
];

// ─── CONFIGURAÇÃO DOS CLUBES ──────────────────────────────────────────────────

interface Club{id:number;name:string;abbreviation:string;city:string;clubLevel:ClubLevel;balance:number;monthlyIncome:number;objective:string;real:RP[];}

const clubs:Club[]=[
  {id:1, name:"Botafogo",             abbreviation:"BOT",city:"Rio de Janeiro",   clubLevel:3,balance:14000,monthlyIncome:850, objective:"Classificar para a Copa",    real:BOT},
  {id:2, name:"Palmeiras",            abbreviation:"PAL",city:"São Paulo",         clubLevel:4,balance:25000,monthlyIncome:1800,objective:"Lutar pelo título",           real:PAL},
  {id:3, name:"Flamengo",             abbreviation:"FLA",city:"Rio de Janeiro",   clubLevel:4,balance:28000,monthlyIncome:1950,objective:"Lutar pelo título",           real:FLA},
  {id:4, name:"Grêmio",              abbreviation:"GRE",city:"Porto Alegre",      clubLevel:3,balance:13000,monthlyIncome:800, objective:"Classificar para a Copa",    real:GRE},
  {id:5, name:"Corinthians",          abbreviation:"COR",city:"São Paulo",         clubLevel:4,balance:22000,monthlyIncome:1600,objective:"Lutar pelo título",           real:COR},
  {id:6, name:"Coritiba",             abbreviation:"CTB",city:"Curitiba",          clubLevel:2,balance:7000, monthlyIncome:450, objective:"Terminar no meio da tabela", real:COR_ITB},
  {id:7, name:"Internacional",        abbreviation:"INT",city:"Porto Alegre",      clubLevel:3,balance:13500,monthlyIncome:810, objective:"Classificar para a Copa",    real:INT},
  {id:8, name:"São Paulo",            abbreviation:"SPA",city:"São Paulo",         clubLevel:3,balance:15000,monthlyIncome:900, objective:"Classificar para a Copa",    real:SPA},
  {id:9, name:"Cruzeiro",             abbreviation:"CRU",city:"Belo Horizonte",    clubLevel:3,balance:12000,monthlyIncome:780, objective:"Terminar no top 8",          real:CRU},
  {id:10,name:"Atlético Mineiro",     abbreviation:"CAM",city:"Belo Horizonte",    clubLevel:4,balance:24000,monthlyIncome:1700,objective:"Lutar pelo título",           real:CAM},
  {id:11,name:"Vasco da Gama",        abbreviation:"VAS",city:"Rio de Janeiro",   clubLevel:3,balance:11500,monthlyIncome:750, objective:"Terminar no top 8",          real:VAS},
  {id:12,name:"Fluminense",           abbreviation:"FLU",city:"Rio de Janeiro",   clubLevel:3,balance:12500,monthlyIncome:790, objective:"Classificar para a Copa",    real:FLU},
  {id:13,name:"Bahia",                abbreviation:"BAH",city:"Salvador",          clubLevel:2,balance:8000, monthlyIncome:530, objective:"Terminar no meio da tabela", real:BAH},
  {id:14,name:"Santos",               abbreviation:"SAN",city:"Santos",            clubLevel:3,balance:10000,monthlyIncome:680, objective:"Terminar no top 8",          real:SNT},
  {id:15,name:"Red Bull Bragantino",  abbreviation:"RBB",city:"Bragança Paulista", clubLevel:2,balance:9000, monthlyIncome:580, objective:"Terminar no top 10",         real:RBB},
  {id:16,name:"Vitória",              abbreviation:"VIT",city:"Salvador",          clubLevel:2,balance:6500, monthlyIncome:420, objective:"Terminar no meio da tabela", real:VIT},
  {id:17,name:"Mirassol",             abbreviation:"MIR",city:"Mirassol",          clubLevel:2,balance:6000, monthlyIncome:380, objective:"Terminar no meio da tabela", real:MIR},
  {id:18,name:"Chapecoense",          abbreviation:"CHA",city:"Chapecó",           clubLevel:1,balance:3000, monthlyIncome:220, objective:"Evitar o rebaixamento",      real:CHA},
  {id:19,name:"Athletico Paranaense", abbreviation:"APA",city:"Curitiba",          clubLevel:3,balance:12000,monthlyIncome:760, objective:"Classificar para a Copa",    real:APA},
  {id:20,name:"Remo",                 abbreviation:"REM",city:"Belém",             clubLevel:1,balance:2800, monthlyIncome:190, objective:"Evitar o rebaixamento",      real:REM},
];

export const teams:Team[]=clubs.map(c=>({
  id:c.id,name:c.name,abbreviation:c.abbreviation,city:c.city,
  clubLevel:c.clubLevel,balance:c.balance,monthlyIncome:c.monthlyIncome,
  objective:c.objective,players:buildReal(c.id,c.clubLevel,c.real),
}));
