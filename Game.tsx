import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useGame, TrainingFocus } from "@/contexts/GameContext";
import { teams as allTeams } from "@/lib/teams";
import { simulateMatch, defaultTactics, TacticalSettings } from "@/lib/matchEngine";
import { sortStandings } from "@/lib/leagueSystem";
import MatchScreen, { SubstitutionRecord } from "@/pages/MatchScreen";
import { teamLogos } from "@/lib/teamLogos";
import { saveGame, loadSettings } from "@/lib/saveSystem";

type Tab = "dashboard"|"squad"|"tactics"|"training"|"finances"|"competitions"|"transfers"|"news"|"history";
export type Formation = "4-4-2"|"4-3-3"|"4-2-3-1"|"3-5-2"|"5-3-2"|"4-5-1";

const formationRows: Record<Formation, string[][]> = {
  "4-4-2":   [["GK"],["LB","CB","CB","RB"],["LM","CM","CM","RM"],["ST","ST"]],
  "4-3-3":   [["GK"],["LB","CB","CB","RB"],["CM","CM","CM"],["LW","ST","RW"]],
  "4-2-3-1": [["GK"],["LB","CB","CB","RB"],["CDM","CDM"],["LM","CAM","RM"],["ST"]],
  "3-5-2":   [["GK"],["CB","CB","CB"],["LM","CM","CM","CM","RM"],["ST","ST"]],
  "5-3-2":   [["GK"],["LB","CB","CB","CB","RB"],["CM","CM","CM"],["ST","ST"]],
  "4-5-1":   [["GK"],["LB","CB","CB","RB"],["LM","CM","CDM","CM","RM"],["ST"]],
};

