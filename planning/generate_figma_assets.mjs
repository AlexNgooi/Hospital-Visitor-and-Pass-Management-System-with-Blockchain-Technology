import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('planning/figma_assets');
fs.mkdirSync(OUT, { recursive: true });

const C = {
  primary: '#9D0B0F', primaryHover: '#7F0A0D', soft: '#FEF2F2',
  bg: '#FAFAFA', white: '#FFFFFF', fg: '#171717', muted: '#737373',
  border: '#E5E5E5', border2: '#D4D4D4', success: '#15803D',
  successBg: '#F0FDF4', warning: '#B45309', warningBg: '#FFFBEB',
  danger: '#DC2626', info: '#2563EB', infoBg: '#EFF6FF'
};

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const rect = (x,y,w,h,fill=C.white,r=8,stroke='none',sw=1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const line = (x1,y1,x2,y2,stroke=C.border,sw=1) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"/>`;
const text = (x,y,s,size=14,weight=400,fill=C.fg,anchor='start') => `<text x="${x}" y="${y}" font-family="Geist, Inter, Arial" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;
const circle = (cx,cy,r,fill,stroke='none',sw=1) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const badge = (x,y,label,tone='neutral') => {
  const map={neutral:[C.bg,C.fg,C.border],red:[C.soft,C.primary,'#FCA5A5'],solid:[C.primary,C.white,C.primary],green:[C.successBg,C.success,'#86EFAC'],amber:[C.warningBg,C.warning,'#FCD34D'],danger:['#FEF2F2',C.danger,'#FCA5A5'],blue:[C.infoBg,C.info,'#93C5FD']};
  const [bg,fg,st]=map[tone]||map.neutral; const w=Math.max(52,label.length*7+20);
  return rect(x,y,w,24,bg,12,st)+text(x+w/2,y+16,label,12,600,fg,'middle');
};
const button = (x,y,w,label,kind='primary') => {
  const map={primary:[C.primary,C.white,C.primary],outline:[C.white,C.fg,C.border2],secondary:[C.bg,C.fg,C.border],ghost:['transparent',C.primary,'none'],danger:[C.danger,C.white,C.danger]};
  const [bg,fg,st]=map[kind]||map.primary;
  return rect(x,y,w,40,bg,8,st)+text(x+w/2,y+25,label,14,600,fg,'middle');
};
const input = (x,y,w,label,value='',hint='') => `${text(x,y,label,13,600)}${rect(x,y+8,w,42,C.white,8,C.border2)}${text(x+12,y+34,value||hint,14,400,value?C.fg:C.muted)}`;
const card = (x,y,w,h,title='',sub='') => `${rect(x,y,w,h,C.white,10,C.border)}${title?text(x+20,y+30,title,16,650):''}${sub?text(x+20,y+51,sub,12,400,C.muted):''}`;
const alert = (x,y,w,titleStr,body,tone='info',h=68) => {
  const map={info:[C.infoBg,C.info,'#BFDBFE'],warning:[C.warningBg,C.warning,'#FDE68A'],danger:['#FEF2F2',C.danger,'#FCA5A5'],success:[C.successBg,C.success,'#BBF7D0'],red:[C.soft,C.primary,'#FECACA']};
  const [bg,fg,st]=map[tone];
  return rect(x,y,w,h,bg,8,st)+circle(x+20,y+22,6,fg)+text(x+36,y+24,titleStr,13,650,fg)+text(x+20,y+47,body,11,400,C.fg);
};
const logo = (x,y,compact=false) => `${rect(x,y,compact?32:40,compact?32:40,C.primary,8)}${text(x+(compact?16:20),y+(compact?22:27),'UPM',compact?9:11,700,C.white,'middle')}`;

const svg = (w,h,body,titleStr) => `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><title>${esc(titleStr)}</title><rect width="100%" height="100%" fill="#F1F5F9"/>${body}</svg>`;

function mobileFrame(x,y,h,titleStr,body){
  return `<g transform="translate(${x},${y})">${rect(0,0,390,h,C.white,20,C.border2)}${rect(0,0,390,72,C.white,20)}${line(0,72,390,72)}${logo(16,20,true)}${text(58,34,'HSAAS UPM',13,700)}${text(58,51,'Visitor Pass',11,400,C.muted)}${button(314,17,60,'BM / EN','ghost')}${body}${text(0,-16,titleStr,14,700,C.fg)}</g>`;
}

function visitorCategory(){
  let b=text(16,112,'Langkah 1 daripada 2',12,600,C.primary)+text(16,146,'Pilih kategori pelawat',24,700)+text(16,172,'Pilih kategori yang sepadan dengan tujuan lawatan anda.',12,400,C.muted);
  const items=[['Pelawat Eksekutif','Lawatan pesakit di luar waktu melawat'],['Penjaga','Menjaga pesakit atau berada lebih lama'],['Vendor','Penghantaran bekalan atau peralatan'],['Kontraktor','Kerja penyelenggaraan atau projek']];
  items.forEach((it,i)=>{const yy=205+i*96,sel=i===1;b+=rect(16,yy,358,84,sel?C.soft:C.white,10,sel?C.primary:C.border,sel?2:1)+rect(30,yy+22,40,40,sel?C.primary:C.bg,8)+text(82,yy+34,it[0],15,650,sel?C.primary:C.fg)+text(82,yy+56,it[1],11,400,C.muted)+circle(348,yy+42,10,sel?C.primary:C.white,sel?C.primary:C.border2,2)+(sel?text(348,yy+46,'✓',11,700,C.white,'middle'):'');});
  b+=alert(16,601,358,'Maklumat','Borang ini untuk pelawat yang memerlukan pas fizikal.','info',72)+rect(0,748,390,96,C.white,0)+line(0,748,390,748)+button(16,772,358,'Teruskan  →');
  return mobileFrame(40,70,844,'V01 · Visitor category',b);
}

function visitorForm(){
  let b=text(16,112,'←   Langkah 2 daripada 2',12,600,C.primary)+text(16,146,'Maklumat Penjaga',24,700)+badge(16,160,'Penjaga','red')+text(286,177,'Tukar kategori',12,600,C.primary);
  b+=alert(16,202,358,'Pengesahan kaunter','Petugas akan mengesahkan maklumat sebelum pas dikeluarkan.','red',64)+text(16,298,'Maklumat peribadi',16,700);
  b+=input(16,330,358,'Nama penuh *','','Seperti dalam MyKad atau pasport')+input(16,408,358,'Jenis pengenalan *','MyKad')+input(16,486,358,'Nombor pengenalan *','******-**-4521')+text(16,558,'Maklumat ini tidak direkodkan di blockchain.',11,400,C.muted)+input(16,584,358,'Nombor telefon *','+60 12 345 6789');
  b+=line(16,666,374,666)+text(16,704,'Maklumat pesakit',16,700)+input(16,736,358,'Hubungan dengan pesakit *','Ibu / Bapa')+input(16,814,306,'MRN Pesakit *','MRN-****-284')+rect(330,822,44,42,C.white,8,C.border2)+text(352,848,'▦',18,600,C.primary,'middle')+text(16,884,'✓  MRN disahkan',11,600,C.success)+input(16,916,358,'Wad / lokasi','Wad 7A');
  b+=rect(16,986,18,18,C.primary,4,C.primary)+text(25,1000,'✓',11,700,C.white,'middle')+text(44,999,'Saya mengesahkan maklumat adalah tepat dan bersetuju',11,400)+text(44,1015,'dengan notis privasi HSAAS.',11,400)+alert(16,1040,358,'Privasi','Data peribadi disimpan dalam pangkalan data hospital sahaja.','info',66)+button(16,1130,358,'Hantar pendaftaran');
  return mobileFrame(470,70,1232,'V02 · Penjaga form',b);
}

function visitorSuccess(){
  let b=circle(195,132,32,C.successBg)+text(195,143,'✓',30,700,C.success,'middle')+text(195,195,'Pendaftaran berjaya dihantar',22,700,C.fg,'middle')+text(195,224,'Tunjukkan rujukan ini kepada petugas kaunter.',12,400,C.muted,'middle')+badge(129,246,'Menunggu pengesahan','amber');
  b+=card(16,294,358,196,'Rujukan pendaftaran')+text(36,352,'HSAAS-260822-0147',18,700)+rect(36,372,96,96,C.white,4,C.fg)+text(84,428,'QR',20,700,C.fg,'middle')+text(154,394,'Kategori',11,400,C.muted)+text(154,414,'Penjaga',13,600)+text(154,442,'Dihantar',11,400,C.muted)+text(154,462,'22 Ogos 2026, 10:42 AM',12,500);
  b+=alert(16,510,358,'Langkah seterusnya','1. Pergi kaunter  2. Tunjukkan ID/MRN  3. Ambil pas','red',110)+button(16,646,358,'Simpan rujukan')+button(16,704,358,'Daftar pelawat lain','outline')+text(195,798,'Pas mesti dipulangkan sebelum meninggalkan hospital.',11,400,C.muted,'middle');
  return mobileFrame(900,70,844,'V03 · Submission success',b);
}

function desktopShell(titleStr,active,content,role='Counter Staff'){
  const nav=role==='Administrator'?['Overview','Registrations','Pass Inventory','Users & Access','Audit & Blockchain','Settings']:['Dashboard','Registrations','Registration QR','Pass Return','Overdue'];
  let s=rect(0,0,1440,1024,C.bg,14,C.border2)+rect(0,0,248,1024,C.white,14)+line(248,0,248,1024)+logo(24,24)+text(76,43,'HSAAS',14,700)+text(76,60,role==='Administrator'?'Visitor Pass Admin':'Visitor Pass',11,400,C.muted);
  nav.forEach((n,i)=>{const yy=104+i*48,sel=n===active;s+=(sel?rect(12,yy,224,40,C.soft,8)+rect(12,yy,3,40,C.primary,2):'')+text(36,yy+25,n,13,sel?650:500,sel?C.primary:C.fg);});
  s+=line(16,936,232,936)+circle(38,972,18,C.soft)+text(66,969,role==='Administrator'?'Aisyah Rahman':'Nur Aisyah',12,650)+text(66,986,role,10,400,C.muted)+text(280,42,titleStr,20,700)+line(248,72,1440,72)+content;
  return s;
}

const kpi=(x,y,w,label,val,sub='',tone='normal')=>card(x,y,w,112,'')+text(x+20,y+30,label,12,500,C.muted)+text(x+20,y+70,val,28,700,tone==='danger'?C.danger:C.fg)+(sub?text(x+20,y+94,sub,11,500,tone==='danger'?C.danger:C.muted):'');
const tableHeader=(x,y,cols,widths)=>{let out=rect(x,y,widths.reduce((a,b)=>a+b,0),40,C.bg,0);let xx=x;cols.forEach((c,i)=>{out+=text(xx+12,y+25,c,11,650,C.muted);xx+=widths[i];});return out;};
const tableRow=(x,y,cells,widths,selected=false)=>{let out=rect(x,y,widths.reduce((a,b)=>a+b,0),54,selected?C.soft:C.white,0)+line(x,y+54,x+widths.reduce((a,b)=>a+b,0),y+54);let xx=x;cells.forEach((c,i)=>{out+=text(xx+12,y+32,c,11,i===0?650:450,i===cells.length-1?C.primary:C.fg);xx+=widths[i];});return out;};

function staffLogin(){
  let s=rect(0,0,1440,1024,C.white,14,C.border2)+rect(0,0,560,1024,'#FFF7F7',14)+rect(0,0,10,1024,C.primary,0)+logo(96,192)+text(96,284,'Hospital Visitor &',32,700)+text(96,324,'Pass Management',32,700)+text(96,356,'Secure counter operations for HSAAS',15,400,C.muted);
  ['Role-based access','Auditable pass lifecycle','Privacy-first'].forEach((t,i)=>{s+=circle(104,420+i*42,8,C.soft,C.primary)+text(104,424+i*42,'✓',10,700,C.primary,'middle')+text(124,425+i*42,t,14,500);});
  s+=card(790,238,420,470)+text(826,292,'Staff sign in',24,700)+text(826,320,'Use your authorised HSAAS account.',13,400,C.muted)+input(826,360,348,'Email or staff ID','','name@upm.edu.my')+input(826,446,348,'Password','','Enter your password')+rect(826,516,18,18,C.white,4,C.border2)+text(854,530,'Keep me signed in on this device',12,400)+button(826,558,348,'Sign in')+text(1000,632,'Contact administrator for sign-in help',11,500,C.primary,'middle')+line(826,658,1174,658)+text(1000,684,'Authorised personnel only',11,400,C.muted,'middle')+text(0,-16,'S01 · Staff login',14,700);
  return `<g transform="translate(40,70)">${s}</g>`;
}

function staffDashboard(){
  let c=text(280,120,'Good morning, Nur Aisyah',24,700)+text(280,145,'Saturday, 22 August 2026 · Counter 1',12,400,C.muted)+button(1284,104,120,'Refresh','outline');
  c+=kpi(280,176,266,'Waiting review','12','+4 in last hour')+kpi(562,176,266,'Ready for pass','7','Verified')+kpi(844,176,266,'Passes in use','34 / 60')+kpi(1126,176,278,'Overdue','2','Action required','danger');
  c+=card(280,312,744,548,'Incoming registrations')+input(540,332,250,'','Search registrations')+tableHeader(300,396,['Reference','Visitor','Category','Destination','Status',''],[110,110,100,120,100,84]);
  const rows=[['HSA-041','Siti N***','Penjaga','Ward 7A','Submitted','Review'],['HSA-039','M*** Rahman','Vendor','Pharmacy','Verified','Open'],['HSA-038','Daniel L***','Contractor','Engineering','Submitted','Review'],['HSA-036','Nadia A***','Executive','Ward 5B','Submitted','Review'],['HSA-035','Kumar R***','Vendor','Facilities','Verified','Open']];rows.forEach((r,i)=>c+=tableRow(300,436+i*58,r,[110,110,100,120,100,84]));
  c+=card(1048,312,356,242,'Pass availability')+text(1072,382,'Available',12,500,C.muted)+text(1378,382,'26',14,700,C.success,'end')+text(1072,414,'Issued',12,500,C.muted)+text(1378,414,'32',14,700,'#171717','end')+text(1072,446,'Overdue',12,500,C.muted)+text(1378,446,'2',14,700,C.danger,'end')+rect(1072,476,306,8,C.border,4)+rect(1072,476,174,8,C.primary,4)+text(1072,512,'34 / 60 currently in use',11,400,C.muted)+card(1048,578,356,282,'Quick actions')+button(1072,622,308,'Review next registration')+button(1072,674,308,'Display registration QR','outline')+button(1072,726,308,'Return a pass','outline')+button(1072,778,308,'View overdue passes','outline');
  return `<g transform="translate(1520,70)">${desktopShell('Counter Dashboard','Dashboard',c)}</g>`;
}

function staffReview(){
  let c=text(280,112,'Registrations / HSA-260822-041',12,500,C.muted)+text(280,148,'Registration review',24,700)+button(1250,112,154,'Back to queue','outline');
  c+=card(280,184,416,760,'Queue')+input(300,224,376,'','Reference, name or phone');
  const qs=[['HSA-041','Siti N*** · Penjaga','Ward 7A · 5 min'],['HSA-038','Daniel L*** · Contractor','Engineering · 9 min'],['HSA-036','Nadia A*** · Executive','Ward 5B · 14 min'],['HSA-035','Kumar R*** · Vendor','Facilities · 17 min']];qs.forEach((q,i)=>{const yy=310+i*92;c+=rect(300,yy,376,80,i===0?C.soft:C.white,8,i===0?C.primary:C.border)+(i===0?rect(300,yy,3,80,C.primary,2):'')+text(316,yy+24,q[0],13,700)+text(316,yy+46,q[1],12,500)+text(316,yy+65,q[2],10,400,C.muted);});
  c+=card(720,184,684,760,'HSA-260822-041','Submitted 22 Aug 2026, 10:42 AM')+badge(1230,204,'Submitted','amber')+text(744,266,'Visitor details',15,700)+line(744,278,1380,278);
  const details=[['Full name','Siti Nur Aisyah'],['Identification no.','******-**-4521'],['Phone','+60 12-*** 7821'],['Category','Penjaga'],['Destination','Ward 7A'],['Visit purpose','Patient caregiver']];details.forEach((d,i)=>{const col=i%2,row=Math.floor(i/2),xx=744+col*310,yy=316+row*62;c+=text(xx,yy,d[0],11,400,C.muted)+text(xx,yy+23,d[1],13,600);});
  c+=text(744,512,'Patient reference',15,700)+line(744,524,1380,524)+text(744,560,'MRN',11,400,C.muted)+text(744,583,'MRN-****-284',13,600)+badge(1044,550,'Verified','green')+text(744,632,'Review checklist',15,700)+line(744,644,1380,644);['Identity document checked','Visitor information matches submission','Destination or ward confirmed'].forEach((t,i)=>{const yy=680+i*42;c+=rect(744,yy-15,18,18,C.primary,4,C.primary)+text(753,yy-2,'✓',10,700,C.white,'middle')+text(776,yy,t,12,500);});c+=button(744,866,100,'Reject','outline')+button(1078,866,132,'Save for later','secondary')+button(1220,866,160,'Verify registration');
  return `<g transform="translate(3000,70)">${desktopShell('Registration Review','Registrations',c)}</g>`;
}

function issueDialog(){
  let base=staffReview().replace('translate(3000,70)','translate(0,0)');
  let overlay=rect(0,0,1440,1024,'rgba(0,0,0,0.45)',14)+card(440,150,560,700,'Issue physical pass','Assign an available pass to this verified visitor.')+card(468,226,504,94)+text(488,256,'HSA-260822-041 · Siti Nur Aisyah',14,650)+badge(488,272,'Penjaga','red')+text(580,289,'Ward 7A',12,500,C.muted)+input(468,356,504,'Pass *','PG-017 · Penjaga · Available')+input(468,440,242,'Due date','22 Aug 2026')+input(730,440,242,'Due time','4:30 PM')+text(468,516,'Default return time is configured by administrator.',11,400,C.muted)+input(468,548,504,'Counter note','','Optional note')+rect(468,628,18,18,C.primary,4,C.primary)+text(477,641,'✓',10,700,C.white,'middle')+text(498,642,'Physical pass has been handed to the visitor.',12,500)+alert(468,674,504,'Audit proof','Saved immediately; Sui proof confirms asynchronously.','info',58)+button(742,784,100,'Cancel','secondary')+button(852,784,120,'Issue pass');
  return `<g transform="translate(4480,70)">${base}${overlay}${text(0,-16,'S04 · Issue pass dialog',14,700)}</g>`;
}

function staffReturn(){
  let c=text(280,120,'Pass return & overdue',24,700)+text(280,145,'Monitor active assignments and record returned passes.',12,400,C.muted)+button(1254,108,150,'Return a pass');
  c+=kpi(280,176,360,'Passes in use','34')+kpi(664,176,360,'Due within 1 hour','5','Monitor soon')+kpi(1048,176,356,'Overdue','2','Action required','danger')+card(280,312,1124,620,'Active passes')+badge(300,354,'Active passes (34)','neutral')+badge(430,354,'Overdue (2)','danger')+badge(532,354,'Return history','neutral')+input(300,404,320,'','Pass code, reference or visitor');
  const widths=[90,110,100,110,100,100,100,118];c+=tableHeader(300,478,['Pass','Visitor','Category','Destination','Issued','Due','Overdue','Action'],widths);const rows=[['PG-017','Siti N***','Penjaga','Ward 7A','8:42 AM','12:42 PM','1h 18m','Record return'],['PG-022','Daniel L***','Contractor','Engineering','9:12 AM','1:12 PM','48m','Record return'],['PG-031','Kumar R***','Vendor','Pharmacy','11:10 AM','3:10 PM','—','Record return'],['PG-045','Nadia A***','Executive','Ward 5B','12:20 PM','4:20 PM','—','Record return']];rows.forEach((r,i)=>c+=tableRow(300,518+i*62,r,widths,i<2));
  c+=alert(300,790,1068,'Return flow','Scan or enter the pass code, confirm physical receipt, then record return.','red',64);
  return `<g transform="translate(5960,70)">${desktopShell('Pass Return & Overdue','Overdue',c)}</g>`;
}

function registrationQrDialog(){
  let base=staffDashboard().replace('translate(1520,70)','translate(0,0)');
  let q='';
  q+=rect(0,0,1440,1024,'rgba(0,0,0,0.45)',14);
  q+=card(400,92,640,840,'Display visitor registration QR','Visitors can scan this QR code using their phone camera.');
  q+=badge(860,116,'Active','green');
  q+=input(432,178,576,'Registration type','All visitor categories');
  q+=input(432,260,576,'Counter / location','Main Visitor Counter');
  q+=rect(548,344,344,344,C.white,12,C.border2,2);
  q+=rect(576,372,72,72,C.fg,4)+rect(588,384,48,48,C.white,2)+rect(600,396,24,24,C.fg,2);
  q+=rect(792,372,72,72,C.fg,4)+rect(804,384,48,48,C.white,2)+rect(816,396,24,24,C.fg,2);
  q+=rect(576,588,72,72,C.fg,4)+rect(588,600,48,48,C.white,2)+rect(600,612,24,24,C.fg,2);
  const bits=[[668,376],[692,376],[716,376],[668,400],[716,400],[740,400],[668,424],[692,424],[740,424],[668,472],[692,472],[716,472],[764,472],[812,472],[620,472],[644,496],[692,496],[740,496],[788,496],[836,496],[668,520],[716,520],[764,520],[812,520],[620,544],[644,544],[692,544],[740,544],[788,544],[836,544],[668,568],[716,568],[764,568],[812,568],[668,616],[692,616],[740,616],[764,640],[812,640],[836,616]];
  bits.forEach(([x,y])=>q+=rect(x,y,16,16,C.fg,1));
  q+=text(720,720,'hsaas.upm.edu.my/visit/register',13,650,C.fg,'middle');
  q+=text(720,744,'General visitor registration · Main Visitor Counter',11,400,C.muted,'middle');
  q+=alert(432,770,576,'Privacy-safe QR','Contains the public registration URL only — no visitor or patient data.','info',64);
  q+=button(432,856,112,'Close','secondary')+button(676,856,144,'Print QR','outline')+button(832,856,176,'Full screen');
  q+=text(0,-16,'S06 · Display visitor registration QR',14,700);
  return `<g transform="translate(7440,70)">${base}${q}</g>`;
}

function adminOverview(){
  let c=text(280,112,'Admin / Overview',12,500,C.muted)+text(280,148,'Hospital operations overview',24,700)+text(280,170,'Monitor visitors, physical passes and audit health.',12,400,C.muted)+button(1228,112,176,'View registrations');
  c+=kpi(280,202,266,'Visitors on site','48','+8 since 8:00 AM')+kpi(562,202,266,'Available passes','64 / 120','53% available')+kpi(844,202,266,'Overdue passes','5','Action required','danger')+kpi(1126,202,278,'Pending proofs','3','Sui Testnet');
  c+=card(280,338,744,280,'Visitors by category','Currently checked in');[['Penjaga',21,0],['Vendor',12,1],['Contractor',9,2],['Executive',6,3]].forEach((r,i)=>{const yy=414+i*42;c+=text(304,yy,r[0],12,500)+rect(430,yy-13,480,14,C.bg,7)+rect(430,yy-13,r[1]*20,14,i===0?C.primary:['#C84A4D','#E58A8C','#F5C4C5'][i-1],7)+text(930,yy,String(r[1]),12,700);});
  c+=card(1048,338,356,280,'Pass utilisation')+circle(1226,464,74,C.soft)+circle(1226,464,48,C.white)+text(1226,458,'40%',24,700,C.primary,'middle')+text(1226,481,'In use',11,400,C.muted,'middle')+text(1080,584,'Available 64 · Issued 43 · Overdue 5',10,500,C.muted)+card(280,642,744,300,'Recent activity')+tableHeader(300,690,['Time','Event','Reference','Staff','Status'],[70,180,140,150,160]);[['14:36','Pass returned','P-042 · VR-7N4K2','Nur Izzati','Confirmed'],['14:31','Pass issued','P-118 · VR-2C8LM','Hafiz Omar','Confirmed'],['14:24','Registration verified','VR-6KP91','Siti Aminah','Local only'],['14:05','Pass marked overdue','P-077','System','Pending proof']].forEach((r,i)=>c+=tableRow(300,730+i*48,r,[70,180,140,150,160]));
  c+=card(1048,642,356,300,'Needs attention')+alert(1072,694,308,'5 overdue passes','Review now','danger',58)+alert(1072,764,308,'2 failed proof submissions','Retry','warning',58)+alert(1072,834,308,'3 passes require review','Open inventory','red',58);
  return `<g transform="translate(40,70)">${desktopShell('Admin Overview','Overview',c,'Administrator')}</g>`;
}

function adminInventory(){
  let c=text(280,112,'Admin / Pass Inventory',12,500,C.muted)+text(280,148,'Pass inventory',24,700)+text(280,170,'Manage physical passes and their availability.',12,400,C.muted)+button(1266,112,138,'+ Add pass');
  c+=kpi(280,202,266,'Total passes','120')+kpi(562,202,266,'Available','64')+kpi(844,202,266,'In use','48','43 issued · 5 overdue')+kpi(1126,202,278,'Unavailable','8','3 lost · 5 disabled')+card(280,338,1124,604,'Inventory')+input(300,382,320,'','Search pass code or reference');
  const widths=[90,100,120,100,190,130,130,128];c+=tableHeader(300,458,['Pass','Category','Restriction','Status','Assignment','Due/returned','Updated','Actions'],widths);const rows=[['P-042','Penjaga','Ward 5B','Available','—','Returned 14:36','14:36','•••'],['P-118','Vendor','Facilities','Issued','VR-2C8LM · M*** R.','17:30','14:31','•••'],['P-077','Penjaga','Ward 7A','Overdue','VR-9T3QP · N*** A.','13:00','14:05','•••'],['P-063','Contractor','Engineering','Lost','VR-4HJ20','—','12:42','•••'],['P-015','Executive','Management','Disabled','—','—','20 Aug','•••'],['P-094','Vendor','Pharmacy','Issued','VR-5MX81 · S*** K.','16:45','13:18','•••']];rows.forEach((r,i)=>c+=tableRow(300,498+i*62,r,widths,i===2));
  return `<g transform="translate(1520,70)">${desktopShell('Pass Inventory','Pass Inventory',c,'Administrator')}</g>`;
}

function adminUsers(){
  let c=text(280,112,'Admin / Users & Settings',12,500,C.muted)+text(280,148,'Users and system settings',24,700)+text(280,170,'Control staff access and operational defaults.',12,400,C.muted)+button(1278,112,126,'+ Add user')+badge(280,200,'Users & access','red')+badge(398,200,'Operational settings','neutral')+badge(554,200,'Reference data','neutral');
  c+=card(280,248,744,694,'Users & access')+text(304,298,'Active accounts',11,400,C.muted)+text(304,324,'16',22,700)+text(456,298,'Administrators',11,400,C.muted)+text(456,324,'3',22,700)+text(600,298,'Disabled',11,400,C.muted)+text(600,324,'2',22,700)+input(304,356,300,'','Search name or email');
  const widths=[240,130,90,150,80];c+=tableHeader(304,430,['User','Role','Status','Last sign-in',''],widths);[['Aisyah Rahman','Administrator','Active','Today, 14:18','•••'],['Nur Izzati','Counter Staff','Active','Today, 14:36','•••'],['Hafiz Omar','Counter Staff','Active','Today, 14:31','•••'],['Siti Aminah','Counter Staff','Active','Today, 13:58','•••'],['Daniel Lee','Administrator','Active','Yesterday','•••'],['Farah Nadia','Counter Staff','Disabled','12 Aug 2026','•••']].forEach((r,i)=>c+=tableRow(304,470+i*60,r,widths));
  c+=card(1048,248,356,694,'Operational defaults')+input(1072,306,120,'Overdue threshold','4')+input(1210,306,170,'','hours')+input(1072,390,308,'Staff session timeout','30 minutes')+input(1072,474,308,'Visitor data retention','90 days')+input(1072,558,308,'MRN verification mode','Manual verification')+alert(1072,622,308,'Hospital API','Manual verification is active.','warning',58)+text(1072,716,'Blockchain anchoring',13,650)+rect(1318,699,52,28,C.primary,14)+circle(1355,713,11,C.white)+input(1072,760,308,'Network','Sui Testnet')+input(1072,844,308,'RPC provider','Official Sui gRPC')+button(1244,902,136,'Save changes');
  return `<g transform="translate(3000,70)">${desktopShell('Users & Settings','Users & Access',c,'Administrator')}</g>`;
}

function adminAudit(){
  let c=text(280,112,'Admin / Audit & Blockchain',12,500,C.muted)+text(280,148,'Audit and blockchain verification',24,700)+text(280,170,'Compare local lifecycle records with Sui Testnet proofs.',12,400,C.muted)+button(1270,112,134,'Verify event');
  c+=kpi(280,202,266,'Confirmed proofs','284')+kpi(562,202,266,'Pending','3','Operations unaffected')+kpi(844,202,266,'Failed','2','Retry required','danger')+kpi(1126,202,278,'Integrity checks','284 / 284','Matched')+card(280,338,1124,604,'Blockchain proofs')+input(300,382,420,'','Event ID, pass code or transaction digest');
  const widths=[160,90,90,110,140,80];c+=tableHeader(300,458,['Event','Target','Occurred','Proof','Transaction',''],widths);[['RETURNED · AE-0138','P-042','14:36','Confirmed','8sYk…Qm2P','Open'],['ISSUED · AE-0137','P-118','14:31','Confirmed','5KpL…vT8A','Open'],['OVERDUE · AE-0136','P-077','14:05','Pending','—','Open'],['ADMIN_CHANGED · AE-0135','USR-021','13:52','Failed','—','Retry'],['MARKED_LOST · AE-0134','P-063','12:42','Confirmed','2Fr9…mX7C','Open']].forEach((r,i)=>c+=tableRow(300,498+i*58,r,widths,i===0));
  c+=line(984,442,984,918)+text(1008,474,'Verification result',16,700)+badge(1248,456,'Match','green')+text(1008,526,'Event ID',11,400,C.muted)+text(1008,548,'a7e4a2b4-86f1-4dc2-8ed1',11,600)+text(1008,588,'Local payload hash',11,400,C.muted)+text(1008,612,'0x76b1d4a8…e92c',12,650)+text(1008,654,'Sui on-chain hash',11,400,C.muted)+text(1008,678,'0x76b1d4a8…e92c',12,650)+alert(1008,718,372,'Privacy','Only event ID and hash are anchored on-chain.','info',70)+button(1008,812,120,'Verify again','secondary')+button(1140,812,180,'Open in Sui Explorer','outline');
  return `<g transform="translate(4480,70)">${desktopShell('Audit & Blockchain','Audit & Blockchain',c,'Administrator')}</g>`;
}

const visitor = svg(1330,1390,visitorCategory()+visitorForm()+visitorSuccess(),'HSAAS Visitor Mobile UI');
const staff = svg(8920,1140,staffLogin()+staffDashboard()+staffReview()+issueDialog()+staffReturn()+registrationQrDialog(),'HSAAS Counter Staff UI');
const qrDetail = svg(1440,1140,registrationQrDialog().replace('translate(7440,70)','translate(0,70)'),'HSAAS Registration QR Detail');
const admin = svg(5960,1140,adminOverview()+adminInventory()+adminUsers()+adminAudit(),'HSAAS Administrator UI');

function wireframes(){
  const names=['V01 Category','V02 Form','V03 Success','S01 Login','S02 Dashboard','S03 Review','S04 Issue Dialog','S05 Return','S06 Registration QR','A01 Overview','A02 Inventory','A03 Users','A04 Audit'];
  let body=''; names.forEach((n,i)=>{const col=i%4,row=Math.floor(i/4),x=40+col*380,y=60+row*300;body+=`<g transform="translate(${x},${y})">${rect(0,0,340,250,C.white,10,C.border2)}${text(0,-14,n,13,700)}${rect(16,16,78,218,'#F5F5F5',6)}${rect(110,16,214,28,'#E5E5E5',4)}${rect(110,60,64,48,'#F5F5F5',4,C.border)}${rect(184,60,64,48,'#F5F5F5',4,C.border)}${rect(258,60,66,48,'#F5F5F5',4,C.border)}${rect(110,124,214,94,C.white,4,C.border)}${line(120,148,314,148,C.border2,6)}${line(120,172,294,172,C.border2,6)}${line(120,196,304,196,C.border2,6)}</g>`;}); return svg(1560,1230,body,'HSAAS Low-fidelity Wireframes');
}

function designSystem(){
  let b=text(64,72,'HSAAS / UPM Hospital',14,650,C.primary)+text(64,118,'shadcn/ui Design System',36,750)+text(64,150,'White-first clinical workspace with provisional UPM deep red.',14,400,C.muted);
  b+=text(64,214,'Colour tokens',20,700);
  const swatches=[['Primary',C.primary],['Primary hover',C.primaryHover],['Primary soft',C.soft],['Background',C.bg],['Surface',C.white],['Foreground',C.fg],['Muted',C.muted],['Border',C.border],['Success',C.success],['Warning',C.warning],['Destructive',C.danger]];
  swatches.forEach((s,i)=>{const x=64+(i%6)*190,y=238+Math.floor(i/6)*94;b+=rect(x,y,160,64,s[1],10,s[1]===C.white?C.border:s[1])+text(x,y+84,`${s[0]} · ${s[1]}`,11,550,C.fg);});
  b+=text(64,448,'Typography · Geist',20,700)+text(64,496,'Display / 32 SemiBold',32,650)+text(64,540,'Heading / 24 SemiBold',24,650)+text(64,578,'Body / 16 Regular — clear hospital operational copy.',16,400)+text(64,606,'Label / 14 Medium',14,550)+text(64,632,'Caption / 12 Regular',12,400,C.muted);
  b+=text(64,704,'Buttons',20,700)+button(64,732,140,'Primary')+button(218,732,140,'Secondary','secondary')+button(372,732,140,'Outline','outline')+button(526,732,140,'Ghost','ghost')+button(680,732,140,'Destructive','danger')+rect(834,732,140,40,C.bg,8,C.border)+text(904,757,'Disabled',14,600,C.muted,'middle');
  b+=text(64,826,'Form controls',20,700)+input(64,858,300,'Input label','','Enter value')+input(388,858,300,'Select','Penjaga')+input(712,858,300,'Search','','Search pass code')+rect(1040,884,18,18,C.primary,4,C.primary)+text(1049,897,'✓',10,700,C.white,'middle')+text(1070,898,'Checkbox label',13,500);
  b+=text(64,976,'Badges and alerts',20,700)+badge(64,1000,'Submitted','amber')+badge(170,1000,'Verified','green')+badge(264,1000,'Issued','red')+badge(350,1000,'Overdue','danger')+badge(450,1000,'Sui Testnet','blue')+alert(64,1052,510,'Information','Counter workflow continues while proof is pending.','info',68)+alert(590,1052,510,'Action required','Overdue pass needs staff attention.','danger',68);
  b+=text(64,1196,'Cards, tabs and table',20,700)+card(64,1224,360,150,'Card title','Card description')+text(84,1300,'Structured content stays on white surfaces.',13,400)+button(276,1320,124,'Action');
  b+=card(448,1224,652,330,'Registrations')+badge(468,1264,'All','red')+badge(520,1264,'Waiting','neutral')+badge(600,1264,'Verified','neutral')+tableHeader(468,1310,['Reference','Visitor','Category','Status','Action'],[120,130,110,110,120])+tableRow(468,1350,['HSA-041','Siti N***','Penjaga','Submitted','Review'],[120,130,110,110,120],true)+tableRow(468,1406,['HSA-039','M*** Rahman','Vendor','Verified','Open'],[120,130,110,110,120]);
  b+=text(64,1602,'Dialog and navigation',20,700)+card(64,1630,500,300,'Issue physical pass','Assign an available pass to a verified registration.')+input(88,1700,452,'Pass','PG-017 · Available')+input(88,1784,214,'Due date','22 Aug 2026')+input(326,1784,214,'Due time','4:30 PM')+button(296,1874,110,'Cancel','secondary')+button(418,1874,122,'Issue pass');
  b+=rect(590,1630,250,300,C.white,10,C.border)+logo(614,1654,true)+text(658,1674,'HSAAS',13,700)+['Dashboard','Registrations','Pass Return','Overdue'].forEach((n,i)=>{const yy=1712+i*48,sel=i===1;b+=(sel?rect(606,yy,218,40,C.soft,8)+rect(606,yy,3,40,C.primary,2):'')+text(630,yy+25,n,13,sel?650:500,sel?C.primary:C.fg);});
  b+=alert(866,1630,360,'Accessibility','Focus ring 2 px UPM red with 2 px offset.','red',86)+text(866,1746,'Core radius',12,500,C.muted)+text(866,1772,'Card 10 · Input 8 · Badge 999',14,650)+text(866,1822,'Privacy rule',12,500,C.muted)+text(866,1848,'Mask IC, phone and MRN in tables.',14,650)+text(866,1898,'Blockchain rule',12,500,C.muted)+text(866,1924,'Never block issue or return on Testnet.',14,650);
  return svg(1240,2020,b,'HSAAS shadcn UI Design System');
}

fs.writeFileSync(path.join(OUT,'01_visitor_mobile_ui.svg'),visitor);
fs.writeFileSync(path.join(OUT,'02_counter_staff_ui.svg'),staff);
fs.writeFileSync(path.join(OUT,'03_administrator_ui.svg'),admin);
fs.writeFileSync(path.join(OUT,'00_low_fidelity_wireframes.svg'),wireframes());
fs.writeFileSync(path.join(OUT,'04_shadcn_design_system.svg'),designSystem());
fs.writeFileSync(path.join(OUT,'05_registration_qr_detail.svg'),qrDetail);
console.log(JSON.stringify({outDir:OUT,files:fs.readdirSync(OUT)},null,2));
