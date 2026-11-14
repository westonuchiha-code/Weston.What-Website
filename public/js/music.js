/* ==========================================================================
   westonwhat.com :: music.js
   The front-page music player. The soundtrack ("FUNKZONE ALPHA") is not an audio
   file: it is synthesized live in the browser with the Web Audio API (three square
   waves and a noise channel), so it costs almost nothing to host.
   It lives on the hidden /basement/ page and never starts by itself: the visitor
   presses PLAY. The volume setting is saved in this browser only (localStorage).
   ========================================================================== */
(() => {
'use strict';
const root = document.querySelector('[data-music]');
const AC = window.AudioContext || window.webkitAudioContext;
if (!root || !AC) return;

const PC={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
const NM=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const midiOf=n=>{const m=/^([A-G][#b]?)(-?\d)$/.exec(n);return m?(+m[2]+1)*12+PC[m[1]]:null;};
const hz=m=>440*Math.pow(2,(m-69)/12);
const nameOf=m=>NM[m%12]+(Math.floor(m/12)-1);

const QUAL={
  '':[0,4,7],'m':[0,3,7],'7':[0,4,7,10],'m7':[0,3,7,10],'maj7':[0,4,7,11],
  '9':[0,4,10,14],'m9':[0,3,10,14],'maj9':[0,4,11,14],'13':[0,4,10,21],
  '7#9':[0,4,10,15],'7sus4':[0,5,7,10],'m7b5':[0,3,6,10],'dim7':[0,3,6,9],'6':[0,4,7,9]
};
const chordOf=s=>{const m=/^([A-G][#b]?)(.*)$/.exec(s);return{root:PC[m[1]],ivs:QUAL[m[2]]||QUAL['']};};

/* scale degrees for bass riffs — riffs adapt to each bar's chord root */
const DEG={'1':0,'b2':1,'2':2,'b3':3,'3':4,'4':5,'#4':6,'5':7,'b6':8,'6':9,'b7':10,'7':11,
           '8':12,'b9':13,'9':14,'b10':15,'10':16,'11':17,'12':19};
const BAR=16;

/* token: PITCH[:DUR][flags]  ·  PITCH may be "A2" or "A2/C3" (slide) or a degree "1","b7","5/b7"
   flags: g = ghost (quiet, muted)   a = accent   . = staccato                              */
function parseLine(str, degreeBase){
  const out=[]; let t=0;
  for(const tok of str.trim().split(/\s+/)){
    const [ps,ds]=tok.split(':');
    let d=parseInt(ds,10)||1;
    const flags=(ds||'').replace(/[0-9]/g,'');
    if(t+d>BAR) d=BAR-t;
    if(d<=0) break;
    if(ps==='r'){ out.push({m:null,d}); }
    else{
      const parts=ps.split('/');
      const conv=p=> degreeBase==null ? midiOf(p) : degreeBase+DEG[p];
      out.push({m:conv(parts[0]), slide: parts[1]!=null?conv(parts[1]):null, d,
                ghost:flags.includes('g'), accent:flags.includes('a'), stac:flags.includes('.')});
    }
    t+=d;
  }
  if(t<BAR) out.push({m:null,d:BAR-t});
  return out;
}

/* funk bass riffs, written in scale degrees, 2 bars each */
const RIFFS={
  strut:[ '1:2 r:2 1:2 1:1g 8:1 r:2 b7:2 5:2 1:2',
          '1:2 1:1g b3:1 4:2 r:2 4:1 b3:1 1:2 b7:2 1:2' ],
  runner:['1:1 1:1g 1:2 8:2 r:1 b7:1 5:2 4:2 b3:2 1:2',
          '1:2 8:2 b7:2 5:2 4:2 b3:2 2:2 1:2' ],
  slap:[  '1:2 1/8:2 r:2 8:1 b7:1 5:2 r:2 4:2 1:2',
          '1:1 1:1g r:2 8:2 5:2 4:2 b3:2 1:2 r:2' ],
  sludge:['1:4 r:2 1:2 b7:4 1:4',
          'b3:4 1:2 r:2 b7:2 5:2 1:4' ],
  drive:[ '1:2 1:2 1:2 8:2 b7:2 8:2 5:2 1:2',
          '1:2 1:2 b3:2 4:2 b3:2 1:2 b7:2 1:2' ],
  glide:[ '1:4 r:2 5:2 8:4 b7:4',
          '6:4 5:4 4:4 1/5:4' ],
  bump:[  '1:2 r:2 1:2 8:2 5:4 r:2 b7:2',
          '1:2 r:2 1:1 1:1g 8:2 b7:2 5:2 4:2 1:2' ]
};
/* clav / stab rhythm masks */
const MASKS={
  chank:['--x--x--x-x--x--','--x--x--x-x-x-x-'],
  chop: ['x-xx-x-xx-xx-x-x','x-xx-x-xx-x-xx-x'],
  push: ['--x---x---x---x-','--x---x---x-x-x-'],
  air:  ['----x-------x---','----x-------x-x-'],
  hits: ['x--x--x---x-x---','x--x--x---x-x-x-']
};
/* drum grids: k kick · s snare · h hat · H accent hat · o open hat · p clap · r rim */
const KITS={
  funk:  ['kHhhsHhkhHkhsHho','kHhhsHhkhHkhsHrs'],
  tight: ['kHh-sHhkk-hhsHh-','kHh-sHhkk-hhsHss'],
  fast:  ['kHhksHhkkHhhsHhk','kHhksHhkkHhhsHss'],
  lazy:  ['k--hs---k-khs---','k--hs---k-khs-hh'],
  smooth:['k-h-s-h-k-hhs-h-','k-h-s-h-k-hhs-ph'],
  party: ['kHhpsHhkkHhpsHho','kHhpsHhkkHhpsrss']
};

/* ==========================================================
   THE TAPE — 10 original cuts
   ========================================================== */
const TRACKS=[
{ bpm:104, swing:.16, key:'E minor',
  chords:['E7#9','E7#9','A9','A9','C9','B7#9','E7#9','E7#9'],
  lead:{vol:.20,oct:0,bars:[
    'r:4 E5:2 G5:2 B5:2 D6:4 r:2','r:4 G5:2 F#5:2 E5:8',
    'A5:2 r:2 C6:2 r:2 E6:4 D6:4','C6:2 B5:2 A5:8 r:4',
    'G5:2 A5:2 C6:2 D6:2 E6:8','D6:2 C6:2 B5:2 A5:2 G5:8',
    'E5:2 G5:2 A5:2 B5:2 D6:4 B5:4','E6:12 r:4']},
  clav:{mask:'hits',oct:4,vol:.10,len:2},
  bass:{riff:'strut',oct:2,vol:.30}, kit:'funk'
},
{ bpm:108, swing:.18, key:'D dorian',
  chords:['Dm9','Dm9','Dm9','Dm9','Gm9','Gm9','Dm9','Dm9','Bb9','Bb9','A7#9','A7#9','Dm9','Gm9','A7#9','Dm9'],
  lead:{vol:.20,bars:[
    'r:4 D5:2 F5:2 G5:2 A5:4 r:2','C6:2 A5:2 G5:2 F5:2 D5:8',
    'r:2 F5:2 G5:2 A5:2 C6:4 A5:4','G5:2 F5:2 D5:4 r:4 A4:4',
    'G5:2 Bb5:2 C6:2 D6:2 F6:4 D6:4','C6:2 Bb5:2 A5:2 G5:2 D5:8',
    'A5:4 F5:2 E5:2 D5:8','r:8 D5:2 F5:2 A5:4',
    'Bb5:2 D6:2 F6:2 D6:2 C6:8','A5:2 Bb5:2 C6:4 D6:4 F6:4',
    'E6:2 C6:2 A5:2 G5:2 C#6:4 E6:4','A5:8 r:4 E5:4',
    'D6:2 C6:2 A5:2 F5:2 D5:8','G5:2 A5:2 Bb5:2 C6:2 D6:8',
    'C#6:4 E6:4 G6:4 E6:4','D6:12 r:4']},
  clav:{mask:'chank',oct:4,vol:.10,len:2},
  bass:{riff:'runner',oct:2,vol:.31}, kit:'funk'
},
{ bpm:116, swing:.2, key:'F major',
  chords:['Fmaj9','Bb9','Fmaj9','Bb9','Gm9','C13','Fmaj9','D7#9',
          'Gm9','C13','Am7','D7#9','Gm9','C13','Fmaj9','Fmaj9'],
  lead:{vol:.20,bars:[
    'A5:2 C6:2 E6:4 D6:4 C6:4','D6:2 C6:2 A5:2 F5:2 Bb5:8',
    'C6:2 A5:2 G5:2 F5:2 A5:8','F6:4 D6:4 C6:4 A5:4',
    'G5:2 Bb5:2 D6:2 F6:2 A6:8','G6:4 E6:4 C6:4 Bb5:4',
    'A5:4 C6:4 F6:8','F6:2 E6:2 D6:2 C6:2 A5:8',
    'Bb5:2 C6:2 D6:2 F6:2 G6:8','E6:4 G6:4 A6:4 G6:4',
    'E6:2 C6:2 A5:2 G5:2 E5:8','F#5:4 A5:4 C6:4 F6:4',
    'D6:4 Bb5:4 G5:8','A5:2 Bb5:2 C6:2 E6:2 G6:8',
    'F6:4 E6:4 C6:4 A5:4','F6:12 r:4']},
  clav:{mask:'chop',oct:4,vol:.095,len:1},
  bass:{riff:'slap',oct:2,vol:.31}, kit:'party'
},
{ bpm:92, swing:.22, key:'G major',
  chords:['Gmaj9','Cmaj9','Am9','D13','Bm7','Em9','Am9','D13',
          'Gmaj9','Cmaj9','F#m7b5','B7#9','Em9','A9','D13','Gmaj9'],
  lead:{vol:.19,bars:[
    'B5:4 D6:4 A5:8','G5:4 E6:4 D6:8','C6:4 B5:4 A5:8','F#5:4 A5:4 D6:8',
    'D6:8 B5:8','E6:4 D6:4 B5:8','C6:4 E6:4 G6:8','F#6:4 E6:4 A5:8',
    'G6:4 F#6:4 D6:8','E6:4 D6:4 B5:8','C6:4 A5:4 F#5:8','D#6:4 F#6:4 B5:8',
    'E6:4 G6:4 B5:8','C#6:4 E6:4 G5:8','B5:4 A5:4 F#5:8','G5:12 r:4']},
  clav:{mask:'air',oct:4,vol:.085,len:4},
  bass:{riff:'glide',oct:2,vol:.28}, kit:'smooth'
},
{ bpm:88, swing:.12, key:'C minor',
  chords:['Cm9','Cm9','Ab9','Ab9','Cm9','Cm9','G7#9','G7#9',
          'Fm9','Fm9','Cm9','Cm9','Ab9','G7#9','Cm9','Cm9'],
  lead:{vol:.19,bars:[
    'C5:4 r:4 Eb5:4 C5:4','G5:8 F5:4 Eb5:4','Ab5:8 G5:8','Eb5:4 C5:4 Ab4:8',
    'C5:2 Eb5:2 G5:4 Bb5:8','Bb5:4 G5:4 Eb5:8','B4:4 D5:4 F5:4 Bb5:4','G5:8 r:4 D5:4',
    'F5:4 Ab5:4 C6:8','Eb6:4 C6:4 Ab5:8','G5:4 Eb5:4 C5:8','C6:8 Bb5:4 G5:4',
    'Ab5:4 Bb5:4 Gb5:8','Bb5:4 B5:4 D6:8','C6:4 Bb5:4 G5:4 Eb5:4','C5:12 r:4']},
  clav:{mask:'push',oct:3,vol:.085,len:2},
  bass:{riff:'sludge',oct:1,vol:.32}, kit:'lazy'
},
{ bpm:128, swing:.14, key:'A minor',
  chords:['Am7','Am7','D9','D9','Am7','Am7','F9','E7#9',
          'Am7','C9','D9','F9','Am7','E7#9','Am7','Am7'],
  lead:{vol:.21,bars:[
    'A5:2 C6:2 D6:1 E6:1 G6:2 E6:2 D6:4 C6:2','A5:2 G5:2 E5:2 D5:2 C5:4 A4:4',
    'D5:2 F#5:2 A5:2 C6:2 E6:4 D6:4','C6:2 A5:2 F#5:2 E5:2 D5:8',
    'E6:2 G6:2 A6:4 G6:2 E6:2 D6:4','C6:2 D6:2 E6:2 C6:2 A5:8',
    'F5:2 A5:2 C6:2 Eb6:2 F6:8','G5:2 G#5:2 B5:2 E6:2 D6:8',
    'A5:4 E6:4 A6:8','G6:2 E6:2 C6:2 Bb5:2 G5:8',
    'A5:2 C6:2 D6:2 F#6:2 E6:8','F6:4 Eb6:4 C6:4 A5:4',
    'A5:2 C6:2 E6:2 G6:2 A6:8','G#5:4 B5:4 E6:8',
    'A5:2 G5:2 E5:2 D5:2 C5:2 A4:2 E5:4','A5:12 r:4']},
  clav:{mask:'chop',oct:4,vol:.10,len:1},
  bass:{riff:'runner',oct:2,vol:.32}, kit:'fast'
},
{ bpm:138, swing:.08, key:'B minor',
  chords:['Bm9','Bm9','G9','G9','F#7#9','F#7#9','Bm9','Bm9',
          'Em9','Em9','G9','A9','Bm9','F#7#9','Bm9','Bm9'],
  lead:{vol:.21,bars:[
    'B5:2 D6:2 F#6:2 D6:2 B5:4 A5:4','F#5:2 A5:2 B5:2 D6:2 C#6:8',
    'G5:2 B5:2 D6:2 F6:2 A6:8','F6:2 D6:2 B5:2 G5:2 D5:8',
    'A#5:2 C#6:2 E6:2 A5:2 F#6:8','E6:2 C#6:2 A#5:2 F#5:2 C#6:8',
    'B5:4 D6:4 F#6:4 A6:4','B6:8 F#6:4 D6:4',
    'E6:2 G6:2 B6:2 G6:2 F#6:8','D6:4 B5:4 G5:8',
    'F6:4 D6:4 B5:4 G5:4','G6:4 E6:4 C#6:4 A5:4',
    'B5:2 F#6:2 B6:4 A6:4 F#6:4','A#5:4 C#6:4 F#6:8',
    'D6:2 C#6:2 B5:2 A5:2 F#5:8','B5:12 r:4']},
  clav:{mask:'chop',oct:4,vol:.105,len:1},
  bass:{riff:'drive',oct:1,vol:.33}, kit:'fast'
},
{ bpm:112, swing:.18, key:'A major',
  chords:['Amaj9','Amaj9','F#m9','F#m9','Bm9','E13','Amaj9','Amaj9',
          'Dmaj9','C#m9','Bm9','E13','Amaj9','F#m9','E13','Amaj9'],
  lead:{vol:.20,bars:[
    'E5:4 A5:4 C#6:8','B5:4 C#6:4 E6:8','A5:4 F#5:4 C#5:8','E5:4 A5:4 F#5:8',
    'B5:4 D6:4 F#6:8','E6:4 C#6:4 B5:8','A5:4 C#6:4 E6:8','A6:12 r:4',
    'F#6:4 E6:4 D6:8','C#6:4 E6:4 G#6:8','F#6:4 D6:4 B5:8','C#6:4 B5:4 G#5:8',
    'A5:4 E6:4 A6:8','G#6:4 F#6:4 C#6:8','B5:4 D6:4 E6:8','A5:12 r:4']},
  clav:{mask:'push',oct:4,vol:.09,len:2},
  bass:{riff:'bump',oct:2,vol:.29}, kit:'smooth'
},
{ bpm:76, swing:.14, key:'F minor',
  chords:['Fm9','Fm9','Db9','Db9','Cm7','Cm7','Fm9','Fm9'],
  lead:{vol:.19,bars:[
    'F5:8 Ab5:8','G5:12 F5:4','Db5:8 F5:8','Eb5:12 C5:4',
    'C5:8 Eb5:8','G5:12 Eb5:4','Ab5:8 F5:8','F5:12 r:4']},
  clav:{mask:'air',oct:3,vol:.08,len:4},
  bass:{riff:'sludge',oct:2,vol:.28}, kit:'lazy'
},
{ bpm:124, swing:.16, key:'C mixolydian',
  chords:['C9','F9','C9','C9'],
  lead:{vol:.23,bars:[
    'r:2 G5:1 A5:1 C6:2 r:2 E6:4 G6:4','F6:2 Eb6:2 C6:2 A5:2 F5:8',
    'G5:2 Bb5:2 C6:2 E6:2 G6:8','C6:16']},
  clav:{mask:'hits',oct:4,vol:.11,len:2},
  bass:{riff:'strut',oct:2,vol:.32}, kit:'party'
}
];
const SIDE_SPLIT=5;

/* ---- compile a track into a step-indexed event map ---- */
function build(tr){
  const bars=tr.chords.length, steps=bars*BAR;
  const map=Array.from({length:steps},()=>[]);
  const put=(s,e)=>{ if(s<steps) map[s].push(e); };

  for(let b=0;b<bars;b++){
    const off=b*BAR, {root,ivs}=chordOf(tr.chords[b]);

    let t=off;
    for(const n of parseLine(tr.lead.bars[b%tr.lead.bars.length],null)){
      if(n.m!=null) put(t,{ch:0,type:'sq',m:n.m,slide:n.slide,d:n.d,vol:tr.lead.vol,vib:16,bus:'lead'});
      t+=n.d;
    }

    const mask=MASKS[tr.clav.mask][b%MASKS[tr.clav.mask].length];
    const notes=ivs.slice(0,4).map(i=>(tr.clav.oct+1)*12+root+i);
    for(let i=0;i<BAR;i++) if(mask[i]==='x')
      put(off+i,{ch:1,type:'stab',notes,d:tr.clav.len,vol:tr.clav.vol,bus:'clav'});

    t=off;
    const riff=RIFFS[tr.bass.riff][b%RIFFS[tr.bass.riff].length];
    for(const n of parseLine(riff,(tr.bass.oct+1)*12+root)){
      if(n.m!=null) put(t,{ch:2,type:'sq',m:n.m,slide:n.slide,d:n.d,
        vol:tr.bass.vol*(n.ghost?.34:1),ghost:n.ghost,vib:0,bus:'bass'});
      t+=n.d;
    }

    const kit=KITS[tr.kit][b%KITS[tr.kit].length];
    for(let i=0;i<BAR;i++){ const c=kit[i]; if(c&&c!=='-') put(off+i,{ch:3,type:'drum',kind:c,bus:'drum'}); }
  }
  return {map,steps,bars,spb:60/tr.bpm/4,swing:tr.swing};
}
const B=TRACKS.map(build);

/* ==========================================================
   PSG-FLAVOURED SYNTH: 3 squares + noise
   ========================================================== */
let ctx=null,G=null,nb=null;
const sqCache=new WeakMap();
function square(c){
  if(sqCache.has(c)) return sqCache.get(c);
  const n=20,re=new Float32Array(n),im=new Float32Array(n);
  for(let i=1;i<n;i+=2) re[i]=4/(i*Math.PI);
  const w=c.createPeriodicWave(re,im); sqCache.set(c,w); return w;
}
function noiseBuf(c){
  const len=Math.floor(c.sampleRate*1.2),b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
  return b;
}
function buildGraph(c,live){
  const master=c.createGain(); master.gain.value=.85;
  const comp=c.createDynamicsCompressor();
  comp.threshold.value=-13; comp.ratio.value=4; comp.attack.value=.003; comp.release.value=.16;
  comp.connect(master); master.connect(c.destination);

  const lead=c.createGain();
  const leadLP=c.createBiquadFilter(); leadLP.type='lowpass'; leadLP.frequency.value=9000;
  lead.connect(leadLP); leadLP.connect(comp);

  /* clav runs through a slow auto-wah — the one liberty taken with the chip */
  const clav=c.createGain();
  const wah=c.createBiquadFilter(); wah.type='bandpass'; wah.frequency.value=900; wah.Q.value=4.5;
  const wahMakeup=c.createGain(); wahMakeup.gain.value=2.4;
  const lfo=c.createOscillator(); lfo.frequency.value=.24;
  const lfoAmt=c.createGain(); lfoAmt.gain.value=620;
  lfo.connect(lfoAmt); lfoAmt.connect(wah.frequency); lfo.start(0);
  clav.connect(wah); wah.connect(wahMakeup); wahMakeup.connect(comp);

  const bass=c.createGain();
  const bassLP=c.createBiquadFilter(); bassLP.type='lowpass'; bassLP.frequency.value=1500; bassLP.Q.value=1.1;
  bass.connect(bassLP); bassLP.connect(comp);

  const drum=c.createGain(); drum.connect(comp);

  /* short slap-back on lead only */
  const dly=c.createDelay(1), fb=c.createGain(), send=c.createGain();
  dly.delayTime.value=.155; fb.gain.value=.2; send.gain.value=.14;
  lead.connect(send); send.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(comp);

  let an=null;
  if(live){ an=c.createAnalyser(); an.fftSize=512; comp.connect(an); }
  return {buses:{lead,clav,bass,drum},master,an};
}

function vSquare(c,dest,t,ev,dur){
  const o=c.createOscillator(); o.setPeriodicWave(square(c));
  const f=hz(ev.m);
  o.frequency.setValueAtTime(f,t);
  if(ev.slide!=null) o.frequency.exponentialRampToValueAtTime(hz(ev.slide),t+dur*.75);
  const g=c.createGain();
  const len=ev.ghost?Math.min(dur,.055):dur;
  const rel=Math.min(.045,len*.4),a=.003;
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(ev.vol,t+a);
  g.gain.linearRampToValueAtTime(ev.vol*.68,t+a+.07);
  g.gain.setValueAtTime(ev.vol*.68,t+Math.max(a+.08,len-rel));
  g.gain.exponentialRampToValueAtTime(.0004,t+len);
  o.connect(g); g.connect(dest);
  if(ev.vib&&dur>.3&&ev.slide==null){
    const l=c.createOscillator(),la=c.createGain();
    l.frequency.value=6.1; la.gain.setValueAtTime(0,t); la.gain.setValueAtTime(0,t+.16);
    la.gain.linearRampToValueAtTime(ev.vib,t+.34);
    l.connect(la); la.connect(o.detune); l.start(t); l.stop(t+len+.02);
  }
  o.start(t); o.stop(t+len+.03);
}
/* one oscillator hopping through chord tones = the classic PSG "chord" */
function vStab(c,dest,t,ev,dur){
  const o=c.createOscillator(); o.setPeriodicWave(square(c));
  const rate=.026; let k=0;
  for(let x=0;x<dur&&k<160;x+=rate,k++) o.frequency.setValueAtTime(hz(ev.notes[k%ev.notes.length]),t+x);
  const g=c.createGain();
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(ev.vol,t+.003);
  g.gain.exponentialRampToValueAtTime(.0004,t+dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t+dur+.02);
}
function vDrum(c,dest,t,kind){
  const burst=(type,freq,Q,dur,vol,q2)=>{
    const s=c.createBufferSource(); s.buffer=(c===ctx)?nb:(c.__nb||(c.__nb=noiseBuf(c))); s.loop=true;
    const f=c.createBiquadFilter(); f.type=type; f.frequency.value=freq; if(Q)f.Q.value=Q;
    const g=c.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0004,t+dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t+dur+.02);
  };
  if(kind==='k'){
    burst('lowpass',220,0,.08,.3);
    const o=c.createOscillator(),g=c.createGain(); o.type='sine';
    o.frequency.setValueAtTime(165,t); o.frequency.exponentialRampToValueAtTime(44,t+.08);
    g.gain.setValueAtTime(.62,t); g.gain.exponentialRampToValueAtTime(.0004,t+.14);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t+.16);
  }
  else if(kind==='s'){ burst('bandpass',1750,.8,.11,.26); burst('highpass',3800,0,.06,.1); }
  else if(kind==='r'){ burst('bandpass',2600,3,.05,.15); }
  else if(kind==='p'){ burst('bandpass',1300,2.2,.03,.2); burst('bandpass',1500,2,.09,.17); }
  else if(kind==='h'){ burst('highpass',8200,0,.028,.075); }
  else if(kind==='H'){ burst('highpass',7600,0,.04,.13); }
  else { burst('highpass',6800,0,.19,.085); }
}
function fire(c,ev,t,dur,buses){
  const dest=buses[ev.bus];
  if(ev.type==='sq') vSquare(c,dest,t,ev,dur);
  else if(ev.type==='stab') vStab(c,dest,t,ev,dur);
  else vDrum(c,dest,t,ev.kind);
}
const swingOff=(s,spb,sw)=> (s%2===1? sw*spb : 0);

/* ==========================================================
   TRANSPORT + PLAYER UI
   ========================================================== */
const $ = (s) => root.querySelector(s);
const KEY_VOL = 'ww-music-vol';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const toggleBtn = $('[data-music-toggle]'), toggleLabel = $('[data-music-toggle-label]');
const volEl = $('[data-music-vol]'), titleEl = $('[data-music-title]'), subEl = $('[data-music-sub]'), statusEl = $('[data-music-status]');
const prevBtn = $('[data-music-prev]'), nextBtn = $('[data-music-next]');
const metersEl = $('[data-music-meters]');
for (let i = 0; i < 12; i++) metersEl.appendChild(document.createElement('i'));
const segs = Array.from(metersEl.children);

let on = false;            // the visitor pressed PLAY
let idx = 0, step = 0, nextT = 0, timer = null, pausedByTab = false;
const html = document.documentElement;
const still = () => html.classList.contains('reduce-motion') || (!html.classList.contains('force-motion') && matchMedia('(prefers-reduced-motion: reduce)').matches);

const savedVol = parseInt(store.get(KEY_VOL), 10);
volEl.value = Number.isFinite(savedVol) ? Math.max(0, Math.min(100, savedVol)) : 55;

function ensure() {
  if (ctx) return;
  ctx = new AC();
  nb = noiseBuf(ctx);
  G = buildGraph(ctx, true);
  G.master.gain.value = volEl.value / 100;
}
function schedule(s, t) {
  const b = B[idx];
  for (const ev of b.map[s]) fire(ctx, ev, t + swingOff(s, b.spb, b.swing), (ev.d || 1) * b.spb, G.buses);
}
function tick() {
  const look = ctx.currentTime + 0.22;
  while (nextT < look) {
    schedule(step, nextT);
    nextT += B[idx].spb; step++;
    if (step >= B[idx].steps) { step = 0; idx = (idx + 1) % TRACKS.length; paintTrack(); }
  }
}
function runScheduler(fromStart) {
  ensure();
  if (fromStart) step = 0;
  nextT = ctx.currentTime + 0.08;
  clearInterval(timer);
  timer = setInterval(tick, 25);
  tick();
  const r = ctx.resume();
  if (r && r.catch) r.catch(() => {});
}
function haltScheduler() {
  clearInterval(timer); timer = null;
  if (ctx) { const r = ctx.suspend(); if (r && r.catch) r.catch(() => {}); }
}

function paintTrack() {
  const t = TRACKS[idx];
  titleEl.textContent = 'Track ' + (idx + 1);
  subEl.textContent = t.bpm + ' BPM';
}
function paint() {
  toggleBtn.dataset.state = on ? 'on' : 'off';
  toggleBtn.setAttribute('aria-label', on ? 'Stop music' : 'Play music');
  toggleLabel.textContent = on ? 'STOP' : 'PLAY';
  statusEl.textContent = on ? 'Now playing.' : 'Press PLAY to start the music.';
}

toggleBtn.addEventListener('click', () => {
  on = !on;
  if (on) runScheduler(false); else haltScheduler();
  paint();
});
function go(delta) { idx = (idx + delta + TRACKS.length) % TRACKS.length; paintTrack(); if (on) runScheduler(true); }
prevBtn.addEventListener('click', () => go(-1));
nextBtn.addEventListener('click', () => go(1));
volEl.addEventListener('input', () => { store.set(KEY_VOL, volEl.value); if (G) G.master.gain.value = volEl.value / 100; });

/* pause while the tab is in the background (timers there are throttled and would stutter) */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (on && timer) { pausedByTab = true; haltScheduler(); } }
  else if (pausedByTab && on) { pausedByTab = false; runScheduler(false); }
});

/* level meters */
function frame() {
  requestAnimationFrame(frame);
  let lvl = 0;
  if (G && G.an && on && ctx.state === 'running' && !still()) {
    const a = new Uint8Array(G.an.fftSize); G.an.getByteTimeDomainData(a);
    for (let i = 0; i < a.length; i += 8) lvl = Math.max(lvl, Math.abs(a[i] - 128) / 128);
  }
  const lit = Math.round(lvl * segs.length);
  segs.forEach((s, i) => { s.className = i < lit ? (i > segs.length - 3 ? 'hot' : 'on') : ''; });
}

root.hidden = false;
paintTrack();
paint();
frame();
})();