const SESSIONS: {k:TrainingFocus;label:string;desc:string}[] = [
  {k:'physical',    label:'💪 Físico',        desc:'Melhora preparo e resistência'},
  {k:'attacking',   label:'⚔️ Ataque',         desc:'Finalização e movimentação'},
  {k:'defending',   label:'🛡️ Defesa',         desc:'Marcação e posicionamento'},
  {k:'possession',  label:'🔵 Posse de Bola',  desc:'Passe e circulação'},
  {k:'setpieces',   label:'🎯 Bolas Paradas',  desc:'Escanteios e faltas'},
  {k:'tactical',    label:'🧠 Tático',         desc:'Organização e estratégia'},
  {k:'goalkeepers', label:'🧤 Goleiros',       desc:'Reflexos e posicionamento'},
  {k:'recovery',    label:'😴 Recuperação',    desc:'Reduz fadiga e lesões'},
  {k:'cohesion',    label:'🤝 Coesão',         desc:'Entrosamento coletivo'},
  {k:'individual',  label:'⭐ Individual',     desc:'Evolui atributo específico'},
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtMoney(v:number){return v>=1000?`${(v/1000).toFixed(1)}M`:`${v}K`;}
function fatigueColor(v:number,d:boolean){return v>=70?(d?"text-green-400":"text-green-600"):v>=40?(d?"text-yellow-400":"text-yellow-600"):(d?"text-red-400":"text-red-600");}
function moraleColor(v:number,d:boolean){return v>=70?(d?"text-green-400":"text-green-600"):v>=45?(d?"text-yellow-400":"text-yellow-600"):(d?"text-red-400":"text-red-600");}
function moraleLabel(v:number){return v>=85?"Excelente":v>=70?"Bom":v>=50?"Normal":v>=30?"Baixo":"Péssimo";}
function statusLabel(s:string){return({star:"Estrela",starter:"Titular",rotation:"Rotação",reserve:"Reserva",prospect:"Promessa"}[s])??s;}
function levelLabel(l:number){return["","Pequeno","Médio","Grande","Gigante"][l]??"";}

// ─── CAMPO TÁTICO ─────────────────────────────────────────────────────────────

function FormationField({formation,dark}:{formation:Formation;dark:boolean}){
  const rows=formationRows[formation];
  const posColor:Record<string,string>={GK:"rgba(234,179,8,0.75)",CB:"rgba(59,130,246,0.75)",LB:"rgba(59,130,246,0.75)",RB:"rgba(59,130,246,0.75)",CDM:"rgba(16,185,129,0.75)",CM:"rgba(16,185,129,0.75)",CAM:"rgba(16,185,129,0.75)",LM:"rgba(16,185,129,0.75)",RM:"rgba(16,185,129,0.75)",LW:"rgba(239,68,68,0.75)",RW:"rgba(239,68,68,0.75)",ST:"rgba(239,68,68,0.75)"};
  return(
    <div className="relative w-full rounded-xl overflow-hidden" style={{background:"linear-gradient(180deg,#1a4a1a 0%,#2a6a2a 50%,#1a4a1a 100%)",minHeight:"180px"}}>
      <div className="absolute inset-x-0 top-1/2 h-px bg-white opacity-20"/>
      <div className="absolute top-1/2 left-1/2 w-16 h-16 border border-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"/>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-8 border-b border-l border-r border-white opacity-15 rounded-b-lg"/>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-8 border-t border-l border-r border-white opacity-15 rounded-t-lg"/>
      <div className="relative flex flex-col justify-around h-full py-2 px-2" style={{minHeight:"180px"}}>
        {[...rows].reverse().map((row,ri)=>(
          <div key={ri} className="flex justify-around items-center">
            {row.map((pos,pi)=>(
              <div key={pi} className="flex items-center justify-center rounded-lg text-xs font-bold"
                style={{width:`${Math.min(56,90/row.length)}px`,height:"30px",background:posColor[pos]??"rgba(100,100,100,0.6)",boxShadow:"0 2px 6px rgba(0,0,0,0.4)"}}>
                <span className="text-white text-xs">{pos}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CARD JOGADOR ─────────────────────────────────────────────────────────────

function PlayerCard({player,state,dark,onClose}:{player:any;state:any;dark:boolean;onClose:()=>void}){
  const bg=dark?"bg-gray-900 border-gray-700":"bg-white border-gray-200";
  const tx=dark?"text-white":"text-gray-900";
  const sub=dark?"text-gray-400":"text-gray-500";
  function bar(label:string,val:number,color:string){
    return(
      <div key={label} className="mb-1.5">
        <div className="flex justify-between text-xs mb-0.5"><span className={sub}>{label}</span><span className={`font-bold ${color}`}>{val}</span></div>
        <div className={`h-1.5 rounded-full ${dark?"bg-gray-700":"bg-gray-200"}`}>
          <div className={`h-1.5 rounded-full ${color.includes("green")?"bg-green-500":color.includes("blue")?"bg-blue-500":color.includes("red")?"bg-red-500":color.includes("yellow")?"bg-yellow-500":"bg-orange-500"}`} style={{width:`${((val-40)/60)*100}%`}}/>
        </div>
      </div>
    );
  }
  return(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6">
      <div className={`w-full max-w-md rounded-2xl border p-5 ${bg}`}>
        <div className="flex justify-between items-start mb-4">
          <div><p className={`text-lg font-bold ${tx}`}>{player.name}</p><p className={`text-xs ${sub}`}>{player.position} · {player.age}a · {player.height}cm</p></div>
          <button onClick={onClose} className={`text-xl ${sub}`}>✕</button>
        </div>
        <div className="flex gap-2 mb-4">
          {[{label:"OVR",val:player.overall,color:tx},{label:"POT",val:player.potential,color:dark?"text-blue-300":"text-blue-600"},{label:"Cond",val:`${state?.fatigue??100}%`,color:fatigueColor(state?.fatigue??100,dark)}].map(item=>(
            <div key={item.label} className={`flex-1 rounded-lg p-2 text-center ${dark?"bg-gray-700":"bg-gray-100"}`}>
              <div className={`text-2xl font-black ${item.color}`}>{item.val}</div>
              <div className={`text-xs ${sub}`}>{item.label}</div>
            </div>
          ))}
        </div>
        {bar("🟢 Velocidade",player.pace,dark?"text-green-400":"text-green-600")}
        {bar("🔴 Finalização",player.shooting,dark?"text-red-400":"text-red-600")}
        {bar("🔵 Passe",player.passing,dark?"text-blue-400":"text-blue-600")}
        {bar("🟡 Drible",player.dribbling,dark?"text-yellow-400":"text-yellow-600")}
        {bar("🟠 Defesa",player.defense,dark?"text-orange-400":"text-orange-600")}
        {bar("⚪ Físico",player.physical,dark?"text-gray-300":"text-gray-600")}
        <div className={`mt-3 pt-3 border-t ${dark?"border-gray-700":"border-gray-200"} grid grid-cols-2 gap-1 text-xs`}>
          <div><span className={sub}>Status: </span><span className={tx}>{statusLabel(player.status)}</span></div>
          <div><span className={sub}>Salário: </span><span className={tx}>{fmtMoney(player.salary)}/mês</span></div>
          <div><span className={sub}>Contrato: </span><span className={tx}>{player.contractYears} ano(s)</span></div>
          <div><span className={sub}>Moral: </span><span className={moraleColor(state?.morale??75,dark)}>{moraleLabel(state?.morale??75)}</span></div>
          {(state?.injuryWeeks??0)>0&&<div className="col-span-2 text-red-400">🤕 {state.injuryWeeks} semana(s)</div>}
        </div>
      </div>
    </div>
  );
}

function TacticsPanel({tactics,setTactics,dark}:{tactics:TacticalSettings;setTactics:(t:TacticalSettings)=>void;dark:boolean}){
  const sub=dark?"text-gray-400":"text-gray-600";
  const btn=(active:boolean)=>`px-3 py-1.5 rounded-lg text-xs font-semibold ${active?"bg-white text-black":dark?"bg-gray-700 text-gray-300":"bg-gray-200 text-gray-700"}`;
  function row(label:string,desc:string,node:React.ReactNode){
    return(<div className={`py-3 border-b ${dark?"border-gray-700/50":"border-gray-200"}`}><div className="flex items-start justify-between gap-2"><div><p className={`text-xs font-semibold ${dark?"text-gray-200":"text-gray-800"}`}>{label}</p><p className={`text-xs ${sub}`}>{desc}</p></div><div className="flex gap-1 flex-shrink-0">{node}</div></div></div>);
  }
  return(<div>
    {row("Mentalidade","Postura geral",<>{(["defensive","balanced","attacking"] as const).map(v=><button key={v} className={btn(tactics.mentality===v)} onClick={()=>setTactics({...tactics,mentality:v})}>{v==="defensive"?"Def":v==="balanced"?"Equil":"Ataq"}</button>)}</>)}
    {row("Linha defensiva","Altura da defesa",<>{(["deep","medium","high"] as const).map(v=><button key={v} className={btn(tactics.defensiveLine===v)} onClick={()=>setTactics({...tactics,defensiveLine:v})}>{v==="deep"?"Baixa":v==="medium"?"Média":"Alta"}</button>)}</>)}
    {row("Pressão","Intensidade da marcação",<>{(["low","medium","high"] as const).map(v=><button key={v} className={btn(tactics.pressingIntensity===v)} onClick={()=>setTactics({...tactics,pressingIntensity:v})}>{v==="low"?"Baixa":v==="medium"?"Média":"Alta"}</button>)}</>)}
    {row("Estilo","Forma de jogar",<>{(["direct","balanced","possession"] as const).map(v=><button key={v} className={btn(tactics.playStyle===v)} onClick={()=>setTactics({...tactics,playStyle:v})}>{v==="direct"?"Direto":v==="balanced"?"Equil":"Posse"}</button>)}</>)}
    {row("Largura","Amplitude do ataque",<>{(["narrow","balanced","wide"] as const).map(v=><button key={v} className={btn(tactics.offensiveWidth===v)} onClick={()=>setTactics({...tactics,offensiveWidth:v})}>{v==="narrow"?"Estr":v==="balanced"?"Normal":"Aberta"}</button>)}</>)}
    {row("Contra-ataque","Explorar espaços",<><button className={btn(tactics.counterAttack)} onClick={()=>setTactics({...tactics,counterAttack:true})}>Sim</button><button className={btn(!tactics.counterAttack)} onClick={()=>setTactics({...tactics,counterAttack:false})}>Não</button></>)}
    {row("Laterais","Apoio no ataque",<><button className={btn(tactics.fullbackSupport)} onClick={()=>setTactics({...tactics,fullbackSupport:true})}>Sim</button><button className={btn(!tactics.fullbackSupport)} onClick={()=>setTactics({...tactics,fullbackSupport:false})}>Não</button></>)}
    {row("Compactação","Bloco defensivo",<><button className={btn(tactics.compactDefense)} onClick={()=>setTactics({...tactics,compactDefense:true})}>Sim</button><button className={btn(!tactics.compactDefense)} onClick={()=>setTactics({...tactics,compactDefense:false})}>Não</button></>)}
  </div>);
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function Game(){
  const dark=useDarkMode().isDarkMode;
  const {
    selectedTeam,playerStates,tactics,setTactics,
    matchHistory,addMatchRecord,
    currentDate,currentDayName,currentDateStr,
    todayMatch,nextMatch,daysUntilNextMatch,currentRound,
    advanceDay,markMatchPlayed,
    todayTraining,setTodayTraining,autoSuggestTraining,
    balance,monthlyIncome,wageBill,addFunds,
    standings,recordLeagueResult,
    news,addNews,
    pendingContracts,proposeContract,resolveContract,
    applyFatigueDrops,season,buildSaveData,
  }=useGame();

  const settings=loadSettings();
  const [,navigate]=useLocation();
  const [activeTab,setActiveTab]=useState<Tab>("dashboard");
  const [matchData,setMatchData]=useState<ReturnType<typeof simulateMatch>|null>(null);
  const [opponent,setOpponent]=useState<typeof allTeams[0]|null>(null);
  const [searchQuery,setSearchQuery]=useState("");
  const [selectedPlayer,setSelectedPlayer]=useState<any>(null);
  const [formation,setFormation]=useState<Formation>("4-4-2");
  const [squadSort,setSquadSort]=useState<"name"|"position"|"overall"|"salary"|"fatigue"|"age">("overall");
  const [lineup,setLineup]=useState<number[]>([]);
  const [lineupMode,setLineupMode]=useState<"auto"|"manual">("auto");
  const [showContractModal,setShowContractModal]=useState<any>(null);
  const [contractSalary,setContractSalary]=useState(0);
  const [contractYears,setContractYears]=useState(2);
  const [saveSlotModal,setSaveSlotModal]=useState(false);
  const [lastSaveMsg,setLastSaveMsg]=useState<string|null>(null);
  const [inMatchTactics,setInMatchTactics]=useState<TacticalSettings>(tactics);

  const isMatchDay=!!todayMatch;

  const nextOpponent=useMemo(()=>{
    if(!selectedTeam||!nextMatch) return null;
    const oppId=nextMatch.homeId===selectedTeam.id?nextMatch.awayId:nextMatch.homeId;
    return allTeams.find(t=>t.id===oppId)??null;
  },[selectedTeam,nextMatch]);

  if(!selectedTeam) return(
    <div className={`min-h-screen flex items-center justify-center ${dark?"bg-gray-900":"bg-white"}`}>
      <button onClick={()=>navigate("/new-game")} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold">Escolher Time</button>
    </div>
  );

  const bg=dark?"bg-gray-900":"bg-gray-50";
  const card=dark?"bg-gray-800 border-gray-700":"bg-white border-gray-200";
  const tx=dark?"text-white":"text-gray-900";
  const sub=dark?"text-gray-400":"text-gray-500";
  const div=dark?"border-gray-700":"border-gray-200";

  const posOrder:Record<string,number>={GK:0,CB:1,LB:2,RB:3,CDM:4,CM:5,CAM:6,LM:7,RM:8,LW:9,RW:10,ST:11};

  const filteredPlayers=useMemo(()=>{
    let list=selectedTeam.players.filter(p=>p.name.toLowerCase().includes(searchQuery.toLowerCase())||p.position.toLowerCase().includes(searchQuery.toLowerCase()));
    return [...list].sort((a,b)=>{
      const sa=playerStates[a.id],sb=playerStates[b.id];
      switch(squadSort){
        case "position": return (posOrder[a.position]??99)-(posOrder[b.position]??99);
        case "salary":   return b.salary-a.salary;
        case "fatigue":  return (sb?.fatigue??100)-(sa?.fatigue??100);
        case "age":      return a.age-b.age;
        case "name":     return a.name.localeCompare(b.name);
        default:         return b.overall-a.overall;
      }
    });
  },[selectedTeam.players,searchQuery,squadSort,playerStates]);

  const autoLineup=useMemo(()=>
    [...selectedTeam.players].filter(p=>(playerStates[p.id]?.injuryWeeks??0)===0)
      .sort((a,b)=>b.overall-a.overall).slice(0,11).map(p=>p.id)
  ,[selectedTeam.players,playerStates]);
  const activeLineup=lineupMode==="manual"&&lineup.length===11?lineup:autoLineup;

  function handleManualSave(slot:number){
    const data=buildSaveData();
    if(!data||!selectedTeam) return;
    saveGame(slot,data,selectedTeam.name,selectedTeam.abbreviation);
    setSaveSlotModal(false);
    setLastSaveMsg(`Salvo no Slot ${slot}`);
    setTimeout(()=>setLastSaveMsg(null),2500);
  }

  function simulateAIRound(){
    const others=[...allTeams.filter(t=>t.id!==selectedTeam.id)];
    for(let i=others.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[others[i],others[j]]=[others[j],others[i]];}
    for(let i=0;i<others.length-1;i+=2){
      const home=others[i],away=others[i+1];
      const aiH={...defaultTactics},aiA={...defaultTactics};
      const r1=Math.random();aiH.mentality=r1<0.4?"attacking":r1<0.7?"balanced":"defensive";
      const r2=Math.random();aiA.mentality=r2<0.4?"attacking":r2<0.7?"balanced":"defensive";
      const hFat:Record<number,number>={},aFat:Record<number,number>={};
      home.players.forEach(p=>{hFat[p.id]=100;});away.players.forEach(p=>{aFat[p.id]=100;});
      const res=simulateMatch(home,away,hFat,aFat,aiH,aiA);
      recordLeagueResult(home.id,away.id,res.homeGoals,res.awayGoals);
    }
  }

  function handlePlay(){
    if(!todayMatch||!nextOpponent) return;
    setInMatchTactics({...tactics});
    const homeFat:Record<number,number>={};
    selectedTeam.players.forEach(p=>{homeFat[p.id]=playerStates[p.id]?.fatigue??100;});
    const awayFat:Record<number,number>={};
    nextOpponent.players.forEach(p=>{awayFat[p.id]=100;});
    const aiT={...defaultTactics};
    const r=Math.random();aiT.mentality=r<0.4?"attacking":r<0.7?"balanced":"defensive";
    const result=simulateMatch(selectedTeam,nextOpponent,homeFat,awayFat,inMatchTactics,aiT);
    setMatchData(result);
    setOpponent(nextOpponent);
  }

  function handleMatchClose(subs:SubstitutionRecord[]){
    if(!matchData||!opponent||!todayMatch) return;
    const isWin=matchData.homeGoals>matchData.awayGoals;
    const isDraw=matchData.homeGoals===matchData.awayGoals;
    const drops={...matchData.fatigueDrops};
    subs.forEach(s=>{
      if(drops[s.outId]!==undefined) drops[s.outId]=Math.floor(drops[s.outId]*0.6);
      drops[s.inId]=Math.floor((drops[s.outId]??10)*0.4);
    });
    applyFatigueDrops(drops,isWin,isDraw);
    recordLeagueResult(selectedTeam.id,opponent.id,matchData.homeGoals,matchData.awayGoals);
    markMatchPlayed(todayMatch.round,matchData.homeGoals,matchData.awayGoals);
    addMatchRecord({round:currentRound,opponent:opponent.name,homeGoals:matchData.homeGoals,awayGoals:matchData.awayGoals,isHome:todayMatch.homeId===selectedTeam.id,date:currentDateStr});
    if(isWin) addFunds(500);
    addNews({type:'result',title:`${selectedTeam.abbreviation} ${matchData.homeGoals}–${matchData.awayGoals} ${opponent.abbreviation}`,body:isWin?"Vitória!":isDraw?"Empate.":"Derrota.",date:currentDateStr});
    simulateAIRound();
    if(settings.autoSave==='after_match'){
      setTimeout(()=>{const d=buildSaveData();if(d)saveGame(settings.autoSaveSlot,d,selectedTeam.name,selectedTeam.abbreviation);},200);
    }
    setMatchData(null);
    setOpponent(null);
    // Avança automaticamente para o dia seguinte após o jogo
    advanceDay();
  }

  const sortedStandings=sortStandings(standings);
  const myStanding=sortedStandings.find(s=>s.teamId===selectedTeam.id);
  const myPos=sortedStandings.findIndex(s=>s.teamId===selectedTeam.id)+1;

  const tabs:{key:Tab;icon:string;label:string}[]=[
    {key:"dashboard",icon:"📊",label:"Início"},{key:"squad",icon:"👥",label:"Elenco"},
    {key:"tactics",icon:"🎯",label:"Táticas"},{key:"training",icon:"🏋️",label:"Treino"},
    {key:"finances",icon:"💰",label:"Finanças"},{key:"competitions",icon:"🏆",label:"Liga"},
    {key:"transfers",icon:"🔄",label:"Mercado"},{key:"news",icon:"📰",label:"Notícias"},
    {key:"history",icon:"⏱️",label:"Histórico"},
  ];

  return(
    <>
      {matchData&&opponent&&(
        <MatchScreen homeTeam={selectedTeam} awayTeam={opponent} result={matchData}
          playerStates={playerStates} currentTactics={inMatchTactics}
          onTacticsChange={setInMatchTactics} onClose={handleMatchClose}/>
      )}
      {selectedPlayer&&<PlayerCard player={selectedPlayer} state={playerStates[selectedPlayer.id]} dark={dark} onClose={()=>setSelectedPlayer(null)}/>}

      {/* MODAL CONTRATO */}
      {showContractModal&&(()=>{
        const p=showContractModal;
        const pending=pendingContracts.find(c=>c.playerId===p.id);
        return(
          <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
            <div className={`w-full max-w-md rounded-t-2xl border-t border-x p-5 ${dark?"bg-gray-900 border-gray-700":"bg-white border-gray-200"}`}>
              <div className="flex justify-between items-start mb-4">
                <div><p className={`text-base font-bold ${tx}`}>{p.name}</p><p className={`text-xs ${sub}`}>{p.position} · OVR {p.overall} · {p.contractYears}a restante(s)</p></div>
                <button onClick={()=>setShowContractModal(null)} className={`text-xl ${sub}`}>✕</button>
              </div>
              {pending?.status==='pending'&&<div className={`rounded-xl border p-3 mb-3 ${dark?"border-yellow-700 bg-yellow-900/20":"border-yellow-300 bg-yellow-50"}`}><p className={`text-xs font-bold ${dark?"text-yellow-300":"text-yellow-700"}`}>⏳ Aguardando resposta...</p></div>}
              {pending?.status==='accepted'&&<div className={`rounded-xl border p-3 mb-3 ${dark?"border-green-700 bg-green-900/20":"border-green-200 bg-green-50"}`}><p className={`text-xs font-bold ${dark?"text-green-300":"text-green-700"}`}>✅ Contrato renovado!</p></div>}
              {pending?.status==='rejected'&&<div className={`rounded-xl border p-3 mb-3 ${dark?"border-red-700 bg-red-900/20":"border-red-200 bg-red-50"}`}><p className={`text-xs font-bold ${dark?"text-red-400":"text-red-700"}`}>❌ Proposta recusada.</p></div>}
              <div className="space-y-3 mb-4">
                <div><p className={`text-xs ${sub} mb-1`}>Salário proposto (K/mês) — atual: {p.salary}K</p><input type="number" min={1} max={5000} value={contractSalary||p.salary} onChange={e=>setContractSalary(Number(e.target.value))} className={`w-full px-3 py-2 rounded-lg border text-sm ${dark?"bg-gray-800 border-gray-700 text-white":"bg-white border-gray-300 text-gray-900"}`}/></div>
                <div><p className={`text-xs ${sub} mb-1`}>Duração</p><div className="flex gap-2">{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setContractYears(n)} className={`flex-1 py-2 rounded-lg text-xs font-bold ${contractYears===n?(dark?"bg-white text-black":"bg-gray-900 text-white"):dark?"bg-gray-700 text-gray-300":"bg-gray-100 text-gray-600"}`}>{n}a</button>)}</div></div>
              </div>
              <button onClick={()=>proposeContract(p.id,contractSalary||p.salary,contractYears)} disabled={!!pending&&pending.status==='pending'} className={`w-full py-3 rounded-xl text-sm font-bold mb-2 ${!!pending&&pending.status==='pending'?"bg-gray-600 text-gray-400":"bg-green-600 text-white"}`}>{pending?.status==='pending'?"Aguardando...":"Enviar proposta"}</button>
              <button onClick={()=>setShowContractModal(null)} className={`w-full py-2 text-xs ${sub}`}>Fechar</button>
            </div>
          </div>
        );
      })()}

      {/* MODAL SAVE */}
      {saveSlotModal&&(
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6">
          <div className={`w-full max-w-xs rounded-2xl border p-5 ${dark?"bg-gray-900 border-gray-700":"bg-white border-gray-200"}`}>
            <div className="flex items-center justify-between mb-4"><p className={`text-base font-bold ${tx}`}>Salvar Jogo</p><button onClick={()=>setSaveSlotModal(false)} className={`text-xl ${sub}`}>✕</button></div>
            <div className="space-y-2">
              {[1,2,3].map(slot=>{
                const info=(()=>{try{const r=localStorage.getItem(`elite_manager_save_${slot}_meta`);return r?JSON.parse(r):null;}catch{return null;}})();
                return(<button key={slot} onClick={()=>handleManualSave(slot)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${dark?"border-gray-700 bg-gray-800":"border-gray-200 bg-gray-50"}`}><div className="text-left"><p className={`text-sm font-bold ${tx}`}>Slot {slot}</p>{info?<p className={`text-xs ${sub}`}>{info.teamName} · Rd {info.round}</p>:<p className={`text-xs ${sub}`}>Vazio</p>}</div><span className={`text-xs font-bold ${dark?"text-green-400":"text-green-600"}`}>Salvar</span></button>);
              })}
            </div>
          </div>
        </div>
      )}

      {lastSaveMsg&&<div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-bold px-5 py-2 rounded-full shadow-lg pointer-events-none">✓ {lastSaveMsg}</div>}

      <div className={`min-h-screen flex flex-col ${bg}`}>
        {/* TOP BAR */}
        <div className={`sticky top-0 z-40 ${dark?"bg-gray-900 border-gray-700":"bg-white border-gray-200"} border-b px-4 py-3`}>
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <button onClick={()=>navigate("/")} className={`text-xs px-2 py-1.5 rounded-lg border ${dark?"border-gray-700 text-gray-400":"border-gray-300 text-gray-500"}`}>← Menu</button>
              <div className="w-8 h-8 flex-shrink-0">{teamLogos[selectedTeam.id]}</div>
              <div>
                <p className={`font-bold text-sm leading-tight ${tx}`}>{selectedTeam.abbreviation}</p>
                <p className={`text-xs ${sub}`}>{currentDayName} {currentDateStr} · {season}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setSaveSlotModal(true)} className={`text-xs px-2 py-1.5 rounded-lg border ${dark?"border-gray-700 text-gray-400":"border-gray-300 text-gray-500"}`}>💾</button>
              <div className="text-right">
                <p className={`text-xs font-bold ${dark?"text-green-400":"text-green-600"}`}>{fmtMoney(balance)}</p>
                <p className={`text-xs ${sub}`}>{myPos}º lugar</p>
              </div>
              {isMatchDay?(
                <button onClick={handlePlay} className="bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-lg">🏟️ Jogar</button>
              ):(
                <button onClick={()=>advanceDay(todayTraining??undefined)} className={`text-xs px-4 py-2 rounded-lg border font-bold ${dark?"border-gray-600 text-gray-300":"border-gray-300 text-gray-600"}`}>Avançar →</button>
              )}
            </div>
          </div>
          {/* Banner do dia */}
          <div className="max-w-2xl mx-auto mt-1.5">
            <div className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-center ${
              isMatchDay
                ? dark?"bg-green-900/40 text-green-300 border border-green-800":"bg-green-50 text-green-700 border border-green-200"
                : daysUntilNextMatch<=1
                ? dark?"bg-yellow-900/30 text-yellow-300 border border-yellow-800":"bg-yellow-50 text-yellow-700 border border-yellow-200"
                : dark?"bg-gray-800 text-gray-400":"bg-gray-100 text-gray-600"
            }`}>
              {isMatchDay
                ? `🏟️ DIA DE JOGO · ${selectedTeam.abbreviation} vs ${nextOpponent?.abbreviation}`
                : nextMatch
                ? `Próximo jogo: ${nextOpponent?.abbreviation} em ${daysUntilNextMatch} dia(s)`
                : 'Sem jogos agendados'}
            </div>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto pb-24 max-w-2xl mx-auto w-full">
          <div className="px-4 pt-4">

            {/* DASHBOARD */}
            {activeTab==="dashboard"&&(
              <div className="space-y-4">
                <h2 className={`text-base font-bold ${tx}`}>Dashboard</h2>

                {/* Card principal do dia */}
                <div className={`rounded-xl border p-4 ${card}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className={`text-lg font-black ${tx}`}>{currentDayName}</p>
                      <p className={`text-xs ${sub}`}>{currentDateStr} · Temporada {season}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs ${sub}`}>Rd {currentRound}/38</p>
                      {nextMatch&&<p className={`text-xs font-bold ${daysUntilNextMatch<=2?(dark?"text-yellow-400":"text-yellow-600"):sub}`}>{daysUntilNextMatch} dia(s) para o jogo</p>}
                    </div>
                  </div>

                  {isMatchDay?(
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2"><div className="w-10 h-10">{teamLogos[selectedTeam.id]}</div><p className={`font-bold ${tx}`}>{selectedTeam.abbreviation}</p></div>
                        <p className={`text-sm font-bold ${sub}`}>vs</p>
                        <div className="flex items-center gap-2"><p className={`font-bold ${tx}`}>{nextOpponent?.abbreviation}</p><div className="w-10 h-10">{nextOpponent?teamLogos[nextOpponent.id]:null}</div></div>
                      </div>
                      <button onClick={handlePlay} className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-bold">🏟️ Jogar partida agora</button>
                    </>
                  ):(
                    <>
                      {/* Treino do dia */}
                      <p className={`text-xs font-semibold ${sub} mb-2`}>Treino de hoje:</p>
                      {todayTraining?(
                        <div className={`flex items-center justify-between rounded-lg px-3 py-2 mb-3 ${dark?"bg-green-900/30 border border-green-800":"bg-green-50 border border-green-200"}`}>
                          <span className={`text-sm font-bold ${dark?"text-green-300":"text-green-700"}`}>{SESSIONS.find(s=>s.k===todayTraining)?.label}</span>
                          <button onClick={()=>setTodayTraining(null)} className={`text-xs ${sub}`}>✕</button>
                        </div>
                      ):(
                        <select value="" onChange={e=>{if(e.target.value)setTodayTraining(e.target.value as TrainingFocus);}} className={`w-full px-3 py-2 rounded-xl border text-sm mb-3 ${dark?"bg-gray-800 border-gray-700 text-gray-300":"bg-white border-gray-300 text-gray-700"}`}>
                          <option value="">— Escolher treino</option>
                          {SESSIONS.map(s=><option key={s.k} value={s.k}>{s.label}</option>)}
                        </select>
                      )}
                      <div className="flex gap-2">
                        <button onClick={()=>setTodayTraining(autoSuggestTraining())} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${dark?"border-blue-700 text-blue-300":"border-blue-400 text-blue-600"}`}>🤖 Auto</button>
                        <button onClick={()=>advanceDay(todayTraining??undefined)} className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-700 text-white">Avançar dia →</button>
                      </div>
                    </>
                  )}
                </div>

                {/* Próximos jogos */}
                <div className={`rounded-xl border ${card}`}>
                  <div className={`px-4 py-2.5 border-b ${div}`}><p className={`text-xs font-semibold uppercase tracking-wide ${sub}`}>Próximos jogos</p></div>
                  {(() => {
                    const upcoming = [];
                    for (const m of [...([] as any[])]) {
                      if (upcoming.length >= 3) break;
                    }
                    // Pega próximos 3 jogos do time
                    const teamMatches = ([] as any[]);
                    return teamMatches.length === 0 ? (
                      <p className={`px-4 py-3 text-xs ${sub}`}>Calendário a definir</p>
                    ) : teamMatches.slice(0,3).map((m:any,i:number)=>(
                      <div key={i} className={`px-4 py-2.5 border-b ${div} last:border-0 flex items-center justify-between`}>
                        <p className={`text-sm ${tx}`}>vs {m.opponent}</p>
                        <p className={`text-xs ${sub}`}>{m.date}</p>
                      </div>
                    ));
                  })()}
                  <div className={`px-4 py-2.5 border-b ${div} last:border-0 flex items-center justify-between`}>
                    <div className="flex items-center gap-2"><div className="w-6 h-6">{nextOpponent?teamLogos[nextOpponent.id]:null}</div><p className={`text-sm ${tx}`}>vs {nextOpponent?.name??'—'}</p></div>
                    <p className={`text-xs font-bold ${daysUntilNextMatch<=2?(dark?"text-yellow-400":"text-yellow-600"):sub}`}>{nextMatch?`${String(nextMatch.date.getDate()).padStart(2,'0')}/${String(nextMatch.date.getMonth()+1).padStart(2,'0')}`:'—'}</p>
                  </div>
                </div>

                {/* Stats rápidos */}
                <div className="grid grid-cols-3 gap-3">
                  <div className={`rounded-xl border p-3 text-center ${card}`}><p className={`text-xl font-black ${dark?"text-green-400":"text-green-600"}`}>{fmtMoney(balance)}</p><p className={`text-xs ${sub}`}>Saldo</p></div>
                  <div className={`rounded-xl border p-3 text-center ${card}`}><p className={`text-xl font-black ${dark?"text-yellow-300":"text-yellow-600"}`}>{myStanding?.points??0}</p><p className={`text-xs ${sub}`}>{myPos}º · Pts</p></div>
                  <div className={`rounded-xl border p-3 text-center ${card}`}><p className={`text-xl font-black ${tx}`}>{myStanding?.played??0}</p><p className={`text-xs ${sub}`}>Jogos</p></div>
                </div>

                {/* Notícias */}
                {news.slice(0,3).map(n=>(
                  <div key={n.id} className={`rounded-xl border p-3 ${card}`}>
                    <div className="flex gap-2">
                      <span className="text-lg">{n.type==="result"?"⚽":n.type==="injury"?"🤕":n.type==="training"?"🏋️":n.type==="contract"?"📝":"📢"}</span>
                      <div><p className={`text-xs font-bold ${tx}`}>{n.title}</p>{n.body&&<p className={`text-xs ${sub}`}>{n.body}</p>}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ELENCO */}
            {activeTab==="squad"&&(
              <div>
                <h2 className={`text-base font-bold mb-3 ${tx}`}>Elenco</h2>
                <input type="text" placeholder="Buscar jogador..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className={`w-full px-4 py-2.5 rounded-xl border text-sm mb-3 ${dark?"bg-gray-800 border-gray-700 text-white placeholder-gray-500":"bg-white border-gray-300 text-gray-900 placeholder-gray-400"}`}/>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {([{k:"overall",label:"OVR"},{k:"position",label:"Pos"},{k:"salary",label:"Salário"},{k:"fatigue",label:"Cond"},{k:"age",label:"Idade"},{k:"name",label:"Nome"}] as {k:typeof squadSort;label:string}[]).map(o=>(
                    <button key={o.k} onClick={()=>setSquadSort(o.k)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${squadSort===o.k?(dark?"bg-white text-black":"bg-gray-900 text-white"):dark?"bg-gray-800 text-gray-400":"bg-gray-100 text-gray-600"}`}>{o.label}</button>
                  ))}
                </div>
                <div className={`rounded-xl border p-3 mb-3 ${card}`}>
                  <div className="flex items-center justify-between mb-2"><p className={`text-xs font-semibold ${sub}`}>Escalação</p><div className="flex gap-1"><button onClick={()=>setLineupMode("auto")} className={`px-3 py-1 rounded-lg text-xs font-bold ${lineupMode==="auto"?(dark?"bg-white text-black":"bg-gray-900 text-white"):dark?"bg-gray-700 text-gray-300":"bg-gray-200 text-gray-600"}`}>Auto</button><button onClick={()=>{setLineupMode("manual");setLineup(autoLineup);}} className={`px-3 py-1 rounded-lg text-xs font-bold ${lineupMode==="manual"?(dark?"bg-white text-black":"bg-gray-900 text-white"):dark?"bg-gray-700 text-gray-300":"bg-gray-200 text-gray-600"}`}>Manual</button></div></div>
                  {lineupMode==="manual"&&<p className={`text-xs ${sub}`}>Toque para marcar titular. <span className={`font-bold ${activeLineup.length===11?(dark?"text-green-400":"text-green-600"):(dark?"text-yellow-400":"text-yellow-600")}`}>{activeLineup.length}/11</span></p>}
                </div>
                <div className="space-y-2">
                  {filteredPlayers.map(player=>{
                    const state=playerStates[player.id]??{fatigue:100,morale:75,happiness:75,injuryWeeks:0};
                    const injured=state.injuryWeeks>0;
                    const isInLineup=activeLineup.includes(player.id);
                    return(
                      <div key={player.id} className={`rounded-xl border ${card} ${injured?"border-red-500/40":isInLineup&&lineupMode==="manual"?"border-green-500/40":""}`}>
                        <button onClick={()=>lineupMode==="manual"?setLineup(prev=>prev.includes(player.id)?prev.filter(id=>id!==player.id):prev.length<11?[...prev,player.id]:prev):setSelectedPlayer(player)} className="w-full flex items-center gap-3 p-3 text-left">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${injured?"bg-red-900/50 text-red-400":isInLineup?(dark?"bg-green-900/50 text-green-300":"bg-green-100 text-green-700"):dark?"bg-gray-700 text-white":"bg-gray-100 text-gray-800"}`}>{player.position}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between"><p className={`text-sm font-semibold truncate ${tx} ${injured?"line-through opacity-50":""}`}>{player.name}</p><span className={`text-sm font-black ml-2 flex-shrink-0 ${player.overall>=80?(dark?"text-green-400":"text-green-600"):player.overall>=70?(dark?"text-blue-400":"text-blue-600"):tx}`}>{player.overall}</span></div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`text-xs ${sub}`}>{player.age}a</span>
                              <div className="flex items-center gap-1"><div className={`w-14 h-1.5 rounded-full ${dark?"bg-gray-700":"bg-gray-200"}`}><div className={`h-1.5 rounded-full ${state.fatigue>=70?"bg-green-500":state.fatigue>=40?"bg-yellow-500":"bg-red-500"}`} style={{width:`${state.fatigue}%`}}/></div><span className={`text-xs font-semibold ${fatigueColor(state.fatigue,dark)}`}>{state.fatigue}%</span></div>
                              <span className={`text-xs ${moraleColor(state.morale,dark)}`}>{moraleLabel(state.morale)}</span>
                              {injured&&<span className="text-xs text-red-400">🤕 {state.injuryWeeks}sem</span>}
                            </div>
                          </div>
                        </button>
                        <div className={`flex items-center justify-between px-3 pb-2.5 border-t ${div} pt-1.5`}>
                          <span className={`text-xs ${sub}`}>{fmtMoney(player.salary)}/mês · {player.contractYears}a</span>
                          <button onClick={()=>{setShowContractModal(player);setContractSalary(player.salary);setContractYears(player.contractYears);}} className={`text-xs px-2.5 py-0.5 rounded-lg border ${dark?"border-gray-600 text-gray-300":"border-gray-300 text-gray-600"}`}>📝 Contrato</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TÁTICAS */}
            {activeTab==="tactics"&&(
              <div>
                <h2 className={`text-base font-bold mb-3 ${tx}`}>Táticas</h2>
                <div className={`rounded-xl border p-3 mb-4 ${card}`}>
                  <div className="flex items-center justify-between mb-2"><p className={`text-xs font-semibold uppercase tracking-wide ${sub}`}>Formação</p><p className={`text-sm font-black ${tx}`}>{formation}</p></div>
                  <div className="flex flex-wrap gap-2 mb-3">{(["4-4-2","4-3-3","4-2-3-1","3-5-2","5-3-2","4-5-1"] as Formation[]).map(f=><button key={f} onClick={()=>setFormation(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${formation===f?(dark?"bg-white text-black border-white":"bg-gray-900 text-white border-gray-900"):(dark?"border-gray-600 text-gray-400":"border-gray-300 text-gray-600")}`}>{f}</button>)}</div>
                  <FormationField formation={formation} dark={dark}/>
                </div>
                <div className={`rounded-xl border p-4 ${card}`}><p className={`text-xs font-semibold uppercase tracking-wide ${sub} mb-2`}>Instruções</p><TacticsPanel tactics={tactics} setTactics={setTactics} dark={dark}/></div>
              </div>
            )}

            {/* TREINO */}
            {activeTab==="training"&&(
              <div>
                <h2 className={`text-base font-bold mb-1 ${tx}`}>Treino</h2>
                <p className={`text-xs ${sub} mb-4`}>{currentDayName}, {currentDateStr}</p>
                {isMatchDay?(
                  <div className={`rounded-xl border p-4 ${card} text-center`}>
                    <p className="text-3xl mb-2">🏟️</p>
                    <p className={`text-sm font-bold ${tx}`}>Dia de jogo</p>
                    <p className={`text-xs ${sub} mt-1`}>Sem treino hoje. Foco total na partida.</p>
                    <button onClick={handlePlay} className="mt-3 w-full bg-green-600 text-white py-3 rounded-xl text-sm font-bold">Jogar agora</button>
                  </div>
                ):(
                  <>
                    <div className={`rounded-xl border ${card} overflow-hidden mb-4`}>
                      {SESSIONS.map(s=>(
                        <button key={s.k} onClick={()=>setTodayTraining(todayTraining===s.k?null:s.k)}
                          className={`w-full flex items-center gap-3 px-4 py-3 border-b ${div} last:border-0 text-left transition-colors ${todayTraining===s.k?(dark?"bg-green-900/30":"bg-green-50"):(dark?"hover:bg-gray-700":"hover:bg-gray-50")}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base ${todayTraining===s.k?(dark?"bg-green-800":"bg-green-200"):(dark?"bg-gray-700":"bg-gray-100")}`}>{s.label.split(' ')[0]}</div>
                          <div>
                            <p className={`text-sm font-semibold ${todayTraining===s.k?(dark?"text-green-300":"text-green-700"):tx}`}>{s.label.split(' ').slice(1).join(' ')}</p>
                            <p className={`text-xs ${sub}`}>{s.desc}</p>
                          </div>
                          {todayTraining===s.k&&<span className={`ml-auto text-xs font-bold ${dark?"text-green-400":"text-green-600"}`}>✓</span>}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>setTodayTraining(autoSuggestTraining())} className={`flex-1 py-3 rounded-xl text-sm font-bold border ${dark?"border-blue-700 text-blue-300":"border-blue-400 text-blue-600"}`}>🤖 Auto</button>
                      <button onClick={()=>advanceDay(todayTraining??undefined)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-700 text-white">Avançar dia →</button>
                    </div>
                    {selectedTeam.players.filter(p=>(playerStates[p.id]?.injuryWeeks??0)>0).length>0&&(
                      <div className={`rounded-xl border p-4 ${card} mt-4`}>
                        <p className={`text-xs font-semibold uppercase tracking-wide ${sub} mb-2`}>🤕 Lesionados</p>
                        {selectedTeam.players.filter(p=>(playerStates[p.id]?.injuryWeeks??0)>0).map(p=>(
                          <div key={p.id} className="flex justify-between py-1.5"><p className={`text-sm ${tx}`}>{p.name}</p><p className="text-xs text-red-400">{playerStates[p.id].injuryWeeks} sem</p></div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* FINANÇAS */}
            {activeTab==="finances"&&(
              <div>
                <h2 className={`text-base font-bold mb-3 ${tx}`}>Finanças</h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[{label:"Saldo",val:balance,color:dark?"text-green-400":"text-green-600"},{label:"Receita/mês",val:monthlyIncome,color:dark?"text-blue-400":"text-blue-600"},{label:"Folha/mês",val:wageBill,color:dark?"text-red-400":"text-red-600"},{label:"Resultado",val:monthlyIncome-wageBill,color:(monthlyIncome-wageBill)>=0?(dark?"text-green-400":"text-green-600"):(dark?"text-red-400":"text-red-600")}].map(item=><div key={item.label} className={`rounded-xl border p-4 ${card}`}><p className={`text-xs ${sub} mb-1`}>{item.label}</p><p className={`text-xl font-black ${item.color}`}>{fmtMoney(item.val)}</p></div>)}
                </div>
                <div className={`rounded-xl border p-4 ${card} mb-3`}><p className={`text-xs ${sub} mb-1`}>Nível do clube</p><p className={`text-sm font-bold ${tx}`}>{levelLabel(selectedTeam.clubLevel)} (Nível {selectedTeam.clubLevel})</p></div>
                <div className={`rounded-xl border overflow-hidden ${card}`}>
                  <div className={`px-4 py-2.5 border-b ${div}`}><p className={`text-xs font-semibold uppercase tracking-wide ${sub}`}>Maiores salários</p></div>
                  {[...selectedTeam.players].sort((a,b)=>b.salary-a.salary).slice(0,8).map(p=>(
                    <div key={p.id} className={`flex justify-between px-4 py-2.5 border-b ${div} last:border-0`}><div><p className={`text-sm ${tx}`}>{p.name}</p><p className={`text-xs ${sub}`}>{p.position} · {statusLabel(p.status)}</p></div><p className={`text-sm font-bold ${dark?"text-red-400":"text-red-600"}`}>{fmtMoney(p.salary)}/mês</p></div>
                  ))}
                </div>
              </div>
            )}

            {/* LIGA */}
            {activeTab==="competitions"&&(
              <div>
                <h2 className={`text-base font-bold mb-3 ${tx}`}>Campeonato {season}</h2>
                <div className={`rounded-xl border overflow-hidden ${card}`}>
                  <div className={`px-3 py-2 border-b ${div} grid text-xs font-semibold ${sub}`} style={{gridTemplateColumns:"1.5rem 1fr 2rem 2rem 2rem 2rem 2rem 2.5rem"}}>
                    <span>#</span><span>Time</span><span className="text-center">J</span><span className="text-center">V</span><span className="text-center">E</span><span className="text-center">D</span><span className="text-center">SG</span><span className="text-center font-black">Pts</span>
                  </div>
                  {sortedStandings.map((row,idx)=>{
                    const isMe=row.teamId===selectedTeam.id;
                    const gd=row.goalsFor-row.goalsAgainst;
                    return(
                      <div key={row.teamId} className={`px-3 py-2.5 border-b ${div} last:border-0 grid items-center text-xs ${isMe?dark?"bg-green-900/30":"bg-green-50":""}`} style={{gridTemplateColumns:"1.5rem 1fr 2rem 2rem 2rem 2rem 2rem 2.5rem"}}>
                        <span className={`font-bold ${idx<4?(dark?"text-green-400":"text-green-600"):idx>=17?(dark?"text-red-400":"text-red-600"):sub}`}>{idx+1}</span>
                        <span className={`font-semibold truncate ${isMe?(dark?"text-green-300":"text-green-700"):tx}`}>{row.teamAbbr}</span>
                        <span className={`text-center ${sub}`}>{row.played}</span>
                        <span className={`text-center ${dark?"text-green-400":"text-green-600"}`}>{row.won}</span>
                        <span className={`text-center ${dark?"text-yellow-400":"text-yellow-600"}`}>{row.drawn}</span>
                        <span className={`text-center ${dark?"text-red-400":"text-red-600"}`}>{row.lost}</span>
                        <span className={`text-center ${sub}`}>{gd>=0?`+${gd}`:gd}</span>
                        <span className={`text-center font-black ${isMe?(dark?"text-green-300":"text-green-700"):tx}`}>{row.points}</span>
                      </div>
                    );
                  })}
                </div>
                <p className={`text-xs ${sub} mt-2 text-center`}>Verde = Libertadores · Vermelho = Rebaixamento</p>
              </div>
            )}

            {/* MERCADO */}
            {activeTab==="transfers"&&(
              <div>
                <h2 className={`text-base font-bold mb-3 ${tx}`}>Mercado</h2>
                <div className={`rounded-xl border p-4 ${card} mb-4 text-center`}><p className="text-3xl mb-2">🔄</p><p className={`text-sm font-semibold ${tx}`}>Em desenvolvimento</p></div>
                {selectedTeam.players.filter(p=>p.contractYears<=1).length>0&&(
                  <div className={`rounded-xl border ${card}`}>
                    <div className={`px-4 py-2.5 border-b ${div}`}><p className={`text-xs font-semibold uppercase tracking-wide ${sub}`}>⚠️ Contratos a vencer</p></div>
                    {selectedTeam.players.filter(p=>p.contractYears<=1).map(p=>(
                      <div key={p.id} className={`flex justify-between items-center px-4 py-2.5 border-b ${div} last:border-0`}>
                        <div><p className={`text-sm ${tx}`}>{p.name}</p><p className={`text-xs ${sub}`}>{p.position} · OVR {p.overall}</p></div>
                        <button onClick={()=>{setShowContractModal(p);setContractSalary(p.salary);setContractYears(2);}} className={`text-xs px-3 py-1.5 rounded-lg border ${dark?"border-yellow-700 text-yellow-400":"border-yellow-400 text-yellow-600"}`}>Renovar</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NOTÍCIAS */}
            {activeTab==="news"&&(
              <div>
                <h2 className={`text-base font-bold mb-3 ${tx}`}>Notícias</h2>
                {news.length===0?<p className={`text-sm ${sub}`}>Nenhuma notícia ainda.</p>:(
                  <div className="space-y-3">
                    {news.map(n=>(
                      <div key={n.id} className={`rounded-xl border p-3 ${card}`}>
                        <div className="flex gap-3"><span className="text-xl flex-shrink-0">{n.type==="result"?"⚽":n.type==="injury"?"🤕":n.type==="training"?"🏋️":n.type==="contract"?"📝":"📢"}</span><div><div className="flex gap-2 mb-0.5"><p className={`text-xs font-bold ${tx}`}>{n.title}</p><span className={`text-xs ${sub}`}>· {n.date}</span></div>{n.body&&<p className={`text-xs ${sub}`}>{n.body}</p>}</div></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HISTÓRICO */}
            {activeTab==="history"&&(
              <div>
                <h2 className={`text-base font-bold mb-3 ${tx}`}>Histórico</h2>
                {matchHistory.length===0?<p className={`text-sm ${sub}`}>Nenhuma partida disputada.</p>:(
                  <div className="space-y-2">
                    {matchHistory.map((m,i)=>{
                      const isWin=m.homeGoals>m.awayGoals,isDraw=m.homeGoals===m.awayGoals;
                      return(
                        <div key={i} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${card}`}>
                          <span className={`w-10 text-center text-xs font-black px-2 py-1 rounded-lg ${isWin?"bg-green-600 text-white":isDraw?"bg-yellow-600 text-white":"bg-red-600 text-white"}`}>{isWin?"VIT":isDraw?"EMP":"DER"}</span>
                          <span className={`text-xs ${sub} w-12`}>{m.date}</span>
                          <span className={`flex-1 text-sm font-semibold ${tx}`}>{selectedTeam.abbreviation} {m.homeGoals}–{m.awayGoals} {m.opponent.slice(0,12)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM NAV */}
        <div className={`fixed bottom-0 left-0 right-0 z-40 ${dark?"bg-gray-900 border-gray-700":"bg-white border-gray-200"} border-t`}>
          <div className="flex overflow-x-auto max-w-2xl mx-auto">
            {tabs.map(tab=>(
              <button key={tab.key} onClick={()=>setActiveTab(tab.key)} className={`flex flex-col items-center flex-shrink-0 px-3 py-2 min-w-[64px] ${activeTab===tab.key?(dark?"text-green-400":"text-green-600"):(dark?"text-gray-500":"text-gray-400")}`}>
                <span className="text-lg leading-none">{tab.icon}</span>
                <span className="text-xs mt-0.5 font-medium whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
