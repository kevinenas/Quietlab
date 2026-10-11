(function(root){
'use strict';
const defaults={ambient:25,watts:100,passiveR:0.55,fixedR:0.10,flowScale:30,exponent:0.8,capture:75,baselineFlow:0,maxTemp:75};
const fields=[['ambient','Inlet air temperature','°C',5,45,1],['watts','Fixed heat load','W',10,300,5],['passiveR','No-flow thermal resistance','°C/W',0.15,1.5,0.01],['fixedR','Minimum thermal resistance','°C/W',0.02,0.5,0.01],['flowScale','Heatsink flow scale','CFM',5,100,1],['exponent','Flow response exponent','',0.3,1.2,0.05],['capture','Air reaching heatsink','%',10,100,1],['baselineFlow','Baseline delivered airflow','CFM',0,150,1],['maxTemp','CPU temperature limit','°C',35,100,1]];
function normalize(input={}){let t={...defaults,...input};for(const [k,,,lo,hi] of fields){if(!Number.isFinite(Number(t[k])))throw Error('Invalid thermal '+k);t[k]=Math.min(hi,Math.max(lo,Number(t[k])));}t.fixedR=Math.min(t.fixedR,t.passiveR-0.01);return t;}
function resistance(flow,t){return t.fixedR+(t.passiveR-t.fixedR)/(1+(Math.max(0,flow)*t.capture/100/t.flowScale)**t.exponent);}
function score(delta,dba){return {simple:dba>0?delta/dba:null,loudnessPenalty:2**((dba-30)/10),energyPenalty:10**((dba-30)/10),score:delta/2**((dba-30)/10),energyScore:delta/10**((dba-30)/10)};}
function evaluate(fan,input){const t=normalize(input),r=resistance(fan.flow,t),baseline=t.ambient+t.watts*resistance(t.baselineFlow,t),cpu=t.ambient+t.watts*r,delta=baseline-cpu;return {cpu,baseline,delta,resistance:r,effectiveFlow:fan.flow*t.capture/100,thermalFeasible:cpu<=t.maxTemp,...score(delta,fan.dba)};}
function pareto(points){return points.filter((p,i)=>!points.some((q,j)=>j!==i&&q.dba<=p.dba&&q.delta>=p.delta&&(q.dba<p.dba||q.delta>p.delta))).sort((a,b)=>a.dba-b.dba);}
function angleStep(rpm,seconds,scale=1){return rpm/60*2*Math.PI*seconds*scale;}
const api={defaults,fields,normalize,resistance,score,evaluate,pareto,angleStep};if(typeof module!=='undefined')module.exports=api;root.FanThermal=api;
})(globalThis);
