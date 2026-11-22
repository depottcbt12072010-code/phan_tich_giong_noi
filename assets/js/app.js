'use strict';
const DB_NAME='voice-intelligence-ai-v1', DB_VERSION=1, STORE='records';
let db, recorder=null, stream=null, chunks=[], recordedBlob=null, selectedAudio=null, timerHandle=null, recStarted=0, recElapsed=0, activeDetail=null, geminiKey='';
const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=v=>new Date(v).toLocaleString('vi-VN',{dateStyle:'medium',timeStyle:'short'});
const fmtTime=n=>{n=Math.max(0,Math.floor(n));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE)){const s=d.createObjectStore(STORE,{keyPath:'id'});s.createIndex('createdAt','createdAt')}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function store(mode='readonly'){return db.transaction(STORE,mode).objectStore(STORE)}
function getAll(){return new Promise((res,rej)=>{const r=store().getAll();r.onsuccess=()=>res(r.result.sort((a,b)=>b.createdAt-a.createdAt));r.onerror=()=>rej(r.error)})}
function put(record){return new Promise((res,rej)=>{const r=store('readwrite').put(record);r.onsuccess=()=>res(record);r.onerror=()=>rej(r.error)})}
function remove(id){return new Promise((res,rej)=>{const r=store('readwrite').delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function showView(view){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('hidden',v.id!==`view-${view}`));document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view));$('pageTitle').textContent={overview:'Tổng quan',records:'Thư viện bản ghi',analysis:'Phân tích AI',settings:'Cài đặt'}[view]||'VOICE INTELLIGENCE';if(view==='analysis')refreshAnalysisSelect()}
function emptyHtml(){return '<div class="empty"><b>Chưa có bản ghi nào</b>Bấm “Tạo bản ghi” để bắt đầu lưu nội dung giọng nói.</div>'}
function cardHtml(r){return `<article class="record-card"><div class="record-icon">♫</div><div class="record-main"><b>${escapeHtml(r.title||'Bản ghi chưa đặt tên')}</b><div class="record-meta">${escapeHtml(r.type||'Khác')} · ${fmtDate(r.createdAt)} · ${fmtTime(r.duration||0)}${r.analysis?' · ✧ Đã phân tích':''}</div></div><div class="record-actions"><button class="mini-btn" data-open="${r.id}">Chi tiết</button><button class="mini-btn" data-play="${r.id}" ${r.audio?'':'disabled'}>▶</button></div></article>`}
async function render(){const records=await getAll();$('recentList').innerHTML=records.slice(0,4).map(cardHtml).join('')||emptyHtml();$('allRecords').innerHTML=records.map(cardHtml).join('')||emptyHtml();const total=records.reduce((s,r)=>s+(r.duration||0),0);$('statRecords').textContent=records.length;$('statDuration').textContent=fmtTime(total);$('statAnalyzed').textContent=records.filter(r=>r.analysis).length;const bytes=records.reduce((s,r)=>s+(r.audio?.size||0)+(new Blob([r.transcript||'']).size),0);$('statStorage').textContent=(bytes/1048576).toFixed(1)+' MB';refreshAnalysisSelect()}
function refreshAnalysisSelect(){if(!$('analysisRecord'))return;const current=$('analysisRecord').value;getAll().then(records=>{$('analysisRecord').innerHTML='<option value="">Chọn bản ghi…</option>'+records.map(r=>`<option value="${r.id}">${escapeHtml(r.title||'Bản ghi')} — ${fmtDate(r.createdAt)}</option>`).join('');if(records.some(r=>r.id===current))$('analysisRecord').value=current})}
function openRecordDialog(){resetDialog();$('recordDialog').showModal()}
function resetDialog(){recorder=null;chunks=[];recordedBlob=null;selectedAudio=null;$('recordTitle').value='';$('recordNotes').value='';$('recordType').selectedIndex=0;$('audioFile').value='';$('audioPreview').innerHTML='';$('recTimer').textContent='00:00';$('recStatus').textContent='Sẵn sàng ghi âm';$('recDot').classList.remove('live');$('startRec').disabled=false;$('stopRec').disabled=true}
async function startRecording(){try{stream=await navigator.mediaDevices.getUserMedia({audio:true});const mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'';recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=()=>{recordedBlob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});selectedAudio=recordedBlob;$('audioPreview').innerHTML=`<audio class="audio-player" controls src="${URL.createObjectURL(recordedBlob)}"></audio><div class="audio-chip">Đã ghi ${fmtTime(recElapsed)} · ${(recordedBlob.size/1024/1024).toFixed(2)} MB</div>`;stream?.getTracks().forEach(t=>t.stop());stream=null};recorder.start(1000);recStarted=Date.now();recElapsed=0;$('recDot').classList.add('live');$('recStatus').textContent='Đang ghi âm…';$('startRec').disabled=true;$('stopRec').disabled=false;timerHandle=setInterval(()=>{$('recTimer').textContent=fmtTime(recElapsed=Math.floor((Date.now()-recStarted)/1000))},250)}catch(e){alert('Không thể truy cập microphone. Hãy kiểm tra quyền microphone và mở ứng dụng qua HTTPS.\n\n'+e.message)}}
function stopRecording(){if(recorder&&recorder.state!=='inactive')recorder.stop();clearInterval(timerHandle);$('recDot').classList.remove('live');$('recStatus').textContent='Đã dừng ghi âm';$('startRec').disabled=false;$('stopRec').disabled=true}
async function saveRecord(){const title=$('recordTitle').value.trim()||'Bản ghi '+new Date().toLocaleString('vi-VN');const audio=selectedAudio||recordedBlob;const record={id:crypto.randomUUID(),title,type:$('recordType').value,createdAt:Date.now(),duration:recElapsed||0,transcript:$('recordNotes').value.trim(),audio:audio?{blob:audio,type:audio.type,size:audio.size,name:audio.name||'recording'}:null,analysis:null};try{await put(record);$('recordDialog').close();await render();showView('records')}catch(e){alert('Không lưu được dữ liệu: '+e.message)}}
async function openDetail(id){
 const r=(await getAll()).find(x=>x.id===id);if(!r)return;activeDetail=id;
 $('detailTitle').textContent=r.title;
 $('detailBody').innerHTML=`<div class="record-meta">${escapeHtml(r.type)} · ${fmtDate(r.createdAt)} · ${fmtTime(r.duration)}</div>
 <h4>Transcript / ghi chú</h4><textarea class="textarea" id="detailTranscriptEditor" rows="8" placeholder="Transcript sẽ hiển thị tại đây...">${escapeHtml(r.transcript||'')}</textarea>
 <div class="help">Bạn có thể chỉnh sửa transcript rồi nhấn “Lưu transcript”. Chép lời bằng Gemini sẽ gửi âm thanh đến API của Google; không gửi nếu bản ghi có thông tin nhạy cảm.</div>
 ${r.audio?'<h4>Âm thanh</h4><audio controls class="audio-player" id="detailAudio"></audio><button class="btn btn-outline" id="downloadRecordAudio">Tải âm thanh gốc</button>':''}
 ${r.analysis?'<h4>Kết quả phân tích</h4><div class="analysis-result">'+escapeHtml(r.analysis)+'</div>':''}`;
 if(r.audio){const el=$('detailAudio');el.src=URL.createObjectURL(r.audio.blob);
  $('downloadRecordAudio').onclick=()=>downloadBlob(r.audio.blob,(r.title||'recording').replace(/[\\/:*?"<>|]/g,'_')+'.'+(r.audio.blob.type.includes('wav')?'wav':r.audio.blob.type.includes('mp4')?'m4a':'webm'))}
 $('detailTranscribe').disabled=!r.audio;
 $('detailTranscribe').textContent='Chép lời bằng Gemini';
 $('detailTranscribe').onclick=()=>transcribeRecord(activeDetail);
 $('detailSaveTranscript').onclick=async()=>{const current=(await getAll()).find(x=>x.id===activeDetail);if(!current)return;current.transcript=$('detailTranscriptEditor').value.trim();current.transcriptUpdatedAt=Date.now();await put(current);await render();$('detailTitle').textContent=current.title;alert('Đã lưu transcript/ghi chú.');};
 $('detailAnalyze').onclick=()=>{if(activeDetail)selectForAnalysis(activeDetail);$('detailDialog').close()};
 $('detailDelete').onclick=async()=>{if(activeDetail&&confirm('Xóa bản ghi này?')){await remove(activeDetail);$('detailDialog').close();await render()}};
 $('detailClose').onclick=()=>$('detailDialog').close();
 $('detailDialog').showModal()
}
function blobToBase64(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)})}
async function audioBlobToWav(blob){
 const arrayBuffer=await blob.arrayBuffer();
 const AudioCtx=window.AudioContext||window.webkitAudioContext;
 if(!AudioCtx)throw new Error('Trình duyệt không hỗ trợ giải mã âm thanh để chuyển WAV.');
 const ctx=new AudioCtx();
 try{
  const decoded=await ctx.decodeAudioData(arrayBuffer);
  const targetRate=16000,srcRate=decoded.sampleRate;
  const length=Math.ceil(decoded.duration*targetRate);
  const mono=new Float32Array(length);
  for(let ch=0;ch<decoded.numberOfChannels;ch++){
   const src=decoded.getChannelData(ch);
   for(let i=0;i<length;i++){const pos=i*srcRate/targetRate,lo=Math.floor(pos),hi=Math.min(lo+1,src.length-1),frac=pos-lo;mono[i]+=(src[lo]||0)*(1-frac)+(src[hi]||0)*frac}
  }
  for(let i=0;i<length;i++)mono[i]/=decoded.numberOfChannels;
  const wav=new ArrayBuffer(44+length*2),v=new DataView(wav);
  const write=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
  write(0,'RIFF');v.setUint32(4,36+length*2,true);write(8,'WAVE');write(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,targetRate,true);v.setUint32(28,targetRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);write(36,'data');v.setUint32(40,length*2,true);
  for(let i=0;i<length;i++){const s=Math.max(-1,Math.min(1,mono[i]));v.setInt16(44+i*2,s<0?s*32768:s*32767,true)}
  return new Blob([wav],{type:'audio/wav'})
 }finally{await ctx.close()}
}
async function transcribeRecord(id){
 if(!geminiKey){alert('Vào Cài đặt, nhập Gemini API key rồi nhấn “Dùng trong phiên” trước.');return}
 const record=(await getAll()).find(x=>x.id===id);if(!record?.audio?.blob){alert('Bản ghi chưa có file âm thanh.');return}
 const btn=$('detailTranscribe');btn.disabled=true;btn.textContent='Đang chuẩn bị âm thanh…';
 try{
  if(record.audio.size>15*1024*1024)throw new Error('File lớn hơn 15 MB. Bản thử nghiệm chép lời qua Gemini chỉ xử lý file nhỏ; hãy dùng bản ghi ngắn hơn.');
  let wav=record.audio.blob;
  if(wav.type!=='audio/wav')wav=await audioBlobToWav(wav);
  if(wav.size>15*1024*1024)throw new Error('Âm thanh sau chuyển đổi lớn hơn 15 MB. Hãy thử file ngắn hơn.');
  btn.textContent='Đang gửi âm thanh…';
  const base64=await blobToBase64(wav);
  const model='gemini-3.5-flash-lite';
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':geminiKey},
   body:JSON.stringify({contents:[{parts:[
    {text:'Chép lời chính xác bằng ngôn ngữ đang được nói (ưu tiên tiếng Việt nếu phù hợp). Giữ nguyên ý, không tóm tắt, không tự thêm từ. Nếu nghe không rõ, đánh dấu [không rõ]. Nếu nhận diện được nhiều người nói, phân biệt Người nói 1, Người nói 2 khi có thể. Chỉ trả về transcript, không thêm lời dẫn.'},
    {inlineData:{mimeType:'audio/wav',data:base64}}
   ]}],generationConfig:{temperature:0,maxOutputTokens:8192}})});
  const data=await response.json();if(!response.ok)throw new Error(data.error?.message||`HTTP ${response.status}`);
  const transcript=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\\n').trim();
  if(!transcript)throw new Error('Gemini không trả về transcript. Thử lại với đoạn âm thanh ngắn hơn hoặc rõ hơn.');
  record.transcript=transcript;record.transcribedAt=Date.now();record.transcriptionModel=model;
  await put(record);await render();$('detailTranscriptEditor').value=transcript;
  alert('Gemini đã chép lời. Vui lòng nghe lại và hiệu chỉnh tên riêng, số liệu trước khi sử dụng.');
 }catch(e){alert('Không chép lời được: '+e.message+'\\n\\nKiểm tra API key, quyền Gemini API, hạn mức Free Tier và định dạng âm thanh.')}
 finally{btn.disabled=false;btn.textContent='Chép lời bằng Gemini'}
}
async function playRecord(id){const r=(await getAll()).find(x=>x.id===id);if(!r?.audio)return;const a=new Audio(URL.createObjectURL(r.audio.blob));a.play().catch(()=>openDetail(id))}
function selectForAnalysis(id){showView('analysis');$('analysisRecord').value=id;getAll().then(rs=>{const r=rs.find(x=>x.id===id);$('analysisText').value=r?.transcript||''})}
async function runGemini(){const text=$('analysisText').value.trim();if(!text){$('analysisStatus').textContent='Vui lòng nhập transcript hoặc văn bản trước.';return}if(!geminiKey){$('analysisStatus').textContent='Chưa có API key trong phiên. Vào Cài đặt để nhập key.';return}const btn=$('runGemini');btn.disabled=true;btn.textContent='Đang phân tích…';$('analysisStatus').textContent='Đang gửi văn bản đến Gemini. Không gửi file âm thanh.';$('analysisResult').textContent='';try{const model='gemini-2.5-flash';const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':geminiKey},body:JSON.stringify({contents:[{parts:[{text:`Bạn là trợ lý phân tích nội dung nói. Trả lời bằng tiếng Việt. Chỉ phân tích nội dung được nói, không suy đoán suy nghĩ ẩn, tính cách, sự trung thực hoặc chẩn đoán. Phân biệt dữ kiện, ý kiến, giả định và điều chưa kiểm chứng. Không bịa nguồn. Cấu trúc: 1) Tóm tắt; 2) Chủ đề/luận điểm; 3) Dữ kiện và nhận định; 4) Điểm cần kiểm chứng; 5) Mâu thuẫn nội bộ nếu có; 6) Hành động tiếp theo.\n\nNỘI DUNG:\n${text}`}]}],generationConfig:{temperature:0.2,maxOutputTokens:1800}})});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||`HTTP ${response.status}`);const result=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n')||'Gemini không trả về nội dung.';$('analysisResult').textContent=result;$('analysisStatus').textContent='Phân tích hoàn tất. Kiểm tra lại các thông tin cần xác minh trước khi sử dụng.';const id=$('analysisRecord').value;if(id){const r=(await getAll()).find(x=>x.id===id);if(r){r.analysis=result;r.analyzedAt=Date.now();await put(r);await render()}}}catch(e){$('analysisStatus').textContent='Lỗi Gemini: '+e.message+' (Kiểm tra key, quyền API, kết nối và hạn mức miễn phí.)'}finally{btn.disabled=false;btn.textContent='✧ Phân tích bằng Gemini'}}
function simpleSummary(){const text=$('analysisText').value.trim();if(!text){$('analysisStatus').textContent='Nhập văn bản để tạo tóm tắt.';return}const sentences=text.split(/(?<=[.!?。！？])\s+/).filter(Boolean);const words=text.trim().split(/\s+/).length;$('analysisResult').textContent=`TÓM TẮT CƠ BẢN (không dùng AI)\n\nSố từ ước tính: ${words}\nSố câu: ${sentences.length}\n\n${sentences.slice(0,5).join(' ')||text.slice(0,700)}\n\nLưu ý: Đây là trích đoạn theo câu, không phải kết quả phân tích ngữ nghĩa.`;$('analysisStatus').textContent='Đã tạo tóm tắt cơ bản trên thiết bị.'}
function exportData(){getAll().then(records=>{const clean=records.map(r=>({...r,audio:r.audio?{name:r.audio.name,type:r.audio.type,size:r.audio.size}:null}));const blob=new Blob([JSON.stringify({app:'VOICE INTELLIGENCE AI',version:'1.0.1-free',exportedAt:new Date().toISOString(),records:clean},null,2)],{type:'application/json'});downloadBlob(blob,'voice-intelligence-backup-'+new Date().toISOString().slice(0,10)+'.json')})}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
async function importData(file){if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.records))throw new Error('File không có danh sách records');for(const r of data.records){if(!r.id)r.id=crypto.randomUUID();r.audio=null;await put(r)}await render();alert('Đã nhập dữ liệu văn bản. File sao lưu JSON không chứa âm thanh.')}catch(e){alert('Không nhập được: '+e.message)}}
function bind(){document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.goto)));$('newRecordTop').onclick=$('newRecord').onclick=$('startFromHero').onclick=openRecordDialog;$('startRec').onclick=startRecording;$('stopRec').onclick=stopRecording;$('saveRecord').onclick=saveRecord;$('cancelRecord').onclick=()=>{$('recordDialog').close();if(recorder&&recorder.state!=='inactive')stopRecording()};$('audioFile').onchange=e=>{selectedAudio=e.target.files[0]||null;if(selectedAudio)$('audioPreview').innerHTML=`<div class="audio-chip">Đã chọn: ${escapeHtml(selectedAudio.name)} · ${(selectedAudio.size/1048576).toFixed(2)} MB</div>`};document.addEventListener('click',e=>{const open=e.target.closest('[data-open]'),play=e.target.closest('[data-play]');if(open)openDetail(open.dataset.open);if(play)playRecord(play.dataset.play)});$('searchRecords').oninput=async e=>{const q=e.target.value.toLowerCase();const rs=await getAll();$('allRecords').innerHTML=rs.filter(r=>(r.title+' '+r.transcript+' '+r.type).toLowerCase().includes(q)).map(cardHtml).join('')||emptyHtml()};$('analysisRecord').onchange=async e=>{const r=(await getAll()).find(x=>x.id===e.target.value);$('analysisText').value=r?.transcript||''};$('runGemini').onclick=runGemini;$('localSummary').onclick=simpleSummary;$('toggleKey').onclick=()=>{$('geminiKey').type=$('geminiKey').type==='password'?'text':'password';$('toggleKey').textContent=$('geminiKey').type==='password'?'Hiện':'Ẩn'};$('saveKey').onclick=()=>{geminiKey=$('geminiKey').value.trim();$('geminiKey').value='';$('analysisStatus').textContent=geminiKey?'API key được giữ trong bộ nhớ phiên.':'Bạn chưa nhập key.';alert(geminiKey?'Đã nhận key trong phiên hiện tại. Không đóng tab nếu muốn giữ phiên.':'Chưa nhập API key.')};$('clearKey').onclick=()=>{geminiKey='';$('geminiKey').value='';alert('Đã xóa key khỏi bộ nhớ phiên.')};$('exportData').onclick=exportData;$('importData').onchange=e=>importData(e.target.files[0]);$('deleteAll').onclick=async()=>{if(!confirm('Xóa tất cả bản ghi trên thiết bị này? Hành động không thể hoàn tác. Hãy xuất bản sao lưu trước.'))return;const rs=await getAll();for(const r of rs)await remove(r.id);await render()}}
(async()=>{try{db=await openDB();bind();await render();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});if(location.protocol==='file:')console.warn('PWA needs HTTPS or localhost.')}catch(e){alert('Không khởi tạo được kho dữ liệu trình duyệt: '+e.message)}})();
