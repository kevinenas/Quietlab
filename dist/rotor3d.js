/* Parametric fan geometry and a dependency-free WebGL studio renderer.
   All dimensions follow the editor. Housing details are visual, not solver inputs. */
(function(root){
'use strict';
const TAU=Math.PI*2;
function surface(n,m,point,flip=false){const vertices=[],normals=[],indices=[];for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){vertices.push(...point(i/n,j/m));normals.push(0,0,0);}for(let i=0;i<n;i++)for(let j=0;j<m;j++){const a=i*(m+1)+j,b=a+m+1;indices.push(...(flip?[a,b+1,b,a,a+1,b+1]:[a,b,b+1,a,b+1,a+1]));}for(let i=0;i<indices.length;i+=3){const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3,u=[vertices[b]-vertices[a],vertices[b+1]-vertices[a+1],vertices[b+2]-vertices[a+2]],v=[vertices[c]-vertices[a],vertices[c+1]-vertices[a+1],vertices[c+2]-vertices[a+2]],norm=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];for(const k of [a,b,c])for(let t=0;t<3;t++)normals[k+t]+=norm[t];}for(let i=0;i<normals.length;i+=3){const len=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;for(let t=0;t<3;t++)normals[i+t]/=len;}return {vertices,normals,indices};}
function geometry(p){const objects=[],R=p.diameter/2,hub=p.hub/p.diameter,gap=p.clearance/R,depth=25/R/2;
const add=(mesh,material,rotor=false)=>objects.push({...mesh,material,rotor});
const ring=(ri,ro,z,mat,rot=false,x=0,y=0)=>add(surface(128,1,(a,b)=>{const r=ri+(ro-ri)*b,t=a*TAU;return [x+r*Math.cos(t),y+r*Math.sin(t),z];},true),mat,rot);
const cylinder=(r,z0,z1,mat,rot=false,x=0,y=0)=>add(surface(128,1,(a,b)=>{const t=a*TAU;return [x+r*Math.cos(t),y+r*Math.sin(t),z0+(z1-z0)*b];}),mat,rot);
const lathe=(profile,mat,rot=false)=>{for(let i=1;i<profile.length;i++){const a=profile[i-1],b=profile[i];add(surface(128,1,(t,s)=>{const r=a[0]+(b[0]-a[0])*s;return [r*Math.cos(t*TAU),r*Math.sin(t*TAU),a[1]+(b[1]-a[1])*s];}),mat,rot);}};
if(p.shroud){
// Rounded square fan frame with a circular, bevelled inlet and four fasteners.
const outer=a=>1.105/((Math.abs(Math.cos(a))**10+Math.abs(Math.sin(a))**10)**.1),inner=1+gap;
for(const [z,flip] of [[depth,true],[-depth,false]])add(surface(160,10,(t,s)=>{const a=t*TAU,r=inner+(outer(a)-inner)*s;return [r*Math.cos(a),r*Math.sin(a),z-0.025*Math.sin(s*Math.PI)];},flip),'frame');
add(surface(160,1,(t,s)=>{const a=t*TAU,r=outer(a);return [r*Math.cos(a),r*Math.sin(a),-depth+s*depth*2];}),'frame');
lathe([[inner+.016,-depth],[inner,-depth+.035],[inner,depth-.035],[inner+.02,depth]],'rim');
// Back struts are outside the rotor's swept depth.
for(let k=0;k<4;k++){const a=k*TAU/4+.5,ca=Math.cos(a),sa=Math.sin(a);add(surface(1,1,(t,s)=>{const r=hub*.8+t*(1.02-hub*.8),v=(s-.5)*.09;return [r*ca-v*sa,r*sa+v*ca,-depth-.015];}),'frame');}
for(const x of [-.92,.92])for(const y of [-.92,.92]){ring(.0,.105,depth+.005,'pad',false,x,y);cylinder(.066,depth+.008,depth+.018,'metal',false,x,y);ring(.028,.065,depth+.02,'metal',false,x,y);ring(0,.029,depth+.021,'pad',false,x,y);}
}
for(let k=0;k<p.blades;k++){
const point=(t,s,side)=>{const r=hub*.94+(1-hub*.94)*t,a=k*TAU/p.blades-p.sweep*Math.PI/180*t*t,chord=p.chord/R*(.65+.35*Math.sin(Math.PI*t*.75)),pitch=(p.pitch+p.twist*(1-t))*Math.PI/180;
// Lens cross-section rounds both edges; maximum thickness matches the input.
const along=(s-.5)*chord,thick=side*p.thickness/R*.5*Math.sin(Math.PI*s),tang=along*Math.cos(pitch)-thick*Math.sin(pitch),z=along*Math.sin(pitch)+thick*Math.cos(pitch);const radial=Math.sqrt(Math.max(0,r*r-tang*tang));return [radial*Math.cos(a)-tang*Math.sin(a),radial*Math.sin(a)+tang*Math.cos(a),z];};
for(const side of [-1,1])add(surface(36,16,(t,s)=>point(t,s,side),side>0),'blade',true);
for(const t of [0,1])add(surface(16,1,(s,b)=>point(t,s,2*b-1)),'blade',true);
}
lathe([[0,-.14],[hub*.95,-.14],[hub,-.11],[hub,.1],[hub*.96,.14],[hub*.88,.155],[0,.155]],'hub',true);
ring(hub*.68,hub*.73,.158,'accent',true);ring(0,hub*.64,.159,'cap',true);
// Machined centre insert and small index ticks.
ring(0,hub*.10,.163,'metal',true);
for(let i=0;i<12;i++)add(surface(1,1,(t,s)=>{const a=i*TAU/12+(s-.5)*.014,r=hub*(.79+t*.06);return [r*Math.cos(a),r*Math.sin(a),.158];},true),'metal',true);
return objects;
}
function create(canvas){const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});if(!gl)return null;
const vertex=`attribute vec3 position;attribute vec3 normal;uniform vec3 rotation;uniform float spin;uniform float aspect;uniform float zoom;uniform float offset;varying vec3 N;varying vec3 P;
vec3 rz(vec3 v,float a){return vec3(v.x*cos(a)-v.y*sin(a),v.x*sin(a)+v.y*cos(a),v.z);}vec3 ry(vec3 v,float a){return vec3(v.x*cos(a)+v.z*sin(a),v.y,-v.x*sin(a)+v.z*cos(a));}vec3 rx(vec3 v,float a){return vec3(v.x,v.y*cos(a)-v.z*sin(a),v.y*sin(a)+v.z*cos(a));}
void main(){vec3 v=rz(position,spin);v.z+=offset;v=rx(ry(v,rotation.y),rotation.x);P=v;N=rx(ry(rz(normal,spin),rotation.y),rotation.x);float z=v.z-5.2;float f=2.7*zoom;gl_Position=vec4(v.x*f/aspect,v.y*f,(-20.1/19.9)*z-4.0/19.9,-z);}`;
const fragment=`precision mediump float;varying vec3 N;varying vec3 P;uniform vec3 color;uniform float gloss;void main(){vec3 n=normalize(N);if(!gl_FrontFacing)n=-n;vec3 l=normalize(vec3(-.65,.9,1.3));vec3 v=normalize(vec3(0.,0.,5.2)-P);float key=max(dot(n,l),0.);float fill=max(dot(n,normalize(vec3(1.,-.1,.5))),0.);float spec=pow(max(dot(n,normalize(l+v)),0.),gloss);float edge=pow(1.-max(dot(n,v),0.),3.);vec3 c=color*(.35+.58*key+.24*fill)+vec3(.85,.95,1.)*spec*.30+vec3(.16,.24,.26)*edge*.3;gl_FragColor=vec4(c,1.);}`;
function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const uniforms={};for(const key of ['rotation','spin','aspect','zoom','offset','color','gloss'])uniforms[key]=gl.getUniformLocation(program,key);
const pos=gl.getAttribLocation(program,'position'),normal=gl.getAttribLocation(program,'normal');let buffers=[],key='';
function upload(mesh){const result={...mesh};for(const [name,data,type] of [['v',mesh.vertices,gl.ARRAY_BUFFER],['n',mesh.normals,gl.ARRAY_BUFFER],['i',mesh.indices,gl.ELEMENT_ARRAY_BUFFER]]){result[name]=gl.createBuffer();gl.bindBuffer(type,result[name]);gl.bufferData(type,name==='i'?new Uint16Array(data):new Float32Array(data),gl.STATIC_DRAW);}const edges=[];for(let i=0;i<mesh.indices.length;i+=3)edges.push(mesh.indices[i],mesh.indices[i+1],mesh.indices[i+1],mesh.indices[i+2],mesh.indices[i+2],mesh.indices[i]);result.edges=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,result.edges);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(edges),gl.STATIC_DRAW);result.edgeCount=edges.length;return result;}
const materials={frame:[.14,.18,.21],rim:[.24,.30,.33],pad:[.055,.075,.085],metal:[.55,.64,.67],hub:[.19,.23,.26],cap:[.10,.14,.16],accent:[.12,.76,.58],blade:[.62,.74,.75]};
function render(p,state={}){const b=canvas.getBoundingClientRect();if(!b.width||!b.height)return;const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(b.width*dpr),h=Math.round(b.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const next=JSON.stringify([p.diameter,p.hub,p.blades,p.chord,p.pitch,p.twist,p.sweep,p.thickness,p.clearance,p.shroud]);if(key!==next){for(const b of buffers)for(const name of ['v','n','i','edges'])gl.deleteBuffer(b[name]);buffers=geometry(p).map(upload);key=next;}
gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.useProgram(program);gl.uniform3f(uniforms.rotation,state.tilt||0,state.yaw||0,0);gl.uniform1f(uniforms.aspect,w/h);gl.uniform1f(uniforms.zoom,(state.zoom||1)*1.3);
for(const mesh of buffers){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.v);gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.n);gl.enableVertexAttribArray(normal);gl.vertexAttribPointer(normal,3,gl.FLOAT,false,0,0);let color=materials[mesh.material];if(mesh.material==='blade')color=state.finish==='graphite'?[.22,.28,.32]:state.finish==='mint'?[.22,.66,.52]:[.68,.77,.78];gl.uniform3fv(uniforms.color,state.wire?[.18,.43,.40]:color);gl.uniform1f(uniforms.gloss,mesh.material==='metal'?70:mesh.material==='blade'?48:25);gl.uniform1f(uniforms.spin,mesh.rotor?state.phase||0:0);gl.uniform1f(uniforms.offset,state.exploded?(mesh.rotor?.45:-.3):0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,state.wire?mesh.edges:mesh.i);gl.drawElements(state.wire?gl.LINES:gl.TRIANGLES,state.wire?mesh.edgeCount:mesh.indices.length,gl.UNSIGNED_SHORT,0);}
}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();key='';});canvas.addEventListener('webglcontextrestored',()=>location.reload());
return {render};
}
const api={geometry,surface,create};if(typeof module!=='undefined')module.exports=api;root.FanRenderer=api;
})(globalThis);
