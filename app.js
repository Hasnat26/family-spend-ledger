const K='fsl-data-v1', D={
  categories:{expense:['Family Bazar','Samiti Premium','School Fee','Milk/Child Expense','Medical Expense','Electricity Bill','Internet Bill','Service Charge','Insurance Premium','Credit Card Bill','Other Expense'],income:['Salary','Wife Contribution','Insurance Receipt/Claim','Other Income']},
  beneficiaries:['Me','Wife Juthi','Mother','Innaya','Izan','Whole Family','Other'],
  methods:['Cash','Bank','Card','bKash','Nagad','Other'],
  budgets:{},transactions:[]
};

let S=JSON.parse(localStorage.getItem(K)||'null')||structuredClone(D);
S.categories??=structuredClone(D.categories); S.beneficiaries??=[...D.beneficiaries]; S.methods??=[...D.methods]; S.budgets??={}; S.transactions??=[];
let page='dashboard';
let month=new Date().toISOString().slice(0,7);
let edit=null;

const save=()=>localStorage.setItem(K,JSON.stringify(S));
const money=n=>'৳ '+Number(n||0).toLocaleString('en-BD',{maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x]));
const monthLabel=m=>new Date(m+'-01').toLocaleDateString('en-US',{month:'long',year:'numeric'});
const ymNow=()=>new Date().toISOString().slice(0,7);
const txInMonth=(m=month)=>S.transactions.filter(t=>t.date?.slice(0,7)===m);
const sortedMonths=()=>[...new Set(S.transactions.map(t=>t.date?.slice(0,7)).filter(Boolean))].sort();

function go(p){page=p;render()}
function setMonth(v){month=v;render()}
function moveMonth(delta){
  const d=new Date(month+'-01T00:00:00'); d.setMonth(d.getMonth()+delta);
  month=d.toISOString().slice(0,7); render();
}
function totalsFor(m){
  return txInMonth(m).reduce((a,t)=>{t.type==='Income'?a.i+=+t.amount:a.e+=+t.amount;return a},{i:0,e:0});
}
function cumulativeBefore(m){
  return S.transactions.filter(t=>t.date && t.date.slice(0,7)<m).reduce((s,t)=>s+(t.type==='Income'?+t.amount:-+t.amount),0);
}
function cumulativeThrough(m){
  return cumulativeBefore(m)+totalsFor(m).i-totalsFor(m).e;
}
function availableMonthRange(){
  const ys=new Set();
  S.transactions.forEach(t=>{if(t.date)ys.add(t.date.slice(0,4))});
  ys.add(new Date().getFullYear().toString());
  const arr=[...ys].map(Number).sort((a,b)=>a-b);
  return {min:arr[0]||new Date().getFullYear(),max:arr[arr.length-1]||new Date().getFullYear()};
}
function monthPicker(){
  const {min,max}=availableMonthRange();
  let years='';
  for(let y=min-1;y<=max+1;y++) years+=`<option value="${y}" ${month.slice(0,4)==y?'selected':''}>${y}</option>`;
  return `<div class="monthnav">
    <button onclick="moveMonth(-1)" title="Previous month">‹</button>
    <select id="monthSel" class="monthselect" onchange="setMonth(this.value+'-'+document.querySelector('#yearSel').value)"></select>
    <select id="yearSel" class="yearselect" onchange="setMonth(document.querySelector('#monthSel').value+'-'+this.value)">${years}</select>
    <button onclick="moveMonth(1)" title="Next month">›</button>
  </div>`;
}
function renderMonthControls(){
  const ms=document.querySelector('#monthSel');
  if(ms){
    ms.innerHTML=Array.from({length:12},(_,i)=>`<option value="${String(i+1).padStart(2,'0')}" ${month.slice(5,7)===String(i+1).padStart(2,'0')?'selected':''}>${new Date(2000,i,1).toLocaleDateString('en-US',{month:'long'})}</option>`).join('');
  }
}

function render(){
  document.querySelector('#app').innerHTML=`<div class="layout">
    <aside class="side"><div class="brand">৳ Family Spend<small>PRIVATE LEDGER</small></div>
      <nav class="nav">${[['dashboard','Dashboard'],['transactions','Transactions'],['budgets','Budgets'],['settings','Settings'],['backup','Backup']].map(x=>`<button class="${page===x[0]?'active':''}" onclick="go('${x[0]}')">${x[1]}</button>`).join('')}</nav>
      <div class="local">Local first<br><small>Your data stays in this browser.</small></div>
    </aside>
    <main class="main">
      <header class="top"><div class="topmonth"><span class="muted">SELECT PERIOD</span>${monthPicker()}</div><button class="primary" onclick="form()">＋ Add transaction</button></header>
      <section class="content">${page==='dashboard'?dash():page==='transactions'?tx():page==='budgets'?budgets():page==='settings'?settings():backup()}</section>
    </main>
  </div><div id="m" class="modal"></div>`;
  renderMonthControls();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
}

