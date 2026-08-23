function parseFilename(name){
  const base=name.replace(/\.[^.]+$/,'').replace(/[_]+/g,' ').trim();
  const parts=base.split(/\s+-\s+/);if(parts.length>=2){$('#artistName').value=parts[0];$('#trackTitle').value=parts.slice(1).join(' - ')}else $('#trackTitle').value=base;
}
$('#file').addEventListener('change',async e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  if(state.audioUrl)URL.revokeObjectURL(state.audioUrl);state.audioUrl=URL.createObjectURL(f);audio.src=state.audioUrl;audio.load();
  $('#track').textContent=f.name;$('#badge').lastChild.textContent=' AUDIO LOADED';parseFilename(f.name);
  try{await ensureAudioGraph()}catch(_){}
  analyzeFileOffline(f);
});
async function togglePlay(){
  try{if(!audio.src){$('#file').click();return}await ensureAudioGraph();if(audio.paused)await audio.play();else audio.pause()}
  catch(err){console.error(err);alert('Audio could not start. Choose the file and tap Play again.')}
}
$('#play').addEventListener('click',togglePlay);$('#fullPlay').addEventListener('click',togglePlay);
audio.addEventListener('play',()=>{$('#play').textContent='❚❚';$('#badge').lastChild.textContent=' AUDIO REACTIVE';if(state.mediaMode==='video')video.play().catch(()=>{})});
audio.addEventListener('pause',()=>{$('#play').textContent='▶';$('#badge').lastChild.textContent=' PAUSED • VISUAL ACTIVE';if(state.mediaMode==='video')video.pause()});
$('#restart').addEventListener('click',()=>{audio.currentTime=0;if(state.mediaMode==='video')video.currentTime=0});
$('#seek').addEventListener('input',()=>{if(audio.duration)audio.currentTime=(+$('#seek').value/1000)*audio.duration});
$('#mute').addEventListener('click',()=>{audio.muted=!audio.muted;$('#mute').textContent=audio.muted?'🔇':'🔊'});
function updateClock(){const d=audio.duration||0,t=audio.currentTime||0;$('#time').textContent=`${fmt(t)} / ${fmt(d)}`;if(d&&!$('#seek').matches(':active'))$('#seek').value=Math.round(t/d*1000);requestAnimationFrame(updateClock)}requestAnimationFrame(updateClock);
function hexRgb(hex){const n=parseInt((hex||'#000000').slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255]}
function rgbHex(r,g,b){return '#'+[r,g,b].map(x=>clamp(Math.round(x),0,255).toString(16).padStart(2,'0')).join('')}
function blendHex(a,b,t){const A=hexRgb(a),B=hexRgb(b);return rgbHex(lerp(A[0],B[0],t),lerp(A[1],B[1],t),lerp(A[2],B[2],t))}
function luminance(hex){const [r,g,b]=hexRgb(hex).map(x=>x/255);return .2126*r+.7152*g+.0722*b}
function setPalette(name,record=true){const p=palettes[name]||palettes.neon;state.palette=name;$('#fg').value=p.fg;$('#bg').value=p.bg;$$('.palette').forEach(b=>b.classList.toggle('active',b.dataset.pal===name));if(record)recordChoice('palette')}
function currentColors(beat,semantic){const p=palettes[state.palette]||palettes.neon,userFg=$('#fg').value,userBg=$('#bg').value,cr=+$('#colorReact').value/100,cb=+$('#colorBeat').value/100,bgBeat=+$('#bgBeat').value/100;let fg=blendHex(userFg,p.accent,clamp((state.high*.35+beat.punch*.32)*cr*cb,0,.75));let bg=blendHex(userBg,p.accent,clamp(beat.punch*bgBeat*.18,0,.28));if(semantic){if(semantic.warm)fg=blendHex(fg,'#ff5628',semantic.warm*.32);if(semantic.cool)fg=blendHex(fg,'#4cc9ff',semantic.cool*.32);if(semantic.romantic)fg=blendHex(fg,'#ff5cb8',semantic.romantic*.32);if(semantic.tense)bg=blendHex(bg,'#24000a',semantic.tense*.22)}if(Math.abs(luminance(fg)-luminance(bg))<.12)fg=luminance(bg)<.5?'#ffffff':'#000000';return {fg,bg,accent:p.accent}}
function seeded(n){let x=(+$('#seed').value||482716)+n*374761393;x=(x^(x>>13))*1274126177;return ((x^(x>>16))>>>0)/4294967295}
function drawRing(cx,cy,s,rot){ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);ctx.beginPath();ctx.arc(0,0,s,0,Math.PI*2);ctx.lineWidth=Math.max(2,s*.05);ctx.stroke();ctx.beginPath();ctx.arc(0,0,s*.58,0,Math.PI*2);ctx.lineWidth=Math.max(1,s*.012);ctx.stroke();ctx.restore()}
function drawCircle(cx,cy,s){ctx.beginPath();ctx.arc(cx,cy,s,0,Math.PI*2);ctx.fill()}
function drawPolygon(cx,cy,s,n,rot,fill=false){ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);ctx.beginPath();for(let i=0;i<n;i++){const a=-Math.PI/2+i*Math.PI*2/n,x=Math.cos(a)*s,y=Math.sin(a)*s;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.lineWidth=Math.max(2,s*.04);fill?ctx.fill():ctx.stroke();ctx.restore()}
function drawStar(cx,cy,s,rot){ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);ctx.beginPath();for(let i=0;i<10;i++){const r=i%2?s*.45:s,a=-Math.PI/2+i*Math.PI/5,x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.lineWidth=Math.max(2,s*.035);ctx.stroke();ctx.restore()}
function drawWave(w,h,amp,phase){ctx.beginPath();const step=Math.max(2,w/190);for(let x=0;x<=w;x+=step){const y=h/2+Math.sin(x/w*Math.PI*4+phase)*amp+Math.sin(x/w*Math.PI*11-phase*.5)*amp*.24;x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.lineWidth=Math.max(2,w/250);ctx.stroke()}
function drawSpiral(cx,cy,s,phase){ctx.beginPath();for(let i=0;i<320;i++){const q=i/319,t=q*Math.PI*8,r=s*q,a=t+phase,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.lineWidth=Math.max(2,s/65);ctx.stroke()}
function drawParticles(cx,cy,s,phase,energy,detail){const count=Math.round(45+detail*1.4);for(let i=0;i<count;i++){const a=i*2.399963+phase*.12,r=s*Math.sqrt((i+.5)/count)*(1+energy*.26*Math.sin(i*.7+phase)),x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;ctx.beginPath();ctx.arc(x,y,1.2+(i%11===0?2:0)+energy*1.8,0,Math.PI*2);ctx.fill()}}
function drawGrid(w,h,phase,beat){ctx.save();ctx.translate(w/2,h*.58);ctx.lineWidth=Math.max(1,w/700);for(let i=-9;i<=9;i++){ctx.beginPath();ctx.moveTo(i*w*.055,0);ctx.lineTo(i*w*.18,-h*.55);ctx.stroke()}for(let j=0;j<14;j++){const q=j/13,y=-Math.pow(q,1.75)*h*.55*(1+beat*.06);ctx.beginPath();ctx.moveTo(-w*.9,y);ctx.lineTo(w*.9,y);ctx.stroke()}ctx.restore()}
function drawBlob(cx,cy,s,phase,chaos){ctx.beginPath();const n=70;for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,r=s*(1+.10*Math.sin(a*3+phase)+chaos*.14*Math.sin(a*7-phase*1.3)),x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.lineWidth=Math.max(2,s*.035);ctx.stroke()}
function drawSphere(cx,cy,s,rot){ctx.save();ctx.translate(cx,cy);ctx.rotate(rot*.25);ctx.beginPath();ctx.arc(0,0,s,0,Math.PI*2);ctx.stroke();for(let i=-3;i<=3;i++){const q=i/4,ry=s*Math.sqrt(Math.max(0,1-q*q));ctx.beginPath();ctx.ellipse(0,q*s,ry,s*.12,0,0,Math.PI*2);ctx.stroke()}for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(0,0,s*.22,s,(i/5)*Math.PI,0,Math.PI*2);ctx.stroke()}ctx.restore()}
function drawCube(cx,cy,s,rot){const pts=[];for(let z of [-1,1])for(let y of [-1,1])for(let x of [-1,1]){let X=x,Y=y,Z=z;const ca=Math.cos(rot),sa=Math.sin(rot),cb=Math.cos(rot*.7),sb=Math.sin(rot*.7);let x1=X*ca-Z*sa,z1=X*sa+Z*ca,y1=Y*cb-z1*sb,z2=Y*sb+z1*cb;const p=1/(2.8-z2*.35);pts.push([cx+x1*s*p,cy+y1*s*p])}const edges=[[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];ctx.beginPath();for(const [a,b] of edges){ctx.moveTo(...pts[a]);ctx.lineTo(...pts[b])}ctx.lineWidth=Math.max(2,s*.025);ctx.stroke()}
function drawTorus(cx,cy,s,rot){ctx.save();ctx.translate(cx,cy);ctx.rotate(rot*.3);for(let i=0;i<18;i++){const a=i/18*Math.PI*2,r=s*(.56+.13*Math.sin(a*2+rot));ctx.beginPath();ctx.ellipse(Math.cos(a)*s*.12,Math.sin(a)*s*.10,r,s*.30,Math.sin(a)*.5,0,Math.PI*2);ctx.globalAlpha=.12+i/18*.035;ctx.stroke()}ctx.globalAlpha=1;ctx.restore()}
function drawTunnel(cx,cy,s,phase,beat){for(let i=0;i<14;i++){const q=i/13,scale=Math.pow(q,1.65),r=s*(.12+scale*1.45)*(1+beat*.08*Math.sin(i+phase));ctx.globalAlpha=.15+.7*q;drawPolygon(cx+Math.sin(phase*.3+i*.2)*s*.08,cy+Math.cos(phase*.25+i*.18)*s*.06,r,4,phase*.12+i*.07)}ctx.globalAlpha=1}
function drawLasers(cx,cy,s,phase,beat){ctx.save();ctx.translate(cx,cy);ctx.rotate(phase*.12);const n=20;for(let i=0;i<n;i++){const a=i/n*Math.PI*2+(i%2)*.08*Math.sin(phase);ctx.globalAlpha=.15+(i%3)*.22+beat*.2;ctx.beginPath();ctx.moveTo(Math.cos(a)*s*.25,Math.sin(a)*s*.25);ctx.lineTo(Math.cos(a)*s*(1.4+beat*.35),Math.sin(a)*s*(1.4+beat*.35));ctx.stroke()}ctx.globalAlpha=1;ctx.restore()}
function drawKinetic(cx,cy,s,beat){const info=currentLyricInfo(),text=(info&&info.text)||($('#customChars').value||'ASCII PULSE');ctx.save();ctx.translate(cx,cy);const sc=1+beat*.16*(+$('#lyricReact').value/100);ctx.scale(sc,sc);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${Math.max(28,s*.34)}px system-ui,-apple-system,sans-serif`;ctx.globalAlpha=.18+.38*state.energy;ctx.fillText(text.slice(0,40),0,0);ctx.restore();ctx.globalAlpha=1}