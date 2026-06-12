const fs = require('fs');
let md = fs.readFileSync(process.argv[2], 'utf8');

// --- 웹 표시용 정리: YAML 프론트매터 제거 + 옵시디언 콜아웃 변환 ---
function clean(s) {
  s = s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ''); // 프론트매터 제거
  const emoji = { note:'📝', warning:'⚠️', tip:'💡', summary:'📌', example:'📄',
                  quote:'❝', faq:'❓', todo:'✅', question:'❔' };
  s = s.replace(/^>\s*\[!(\w+)\][+-]?\s*(.*)$/gm, (m, type, title) => {
    const e = emoji[type.toLowerCase()] || '';
    const label = (title || '').trim() || type;
    return '> **' + (e ? e + ' ' : '') + label + '**';
  });
  return s;
}
md = clean(md);

const lines = md.split('\n');

const home = [];
const sections = [];
let pending = [];
let inPending = false;
let current = null;

for (const line of lines) {
  if (line.startsWith('## ')) {
    if (current) sections.push(current);
    current = { title: line.slice(3).trim(), body: pending.concat([line]) };
    pending = [];
    inPending = false;
  } else if (line.startsWith('# PART')) {
    inPending = true;
    pending.push(line);
  } else if (inPending) {
    pending.push(line);
  } else if (current) {
    current.body.push(line);
  } else {
    home.push(line);
  }
}
if (current) sections.push(current);
// leftover pending (PART 4 체크리스트, no ## under it)
if (pending.length) {
  const t = pending.find(l => l.startsWith('# PART')) || '# 참고';
  sections.push({ title: t.replace(/^#\s*PART\s*\d+\.?\s*/, '').trim() || '참고', body: pending });
}

function groupOf(t) {
  if (t.startsWith('대본 A')) return '강의형 대본';
  if (t.startsWith('대본 B')) return '인터뷰형 대본';
  if (/^A-\d/.test(t)) return '화이트보드 기획';
  return '참고';
}
function labelOf(t) {
  // 짧은 메뉴 라벨
  let s = t.replace(/^대본\s*/, '');
  s = s.replace(/\s*\(목표[^)]*\)/, '').replace(/\s*\(본편[^)]*\)/, '');
  s = s.replace(/\s*—\s*화이트보드 단독$/, '');
  return s.trim();
}

const pages = sections
  .map((s) => ({
    group: groupOf(s.title),
    label: labelOf(s.title),
    md: s.body.join('\n').trim(),
  }))
  .filter((p) => p.group !== '화이트보드 기획')   // 화이트보드 프롬프트 제외 — 대본만
  .map((p, i) => ({ id: 'p' + i, ...p }));
// 공유용 홈: 내부 작업메모(작업 노트/공통 주의)는 제외하고 깔끔한 인트로만
const homeMd = [
  '# 폰키호테 방학점 — 촬영 대본',
  '',
  '유튜브 콘텐츠 **6편** · 강의형 3 / 인터뷰형 3',
  '',
  '아래에서 보고 싶은 편을 누르세요.',
].join('\n');

const data = { home: homeMd, pages };
const json = JSON.stringify(data).replace(/<\//g, '<\\/');

const tpl = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>폰키호테 방학점 — 콘텐츠 제작 패키지</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
*{box-sizing:border-box;}
body{margin:0;font-family:'Noto Sans KR',sans-serif;color:#1b1d22;background:#fbfaf7;
  line-height:1.8;font-size:16px;-webkit-text-size-adjust:100%;}
.top{position:sticky;top:0;background:#1b1d22;color:#fff;padding:13px 18px;font-weight:900;
  display:flex;align-items:center;gap:10px;z-index:10;}
.top button{background:none;border:1px solid #555;color:#fff;border-radius:7px;padding:5px 11px;
  font-size:13px;cursor:pointer;font-family:inherit;}
.top button:hover{background:#333;}
.top .ttl{font-size:15px;}
.wrap{max-width:720px;margin:0 auto;padding:22px 18px 90px;}
h1{font-size:24px;line-height:1.4;font-weight:900;margin:.1em 0 .6em;}
h2{font-size:20px;font-weight:900;margin:1.4em 0 .5em;}
h3{font-size:16.5px;font-weight:700;margin:1.3em 0 .3em;}
p{margin:.5em 0;}
hr{border:0;border-top:1px solid #e2e0d6;margin:1.4em 0;}
ul,ol{padding-left:1.25em;}
li{margin:.2em 0;}
table{border-collapse:collapse;width:100%;margin:1em 0;font-size:14px;}
th,td{border:1px solid #e2e0d6;padding:7px 9px;text-align:left;}
th{background:#f1f0ea;font-weight:700;}
code{background:#f1f0ea;padding:1px 5px;border-radius:4px;font-size:.9em;}
pre{background:#22242b;color:#e9e6dd;border-radius:9px;padding:13px 15px;overflow-x:auto;
  font-family:'D2Coding',Consolas,monospace;font-size:12px;line-height:1.45;}
pre code{background:none;color:inherit;padding:0;}
blockquote{margin:1em 0;padding:10px 15px;border-left:4px solid #2557c9;background:#eef3ff;
  border-radius:0 8px 8px 0;color:#2a3550;}
blockquote p{margin:.25em 0;}
/* 홈 메뉴 */
.grouphdr{font-size:13px;font-weight:700;color:#8a8e96;letter-spacing:.04em;margin:24px 2px 9px;
  border-bottom:1px solid #e2e0d6;padding-bottom:6px;}
.menu{display:flex;flex-direction:column;gap:9px;}
.item{display:block;width:100%;text-align:left;background:#fff;border:1px solid #d8d6cc;
  border-radius:10px;padding:14px 16px;font-size:15.5px;font-weight:500;color:#1b1d22;
  cursor:pointer;font-family:inherit;line-height:1.4;}
.item:hover{border-color:#1b1d22;background:#fafaf7;}
.item .arr{float:right;color:#b5b2a6;}
.nav-bottom{margin-top:34px;display:flex;justify-content:space-between;gap:10px;}
.nav-bottom button{flex:1;background:#fff;border:1px solid #d8d6cc;border-radius:9px;padding:11px;
  font-size:14px;cursor:pointer;font-family:inherit;color:#1b1d22;}
.nav-bottom button:hover{border-color:#1b1d22;}
.nav-bottom button:disabled{opacity:.35;cursor:default;}
.foot{text-align:center;color:#a7a89f;font-size:12px;margin-top:34px;}
</style>
</head>
<body>
<div class="top"><button id="homebtn">☰ 목차</button><span class="ttl">폰키호테 방학점</span></div>
<div class="wrap"><div id="view"></div></div>
<script id="data" type="application/json">__DATA__</script>
<script>
marked.setOptions({breaks:true,gfm:true});
var D = JSON.parse(document.getElementById('data').textContent);
var view = document.getElementById('view');
function md2html(s){return marked.parse(s);}
function renderHome(){
  var groups = {};
  D.pages.forEach(function(p,i){ (groups[p.group]=groups[p.group]||[]).push({p:p,i:i}); });
  var order = ['화이트보드 기획','강의형 대본','인터뷰형 대본','참고'];
  var icon = {'화이트보드 기획':'🖼️','강의형 대본':'📋','인터뷰형 대본':'🎙️','참고':'✅'};
  var html = md2html(D.home);
  order.forEach(function(g){
    if(!groups[g]) return;
    html += '<div class="grouphdr">'+(icon[g]||'')+' '+g+'</div><div class="menu">';
    groups[g].forEach(function(o){
      html += '<button class="item" onclick="go('+o.i+')">'+o.p.label+'<span class="arr">›</span></button>';
    });
    html += '</div>';
  });
  html += '<div class="foot">폰키호테 방학점 · 촬영용 대본</div>';
  view.innerHTML = html;
  document.title = '폰키호테 방학점 — 콘텐츠 제작 패키지';
  window.scrollTo(0,0);
}
function renderPage(i){
  var p = D.pages[i];
  var html = md2html(p.md);
  html += '<div class="nav-bottom">';
  html += '<button onclick="go('+(i-1)+')" '+(i<=0?'disabled':'')+'>‹ 이전</button>';
  html += '<button onclick="home()">목차</button>';
  html += '<button onclick="go('+(i+1)+')" '+(i>=D.pages.length-1?'disabled':'')+'>다음 ›</button>';
  html += '</div>';
  view.innerHTML = html;
  window.scrollTo(0,0);
}
function go(i){ if(i<0||i>=D.pages.length){return;} location.hash='#'+D.pages[i].id; }
function home(){ location.hash=''; }
function route(){
  var h = location.hash.replace('#','');
  if(!h){ renderHome(); return; }
  var idx = D.pages.findIndex(function(p){return p.id===h;});
  if(idx>=0) renderPage(idx); else renderHome();
}
document.getElementById('homebtn').onclick = home;
window.addEventListener('hashchange', route);
route();
</script>
</body>
</html>`;
fs.writeFileSync(process.argv[3], tpl.replace('__DATA__', json));
console.log('built', process.argv[3], '| pages:', pages.length);
pages.forEach((p,i)=>console.log(' ', i, '['+p.group+']', p.label));