function dash(){
  const t=totalsFor(month), opening=cumulativeBefore(month), closing=opening+t.i-t.e;
  const ex=txInMonth(month).filter(x=>x.type==='Expense'), by={};
  ex.forEach(x=>by[x.category]=(by[x.category]||0)+ +x.amount);
  const recent=txInMonth(month).sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id))).slice(0,7);
  return `<div class="hero"><div><span class="muted">MONTHLY OVERVIEW</span><h1>${monthLabel(month)}</h1><p class="muted">Change month or year above. Balances carry forward automatically.</p></div><button class="primary" onclick="form()">＋ Add spend / income</button></div>
  <div class="cards">
    <div class="card metric"><span class="muted">OPENING BALANCE</span><div class="value">${money(opening)}</div><small class="muted">Cumulative before ${monthLabel(month)}</small></div>
    <div class="card metric"><span class="muted">INCOME</span><div class="value">${money(t.i)}</div></div>
    <div class="card metric red"><span class="muted">EXPENSE</span><div class="value">${money(t.e)}</div></div>
    <div class="card metric amber"><span class="muted">CLOSING BALANCE</span><div class="value">${money(closing)}</div><small class="muted">${closing<0?'Deficit / ঘাটতি':'Available balance'}</small></div>
  </div>
  <div class="card carry"><div><b>Cumulative balance</b><span class="muted"> ${monthLabel(month)} ending position after all recorded months up to this month.</span></div><strong class="${closing<0?'expense':'income'}">${money(closing)}</strong></div>
  <div class="grid charts">
    <div class="card"><h3>Cash flow trend</h3><p class="muted">Last 6 months — income vs expense</p>${cashFlowChart()}</div>
    <div class="card"><h3>Expense by category</h3><p class="muted">${monthLabel(month)}</p>${categoryChart(by)}</div>
  </div>
  <div class="grid">
    <div class="card"><h3>Recent transactions</h3>${recent.map(x=>`<div class="list"><span><b>${esc(x.category)}</b><small class="muted" style="display:block">${esc(x.beneficiary)} · ${x.date}</small></span><b class="${x.type.toLowerCase()}">${x.type==='Income'?'+':'−'}${money(x.amount)}</b></div>`).join('')||'<p class="muted">No transactions this month.</p>'}</div>
    <div class="card"><h3>Monthly summary</h3>${summaryTable()}</div>
  </div>`;
}

function cashFlowChart(){
  const d=new Date(month+'-01T00:00:00'), arr=[];
  for(let i=5;i>=0;i--){const x=new Date(d);x.setMonth(d.getMonth()-i);const m=x.toISOString().slice(0,7),t=totalsFor(m);arr.push({m,i:t.i,e:t.e});}
  const max=Math.max(1,...arr.flatMap(x=>[x.i,x.e]));
  return `<div class="barChart">${arr.map(x=>`<div class="barGroup" title="${monthLabel(x.m)} — Income ${money(x.i)}, Expense ${money(x.e)}">
    <div class="bars"><div class="bar incomeBar" style="height:${Math.max(3,x.i/max*100)}%"></div><div class="bar expenseBar" style="height:${Math.max(3,x.e/max*100)}%"></div></div>
    <small>${new Date(x.m+'-01').toLocaleDateString('en-US',{month:'short'})}</small></div>`).join('')}</div>
  <div class="legend"><span><i class="dot incomeDot"></i>Income</span><span><i class="dot expenseDot"></i>Expense</span></div>`;
}
function categoryChart(by){
  const rows=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,8), max=Math.max(1,...rows.map(x=>x[1]));
  if(!rows.length)return '<p class="muted">No expenses this month.</p>';
  return rows.map(([k,v])=>`<div class="catrow"><div class="cathead"><span>${esc(k)}</span><b>${money(v)}</b></div><div class="track"><div class="fill" style="width:${v/max*100}%"></div></div></div>`).join('');
}
function summaryTable(){
  const months=[...new Set(S.transactions.map(t=>t.date?.slice(0,7)).filter(Boolean))].sort().slice(-8).reverse();
  if(!months.length)return '<p class="muted">No monthly history yet.</p>';
  return `<div class="tablewrap"><table class="table compact"><tr><th>Month</th><th>Income</th><th>Expense</th><th>Balance</th></tr>${months.map(m=>{let t=totalsFor(m),c=cumulativeThrough(m);return `<tr><td>${monthLabel(m)}</td><td class="income">+${money(t.i)}</td><td class="expense">−${money(t.e)}</td><td class="${c<0?'expense':'income'}">${money(c)}</td></tr>`}).join('')}</table></div>`;
}

