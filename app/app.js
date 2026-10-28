(function(){'use strict';
var $=function(i){return document.getElementById(i)};
var U=['urn:ietf:params:jmap:core','urn:ietf:params:jmap:mail','urn:ietf:params:jmap:submission'];
var S={auth:null,acc:null,user:'',boxes:[],cur:null,mails:[],sel:null,ident:null,query:''};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
var KEEP=false;
function ss(k,v){try{if(v===undefined)return sessionStorage.getItem(k)||localStorage.getItem(k);sessionStorage.removeItem(k);localStorage.removeItem(k);if(v!==null)(KEEP?localStorage:sessionStorage).setItem(k,v)}catch(e){}return null}
function b64(s){return btoa(unescape(encodeURIComponent(s)))}
async function api(calls){
  var r=await fetch('/jmap/',{method:'POST',headers:{Authorization:S.auth,'Content-Type':'application/json'},body:JSON.stringify({using:U,methodCalls:calls})});
  if(r.status===401){logout();throw new Error('auth')}
  if(!r.ok)throw new Error('Server error '+r.status);
  var j=await r.json();var out={};
  j.methodResponses.forEach(function(m){if(m[0]==='error')throw new Error(m[1].description||m[1].type);out[m[2]]=m[1]});
  return out;
}
async function login(user,pass){
  var auth='Basic '+b64(user+':'+pass);
  var r=await fetch('/jmap/session',{headers:{Authorization:auth}});
  if(r.status===401)throw new Error('Wrong address or password.');
  if(!r.ok)throw new Error('Server unavailable ('+r.status+').');
  var j=await r.json();var id=j.primaryAccounts&&j.primaryAccounts['urn:ietf:params:jmap:mail'];
  if(!id)throw new Error('Wrong address or password.');
  S.auth=auth;S.acc=id;S.user=user;ss('wm-a',auth);ss('wm-i',id);ss('wm-u',user);
}
function logout(){S.auth=null;ss('wm-a',null);ss('wm-i',null);ss('wm-u',null);$('app').hidden=true;$('login').hidden=false;$('who').hidden=true;$('lo').hidden=true;$('lp').value='';document.body.classList.remove('read','nav')}
function fmtDate(s){var d=new Date(s),n=new Date();return d.toDateString()===n.toDateString()?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{day:'numeric',month:'short',year:d.getFullYear()===n.getFullYear()?undefined:'numeric'})}
function who(a){return a&&a[0]?(a[0].name||a[0].email):'(unknown)'}
function addrs(a){return(a||[]).map(function(x){return x.name?x.name+' <'+x.email+'>':x.email}).join(', ')}
var IC={inbox:'<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/>',drafts:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',sent:'<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>',archive:'<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11h14V8M10 12h4"/>',junk:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M12 8v5M12 16v.5"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',def:'<path d="M3 6h7l2 2h9v11H3z"/>'};
function icon(r){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(IC[r]||IC.def)+'</svg>'}
function ini(m){var a=m&&m[0];var s=((a&&(a.name||a.email))||'?').trim();return s.charAt(0).toUpperCase()}
function dayLab(s){var d=new Date(s),n=new Date(),a=new Date(d.getFullYear(),d.getMonth(),d.getDate()),b=new Date(n.getFullYear(),n.getMonth(),n.getDate()),k=Math.round((b-a)/864e5);return k<=0?'Today':k===1?'Yesterday':k<7?'This week':k<31?'This month':'Earlier'}
var EMPTY=$('rd').innerHTML;
function label(b){return b.role==='inbox'?'Inbox':b.role==='junk'?'Spam':b.name}
var ORDER={inbox:0,drafts:1,sent:2,archive:3,junk:4,trash:5};
async function loadBoxes(){
  var r=await api([['Mailbox/get',{accountId:S.acc,properties:['id','name','role','unreadEmails','totalEmails','parentId']},'b']]);
  S.boxes=r.b.list.sort(function(a,b){var x=a.role in ORDER?ORDER[a.role]:9,y=b.role in ORDER?ORDER[b.role]:9;return x-y||a.name.localeCompare(b.name)});
  if(!S.cur){var i=S.boxes.find(function(b){return b.role==='inbox'})||S.boxes[0];S.cur=i&&i.id}
  var nav=$('boxes');nav.textContent='';
  var all=S.boxes.concat([{id:'__star',name:'Starred',role:'star'}]);
  all.forEach(function(b){var btn=el('button',b.id===S.cur?'on':'');btn.insertAdjacentHTML('beforeend',icon(b.role));btn.appendChild(el('span','',label(b)));
    var n=b.role==='drafts'?b.totalEmails:b.unreadEmails;if(n)btn.appendChild(el('i','',n));
    btn.onclick=function(){S.cur=b.id;S.query='';$('q').value='';S.sel=null;document.body.classList.remove('nav','read');loadBoxes().then(loadList)};nav.appendChild(btn)});
  var cb=all.find(function(b){return b.id===S.cur});$('lt').textContent=S.query?'Search':(cb?label(cb):'Mail');
}
function role(r){var b=S.boxes.find(function(x){return x.role===r});return b&&b.id}
async function loadList(){
  var f=S.query?{text:S.query}:S.cur==='__star'?{hasKeyword:'$flagged'}:{inMailbox:S.cur};
  var r=await api([['Email/query',{accountId:S.acc,filter:f,sort:[{property:'receivedAt',isAscending:false}],limit:50},'q'],
   ['Email/get',{accountId:S.acc,'#ids':{resultOf:'q',name:'Email/query',path:'/ids'},properties:['id','from','to','subject','receivedAt','keywords','preview','mailboxIds']},'g']]);
  S.mails=r.g.list;var box=$('rows');box.textContent='';
  if(!S.mails.length){var em=el('div','empty muted',S.query?'No results':'Nothing here yet');em.style.padding='40px 0';box.appendChild(em)}
  var last='';
  S.mails.forEach(function(m){
    var lab=dayLab(m.receivedAt);if(lab!==last){box.appendChild(el('div','dv',lab));last=lab}
    var unread=!m.keywords||!m.keywords.$seen,sent=S.boxes.some(function(b){return b.id===S.cur&&(b.role==='sent'||b.role==='drafts')});
    var row=el('button','row'+(unread?' unread':'')+(m.id===S.sel?' on':''));row.setAttribute('role','listitem');
    row.appendChild(el('div','av',ini(sent?m.to:m.from)));var c=el('div','c');
    var t=el('div','t');t.appendChild(el('span','f',sent?'To: '+who(m.to):who(m.from)));t.appendChild(el('span','d',fmtDate(m.receivedAt)));
    c.appendChild(t);c.appendChild(el('div','s',m.subject||'(no subject)'));c.appendChild(el('div','p',m.preview||''));row.appendChild(c);
    row.onclick=function(){openMail(m.id)};box.appendChild(row)});
}
function textOf(m){
  var parts=m.textBody&&m.textBody.length?m.textBody:[];var txt=parts.map(function(p){return(m.bodyValues[p.partId]||{}).value||''}).join('\n');
  if(txt.trim())return txt;
  var html=(m.htmlBody||[]).map(function(p){return(m.bodyValues[p.partId]||{}).value||''}).join('\n');
  var d=new DOMParser().parseFromString(html,'text/html');d.querySelectorAll('script,style').forEach(function(n){n.remove()});
  return(d.body.textContent||'').replace(/\n{3,}/g,'\n\n').trim();
}
async function openMail(id){
  S.sel=id;document.body.classList.add('read');
  var r=await api([['Email/get',{accountId:S.acc,ids:[id],properties:['id','messageId','references','replyTo','from','to','cc','subject','receivedAt','keywords','mailboxIds','textBody','htmlBody','bodyValues','attachments'],fetchTextBodyValues:true,fetchHTMLBodyValues:true},'e']]);
  var m=r.e.list[0];if(!m)return;var rd=$('rd');rd.textContent='';
  var acts=el('div','acts');
  function ab(l,fn,c){var b=el('button','btn '+(c||''),l);b.onclick=fn;acts.appendChild(b)}
  ab('← Back',function(){document.body.classList.remove('read')},'mobonly');
  ab('Reply',function(){compose(m,false)});ab('Reply all',function(){compose(m,true)});
  var inTrash=m.mailboxIds[role('trash')];
  ab(inTrash?'Delete forever':'Delete',function(){del(m,inTrash)});
  if(role('archive')&&!m.mailboxIds[role('archive')])ab('Archive',function(){move(m,role('archive'))});
  ab(m.keywords&&m.keywords.$flagged?'Unstar':'Star',function(){flag(m,'$flagged',!(m.keywords&&m.keywords.$flagged))});
  ab('Mark unread',function(){flag(m,'$seen',false).then(reset)});
  rd.appendChild(acts);
  var h=el('div','mh');h.appendChild(el('h2','',m.subject||'(no subject)'));
  var w=el('div','who');w.appendChild(el('div','av lg',ini(m.from)));var wi=el('div','');wi.appendChild(el('b','',addrs(m.from)));
  wi.appendChild(el('div','meta','To: '+addrs(m.to)+(m.cc&&m.cc.length?'   Cc: '+addrs(m.cc):'')));wi.appendChild(el('div','meta',new Date(m.receivedAt).toLocaleString()));
  w.appendChild(wi);h.appendChild(w);rd.appendChild(h);
  rd.appendChild(el('div','body',textOf(m)));
  if(m.attachments&&m.attachments.length){var at=el('div','att');
    m.attachments.forEach(function(a){var l=el('a','','📎 '+(a.name||'attachment')+' ('+Math.max(1,Math.round(a.size/1024))+' KB)');
      l.href='#';l.onclick=function(e){e.preventDefault();dl(a)};at.appendChild(l)});rd.appendChild(at)}
  if(!m.keywords||!m.keywords.$seen){await flag(m,'$seen',true,true);loadBoxes();loadList()}
}
async function dl(a){
  var u='/jmap/download/'+encodeURIComponent(S.acc)+'/'+encodeURIComponent(a.blobId)+'/'+encodeURIComponent(a.name||'file')+'?accept='+encodeURIComponent(a.type||'application/octet-stream');
  var r=await fetch(u,{headers:{Authorization:S.auth}});if(!r.ok)return alert('Download failed');
  var b=await r.blob(),url=URL.createObjectURL(b),l=document.createElement('a');l.href=url;l.download=a.name||'file';document.body.appendChild(l);l.click();l.remove();setTimeout(function(){URL.revokeObjectURL(url)},4000);
}
async function set(id,upd){var u={};u[id]=upd;var r=await api([['Email/set',{accountId:S.acc,update:u},'s']]);if(r.s.notUpdated&&r.s.notUpdated[id])throw new Error('Could not update message')}
async function flag(m,k,v,quiet){var o={};o['keywords/'+k]=v?true:null;await set(m.id,o);m.keywords=m.keywords||{};if(v)m.keywords[k]=true;else delete m.keywords[k];if(!quiet){await loadBoxes();await loadList()}}
async function move(m,to){var o={};o[to]=true;await set(m.id,{mailboxIds:o});return reset()}
async function del(m,hard){
  var t=role('trash');
  if(hard||!t){if(!window.confirm('Delete this message permanently?'))return;await api([['Email/set',{accountId:S.acc,destroy:[m.id]},'d']]);return reset()}
  return move(m,t);
}
function reset(){S.sel=null;var rd=$('rd');rd.textContent='';rd.insertAdjacentHTML('beforeend',EMPTY);document.body.classList.remove('read');return loadBoxes().then(loadList)}
async function identity(){
  if(S.ident)return S.ident;
  var r=await api([['Identity/get',{accountId:S.acc},'i']]);S.ident=r.i.list[0]||null;return S.ident;
}
function compose(re,all){
  var f=$('cf');f.reset();$('cst').textContent='';f._re=re||null;
  if(re){var me=(S.user||'').toLowerCase(),to=(re.replyTo&&re.replyTo.length?re.replyTo:re.from)||[];
    var list=to.slice();if(all)list=list.concat(re.to||[],re.cc||[]);
    var seen={};list=list.filter(function(a){var e=a.email.toLowerCase();if(e===me||seen[e])return false;seen[e]=1;return true});
    $('ct').value=list.map(function(a){return a.email}).join(', ');
    var s=re.subject||'';$('cs').value=/^re:/i.test(s)?s:'Re: '+s;
    var q=textOf(re).split('\n').map(function(l){return'> '+l}).join('\n');
    $('cb').value='\n\n'+(re.from&&re.from[0]?re.from[0].name||re.from[0].email:'')+' wrote on '+new Date(re.receivedAt).toLocaleString()+':\n'+q}
  $('dlg').hidden=false;(re?$('cb'):$('ct')).focus();if(re)$('cb').setSelectionRange(0,0);
}
function parse(s){return s.split(/[,;]/).map(function(x){return x.trim()}).filter(Boolean).map(function(e){var m=e.match(/<([^>]+)>/);return{email:(m?m[1]:e).trim()}})}
async function send(e){
  e.preventDefault();var b=$('snd'),st=$('cst');b.disabled=true;st.textContent='Sending…';
  try{
    var id=await identity();if(!id)throw new Error('No sender identity found');
    var to=parse($('ct').value),cc=parse($('cc').value);if(!to.length)throw new Error('Add a recipient');
    var re=$('cf')._re,dr=role('drafts'),sent=role('sent');
    var mail={mailboxIds:{},keywords:{$seen:true,$draft:true},from:[{name:id.name||undefined,email:id.email}],to:to,subject:$('cs').value,
      textBody:[{partId:'t',type:'text/plain'}],bodyValues:{t:{value:$('cb').value}}};
    if(cc.length)mail.cc=cc;if(dr)mail.mailboxIds[dr]=true;
    if(re&&re.messageId&&re.messageId[0]){mail.inReplyTo=re.messageId;mail.references=(re.references||[]).concat(re.messageId)}
    var upd={'keywords/$draft':null};if(sent){upd.mailboxIds={};upd.mailboxIds[sent]=true}
    var r=await api([['Email/set',{accountId:S.acc,create:{c:mail}},'c'],
      ['EmailSubmission/set',{accountId:S.acc,create:{s:{identityId:id.id,emailId:'#c'}},onSuccessUpdateEmail:{'#s':upd}},'s']]);
    if(r.c.notCreated&&r.c.notCreated.c)throw new Error(r.c.notCreated.c.description||'Could not create message');
    if(r.s.notCreated&&r.s.notCreated.s)throw new Error(r.s.notCreated.s.description||'Could not send');
    $('dlg').hidden=true;await loadBoxes();await loadList();
  }catch(x){st.textContent=x.message}finally{b.disabled=false}
}
async function start(){
  $('login').hidden=true;$('app').hidden=false;$('who').textContent=S.user;$('who').hidden=false;$('lo').hidden=false;
  try{await loadBoxes();await loadList()}catch(x){if(x.message!=='auth')$('rows').textContent=x.message}
}
var poll;function tick(){clearInterval(poll);poll=setInterval(function(){if(S.auth&&!document.hidden&&!$('app').hidden&&!S.query)loadBoxes().then(loadList).catch(function(){})},60000)}
$('lf').addEventListener('submit',function(e){e.preventDefault();$('le').textContent='';var u=$('lu').value.trim().toLowerCase();
  KEEP=$('lk').checked;login(u,$('lp').value).then(function(){$('lp').value='';start();tick()}).catch(function(x){$('le').textContent=x.message})});
$('lo').onclick=logout;$('rf').onclick=function(){loadBoxes().then(loadList)};$('cmp').onclick=function(){compose()};
$('cx').onclick=function(){$('dlg').hidden=true};$('cf').addEventListener('submit',send);
$('mb').onclick=function(){document.body.classList.toggle('nav')};
var qt;$('q').addEventListener('input',function(){clearTimeout(qt);qt=setTimeout(function(){S.query=$('q').value.trim();loadList().catch(function(){})},300)});
var a=ss('wm-a');if(a){S.auth=a;S.acc=ss('wm-i');S.user=ss('wm-u')||'';start();tick()}else{$('login').hidden=false}
})();

(function(){var b=document.querySelector('.tg');if(b)b.addEventListener('click',function(){var r=document.documentElement,n=r.dataset.theme==='dark'?'light':'dark';r.dataset.theme=n;try{localStorage.setItem('theme',n)}catch(e){}})})();
