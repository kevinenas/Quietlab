(function(root){
'use strict';
const defaults={diameter:120,hub:40,blades:7,chord:25,pitch:30,twist:12,sweep:18,thickness:1.5,clearance:1,rpm:1500,target:45,pressure:5,shroud:true};
const fields=[['diameter','Fan diameter','mm',80,200,1],['hub','Hub diameter','mm',20,80,1],['blades','Blade count','',3,13,1],['chord','Blade chord','mm',10,45,0.5],['pitch','Tip pitch','°',10,55,1],['twist','Root twist','°',-10,30,1],['sweep','Backward sweep','°',-20,40,1],['thickness','Blade thickness','mm',0.5,4,0.1],['clearance','Tip clearance','mm',0.3,5,0.1],['rpm','Rotational speed','RPM',300,5000,50],['target','Airflow target','CFM',5,180,1],['pressure','Static pressure target','Pa',0,100,1]];
function normalize(input){let p={...defaults};for(const [k,, ,lo,hi,step] of fields){const v=Number(input[k]);if(!Number.isFinite(v))throw Error('Invalid '+k);p[k]=Math.max(lo,Math.min(hi,Math.round(v/step)*step));}p.hub=Math.min(p.hub,p.diameter*0.65);p.shroud=Boolean(input.shroud);return p;}
const power=db=>10**(db/10),db=p=>10*Math.log10(Math.max(p,1e-20));
function aWeight(f){let f2=f*f;return 20*Math.log10(12194**2*f2*f2/((f2+20.6**2)*Math.sqrt((f2+107.7**2)*(f2+737.9**2))*(f2+12194**2)))+2;}
function evaluate(input,detail=true){const p=normalize(input),D=p.diameter/1000,H=p.hub/1000,U=Math.PI*D*p.rpm/60,area=Math.PI*(D*D-H*H)/4;
const solidity=p.blades*p.chord/(Math.PI*(p.diameter+p.hub)/2),angle=(p.pitch+0.35*p.twist)*Math.PI/180;
const leak=Math.exp(-(p.shroud?3:7)*p.clearance/p.diameter)*(p.shroud?1:0.78),stall=1/(1+Math.max(0,p.pitch+0.65*p.twist-45)**2/220);
const loading=(1-Math.exp(-1.8*solidity))*Math.sin(2*angle)*stall;
const q0=area*U*0.30*loading*leak*2118.88, p0=0.5*1.204*U*U*0.20*loading*leak;
const flow=q0*Math.sqrt(Math.max(0,1-p.pressure/p0));
const base=30+50*Math.log10(U/(Math.PI*0.12*1500/60))+10*Math.log10(area/(Math.PI*(0.12**2-0.04**2)/4));
const turbulence=base+10*Math.log10(0.55+solidity)+5*(1-stall)+2*Math.log2(p.thickness/1.5)+12*p.clearance/p.diameter+(p.shroud?0:2)+5*Math.min(1,p.pressure/p0);
const tonal=base-2+10*Math.log10(Math.max(0.1,solidity))-0.06*p.sweep+4*(1-stall);
const bpf=p.blades*p.rpm/60,frequencies=Array.from({length:80},(_,i)=>20*(1000**((i+0.5)/80))),weights=frequencies.map(f=>Math.exp(-0.5*(Math.log(f/(700*U/9.425))/1.25)**2)),sum=weights.reduce((a,b)=>a+b,0);
const bands=frequencies.map((f,i)=>({f,broad:power(turbulence)*weights[i]/sum,tone:0}));
const harmonics=[];for(let h=1;h<=6;h++){const f=bpf*h,level=tonal-7*Math.log2(h);if(f>=20&&f<=20000){harmonics.push({f,level});let i=Math.min(79,Math.max(0,Math.floor(Math.log(f/20)/Math.log(1000)*80)));bands[i].tone+=power(level);}}
let pa=bands.reduce((s,b)=>s+b.broad*power(aWeight(b.f)),0)+harmonics.reduce((s,h)=>s+power(h.level+aWeight(h.f)),0);
let pu=bands.reduce((s,b)=>s+b.broad+b.tone,0);
return {p,flow,q0,p0,tip:U,mach:U/343,bpf,dba:db(pa),spl:db(pu),solidity,feasible:flow>=p.target&&p.pressure<p0,stall,warnings:[...(solidity>1.35?['High solidity: possible blade overlap; inspect geometry.']:[]),...(stall<0.85?['High loading / stall region: estimates are especially uncertain.']:[]),...(U/343>0.15?['High tip Mach number: outside the preferred screening range.']:[]),...(p.pressure>=p0?['Target pressure exceeds estimated shutoff pressure; no delivered flow.']:[])],...(detail?{bands,harmonics}: {})};}
function search(input,count=1600,seed=42,options={}){const base=normalize(input),T=root.FanThermal,thermalMode=options.objective==='cooling',thermal=thermalMode?T.normalize(options.thermal):null;let state=seed>>>0;const random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};let candidates=[],valid=0;
const assess=p=>{let r=evaluate(p,false);if(thermalMode)r={...r,...T.evaluate(r,thermal)};return r;};
const meets=r=>r.feasible&&(!thermalMode||(r.thermalFeasible&&r.delta>0));
for(let i=0;i<count;i++){let p={...base};if(i){p.blades=3+Math.floor(random()*11);p.chord=12+random()*28;p.pitch=15+random()*30;p.twist=random()*25;p.sweep=random()*35;}
// Keep envelope, hub, thickness, clearance and shroud fixed. Solve lowest feasible RPM.
let lo=300,hi=5000;if(!meets(assess({...p,rpm:hi})))continue;for(let j=0;j<16;j++){let mid=(lo+hi)/2;if(meets(assess({...p,rpm:mid})))hi=mid;else lo=mid;}p=normalize({...p,rpm:Math.min(5000,Math.ceil(hi/50)*50)});let r=assess(p);
if(thermalMode){for(let j=1;j<=12;j++){const candidate=assess({...p,rpm:p.rpm+(5000-p.rpm)*j/12});if(meets(candidate)&&candidate.mach<=0.15&&candidate.score>r.score)r=candidate;}}
if(meets(r)&&r.solidity<=1.35&&r.stall>=0.85&&r.mach<=0.15){valid++;candidates.push(r);}}
candidates.sort(thermalMode?((a,b)=>b.score-a.score||a.dba-b.dba):((a,b)=>a.dba-b.dba));return {candidates:candidates.slice(0,5),valid,count,seed,objective:thermalMode?'cooling':'noise'};}
const api={defaults,fields,normalize,evaluate,search,aWeight};if(typeof module!=='undefined')module.exports=api;root.FanModel=api;
})(globalThis);