function tx(){
  let a=txInMonth(month);
  return `<div class="hero"><div><span class="muted">${a.length} RECORDS THIS MONTH</span><h1>Transactions</h1><p class="muted">${monthLabel(month)} · Use the period controls above to switch month/year.</p></div></div>
  <div class="card"><div class="toolbar"><input id="q" class="field" placeholder="Search category, person or note" oninput="filter()"><select id="ty" class="field" onchange="filter()"><option value="">All types</option><option>Expense</option><option>Income</option></select><select id="ca" class="field" onchange="filter()"><option value="">All categories</option>${[...S.categories.expense,...S.categories.income].map(x=>`<option>${esc(x)}</option>`).join('')}</select><select id="be" class="field" onchange="filter()"><option value="">All people</option>${S.beneficiaries.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><div id="tbl">${table(a)}</div></div>`;
}
function table(a){
  if(!a.length)return '<p class="muted">No matching transactions.</p>';
  return `<div class="tablewrap"><table class="table"><tr><th>Date</th><th>Type</th><th>Category</th><th>Beneficiary</th><th>Method</th><th>Amount</th><th></th></tr>${a.sort((x,y)=>y.date.localeCompare(x.date)).map(x=>`<tr><td>${x.date}</td><td>${x.type}</td><td>${esc(x.category)}</td><td>${esc(x.beneficiary)}</td><td>${esc(x.method)}</td><td class="${x.type.toLowerCase()}">${x.type==='Income'?'+':'−'}${money(x.amount)}</td><td><button onclick="form('${x.id}')">Edit</button> <button onclick="del('${x.id}')">Delete</button></td></tr>`).join('')}</table></div>`;
}
function filter(){
  let q=(document.querySelector('#q').value||'').toLowerCase(),ty=document.querySelector('#ty').value,ca=document.querySelector('#ca').value,be=document.querySelector('#be').value;
  let a=txInMonth(month).filter(x=>(!q||`${x.category} ${x.beneficiary} ${x.notes}`.toLowerCase().includes(q))&&(!ty||x.type===ty)&&(!ca||x.category===ca)&&(!be||x.beneficiary===be));
  document.querySelector('#tbl').innerHTML=table(a);
}
function form(id){
  edit=id??null;
  let t=id?S.transactions.find(x=>String(x.id)===String(id)):{date:new Date().toISOString().slice(0,10),amount:'',type:'Expense',category:S.categories.expense[0],beneficiary:S.beneficiaries[0],method:S.methods[0],recurring:false,notes:''};
  document.querySelector('#m').innerHTML=`<div class="box"><h2>${id?'Edit':'Add'} transaction</h2><div class="form"><label>Date<input id="d" type="date" value="${t.date}"></label><label>Amount<input id="a" type="number" value="${t.amount}"></label><label>Type<select id="t"><option>Expense</option><option ${t.type==='Income'?'selected':''}>Income</option></select></label><label>Category<select id="c">${[...new Set([...S.categories.expense,...S.categories.income])].map(x=>`<option ${x===t.category?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label>Beneficiary<select id="b">${S.beneficiaries.map(x=>`<option ${x===t.beneficiary?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label>Payment Method<select id="p">${S.methods.map(x=>`<option ${x===t.method?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label><input id="r" type="checkbox" ${t.recurring?'checked':''}> Recurring</label><label class="full">Notes<textarea id="n">${esc(t.notes||'')}</textarea></label></div><div class="actions"><button onclick="closeM()">Cancel</button> <button class="primary" onclick="saveTx()">Save</button></div></div>`;
  document.querySelector('#m').classList.add('open');
}
function closeM(){document.querySelector('#m').classList.remove('open')}
function saveTx(){
  let x={id:edit||Date.now(),date:d.value,amount:+a.value,type:t.value,category:c.value,beneficiary:b.value,method:p.value,recurring:r.checked,notes:n.value};
  if(!x.date||!x.amount)return alert('Enter date and amount');
  let i=S.transactions.findIndex(y=>String(y.id)===String(x.id)); i<0?S.transactions.push(x):S.transactions[i]=x;
  save(); closeM(); month=x.date.slice(0,7); render();
}
function del(id){if(confirm('Delete transaction?')){S.transactions=S.transactions.filter(x=>String(x.id)!==String(id));save();render()}}
function settings(){
  let block=(title,key,arr)=>`<div class="card"><div style="display:flex;justify-content:space-between"><h3>${title}</h3><button class="primary" onclick="add('${key}')">＋ Add</button></div>${arr.map((x,i)=>`<div class="list"><span>${esc(x)}</span><span><button onclick="ren('${key}',${i})">Edit</button> <button onclick="arc('${key}',${i})">Archive</button></span></div>`).join('')}</div>`;
  return `<div class="hero"><div><span class="muted">CUSTOMIZE</span><h1>Settings</h1><p class="muted">Add, rename or archive your own categories, people and payment methods.</p></div></div><div class="grid">${block('Expense categories','expense',S.categories.expense)}${block('Income categories','income',S.categories.income)}${block('Beneficiaries','beneficiaries',S.beneficiaries)}${block('Payment methods','methods',S.methods)}</div>`;
}
function add(k){let v=prompt('Add new item');if(!v)return;(S.categories[k]||S[k]).push(v.trim());save();render()}
function ren(k,i){let a=S.categories[k]||S[k],v=prompt('Rename',a[i]);if(v?.trim()){a[i]=v.trim();save();render()}}
function arc(k,i){let a=S.categories[k]||S[k];if(confirm('Archive this item?')){a.splice(i,1);save();render()}}
function budgets(){
  let cats=[...new Set(S.categories.expense)],ex=txInMonth(month).filter(x=>x.type==='Expense');
  return `<div class="hero"><div><span class="muted">MONTHLY PLANNING</span><h1>Budgets · ${monthLabel(month)}</h1></div></div><div class="card">${cats.map(c=>{let ac=ex.filter(x=>x.category===c).reduce((s,x)=>s+x.amount,0),bu=S.budgets[month]?.[c]||0,pct=bu?Math.min(100,ac/bu*100):0;return `<div class="list"><span><b>${esc(c)}</b><small class="muted" style="display:block">${money(ac)} actual ${bu?'· '+money(bu)+' budget':''}</small>${bu?`<div class="track"><div class="fill" style="width:${pct}%"></div></div>`:''}</span><button onclick="budget('${encodeURIComponent(c)}')">${bu?'Edit':'Set'} budget</button></div>`}).join('')}</div>`;
}
function budget(c){c=decodeURIComponent(c);let v=prompt('Budget for '+c,S.budgets[month]?.[c]||'');if(v!==null){S.budgets[month]??={};S.budgets[month][c]=+v||0;save();render()}}
function backup(){
  return `<div class="hero"><div><span class="muted">BACKUP & DATA</span><h1>Private by default.</h1><p class="muted">Your ledger lives in this browser.</p></div></div><div class="grid"><div class="card"><h3>Export</h3><button class="primary" onclick="jsonOut()">Download JSON backup</button><button onclick="csvOut()">Transactions CSV</button></div><div class="card"><h3>Restore</h3><input type="file" accept=".json" onchange="jsonIn(this)"></div></div>`;
}
function jsonOut(){dl('family-spend-ledger.json',JSON.stringify(S,null,2),'application/json')}
function jsonIn(i){let f=i.files[0],r=new FileReader();r.onload=()=>{try{S=JSON.parse(r.result);S.categories??=structuredClone(D.categories);S.beneficiaries??=[...D.beneficiaries];S.methods??=[...D.methods];S.budgets??={};S.transactions??=[];save();month=S.transactions[0]?.date?.slice(0,7)||month;render();alert('Backup restored')}catch{alert('Invalid backup')}};r.readAsText(f)}
function csvOut(){let h='Date,Amount,Type,Category,Beneficiary,Payment Method,Recurring,Notes\n',b=S.transactions.map(x=>[x.date,x.amount,x.type,x.category,x.beneficiary,x.method,x.recurring?'Yes':'No',x.notes||''].map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');dl('family-spend-ledger.csv',h+b,'text/csv')}
function dl(n,d,t){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([d],{type:t}));a.download=n;a.click()}
render();
