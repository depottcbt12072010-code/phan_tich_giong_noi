'use strict';
const DB_NAME='voice-intelligence-ai-v1', DB_VERSION=1, STORE='records';
let db, recorder=null, stream=null, chunks=[], recordedBlob=null, selectedAudio=null, timerHandle=null, recStarted=0, recElapsed=0, activeDetail=null, geminiKey=(()=>{try{return sessionStorage.getItem('voice_intelligence_gemini_key')||''}catch(e){return ''}})();
const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=v=>new Date(v).toLocaleString('vi-VN',{dateStyle:'medium',timeStyle:'short'});
const fmtTime=n=>{n=Math.max(0,Math.floor(n));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE)){const s=d.createObjectStore(STORE,{keyPath:'id'});s.createIndex('createdAt','createdAt')}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function store(mode='readonly'){return db.transaction(STORE,mode).objectStore(STORE)}
function getAll(){return new Promise((res,rej)=>{const r=store().getAll();r.onsuccess=()=>res(r.result.sort((a,b)=>b.createdAt-a.createdAt));r.onerror=()=>rej(r.error)})}
function put(record){return new Promise((res,rej)=>{const r=store('readwrite').put(record);r.onsuccess=()=>res(record);r.onerror=()=>rej(r.error)})}
function remove(id){return new Promise((res,rej)=>{const r=store('readwrite').delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function showView(view){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('hidden',v.id!==`view-${view}`));document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view));$('pageTitle').textContent={overview:'Tổng quan',records:'Thư viện bản ghi',analysis:'Phân tích AI',knowledge:'Kho tri thức',reports:'Báo cáo tổng hợp',settings:'Cài đặt'}[view]||'VOICE INTELLIGENCE';if(view==='analysis')refreshAnalysisSelect();if(view==='knowledge'){renderKnowledge();renderSynthesisHistory();renderActionItems();renderProgressHistory();setDefaultProgressDates()}if(view==='reports')initReportDates()}
function emptyHtml(){return '<div class="empty"><b>Chưa có bản ghi nào</b>Bấm “Tạo bản ghi” để bắt đầu lưu nội dung giọng nói.</div>'}
function cardHtml(r){return `<article class="record-card"><div class="record-icon">♫</div><div class="record-main"><b>${escapeHtml(r.title||'Bản ghi chưa đặt tên')}</b><div class="record-meta">${escapeHtml(r.type||'Khác')} · ${fmtDate(r.createdAt)} · ${fmtTime(r.duration||0)}${r.analysis?' · ✧ Đã phân tích':''}</div></div><div class="record-actions"><button class="mini-btn" data-open="${r.id}">Chi tiết</button><button class="mini-btn" data-play="${r.id}" ${r.audio?'':'disabled'}>▶</button></div></article>`}
async function render(){const records=await getAll();$('recentList').innerHTML=records.slice(0,4).map(cardHtml).join('')||emptyHtml();$('allRecords').innerHTML=records.map(cardHtml).join('')||emptyHtml();const total=records.reduce((s,r)=>s+(r.duration||0),0);$('statRecords').textContent=records.length;$('statDuration').textContent=fmtTime(total);$('statAnalyzed').textContent=records.filter(r=>r.analysis).length;const bytes=records.reduce((s,r)=>s+(r.audio?.size||0)+(new Blob([r.transcript||'']).size),0);$('statStorage').textContent=(bytes/1048576).toFixed(1)+' MB';refreshAnalysisSelect()}
function refreshAnalysisSelect(){if(!$('analysisRecord'))return;const current=$('analysisRecord').value;getAll().then(records=>{$('analysisRecord').innerHTML='<option value="">Chọn bản ghi…</option>'+records.map(r=>`<option value="${r.id}">${escapeHtml(r.title||'Bản ghi')} — ${fmtDate(r.createdAt)}</option>`).join('');if(records.some(r=>r.id===current))$('analysisRecord').value=current})}
function openRecordDialog(){resetDialog();$('recordDialog').showModal()}
function resetDialog(){recorder=null;chunks=[];recordedBlob=null;selectedAudio=null;$('recordTitle').value='';$('recordNotes').value='';$('recordType').selectedIndex=0;$('audioFile').value='';$('audioPreview').innerHTML='';$('recTimer').textContent='00:00';$('recStatus').textContent='Sẵn sàng ghi âm';$('recDot').classList.remove('live');$('startRec').disabled=false;$('stopRec').disabled=true}
function microphoneHelp(error){
 const name=error?.name||'';
 if(!window.isSecureContext)return 'Trang hiện không ở ngữ cảnh bảo mật. Hãy mở URL GitHub Pages bắt đầu bằng https://.';
 if(!navigator.mediaDevices?.getUserMedia)return 'Trình duyệt hoặc cách mở trang hiện tại không hỗ trợ microphone. Hãy mở URL trực tiếp bằng Safari (iPhone) hoặc Chrome (Android), không mở trong trình duyệt tích hợp.';
 if(name==='NotAllowedError'||name==='PermissionDeniedError')return 'Quyền microphone đang bị từ chối hoặc bị chặn. Hãy mở cài đặt quyền của trang web và bật Microphone, đồng thời kiểm tra quyền microphone của hệ điều hành.';
 if(name==='NotFoundError'||name==='DevicesNotFoundError')return 'Không tìm thấy microphone trên thiết bị.';
 if(name==='NotReadableError'||name==='TrackStartError')return 'Microphone đang được ứng dụng khác sử dụng hoặc hệ điều hành không cho phép mở thiết bị. Đóng ứng dụng đang dùng microphone rồi thử lại.';
 if(name==='SecurityError')return 'Trình duyệt chặn microphone vì thiết lập bảo mật. Mở trang bằng HTTPS và cho phép microphone.';
 return `Không thể mở microphone (${name||'lỗi không xác định'}). Hãy kiểm tra quyền và thử mở trang trực tiếp bằng trình duyệt.`;
}
function preferredRecorderMime(){
 if(!window.MediaRecorder)return '';
 const candidates=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];
 for(const type of candidates){try{if(MediaRecorder.isTypeSupported?.(type))return type}catch(e){}}
 return '';
}
async function startRecording(){
 if(!window.isSecureContext){$('recStatus').textContent='Cần mở ứng dụng qua HTTPS';alert(microphoneHelp());return}
 if(!navigator.mediaDevices?.getUserMedia){$('recStatus').textContent='Microphone không được hỗ trợ trong trình duyệt này';alert(microphoneHelp());return}
 if(!window.MediaRecorder){$('recStatus').textContent='Trình duyệt chưa hỗ trợ ghi âm trực tiếp';alert('Trình duyệt này không hỗ trợ MediaRecorder. Bạn vẫn có thể chọn file âm thanh ở mục “Đính kèm âm thanh” để lưu và phân tích.');return}
 $('startRec').disabled=true;$('recStatus').textContent='Đang xin quyền microphone…';
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  const mime=preferredRecorderMime();recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);const activeRecorder=recorder;
  chunks=[];recElapsed=0;
  activeRecorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  activeRecorder.onerror=e=>{$('recStatus').textContent='Lỗi trong quá trình ghi âm';console.error('MediaRecorder error',e.error)};
  activeRecorder.onstop=()=>{
   recordedBlob=new Blob(chunks,{type:activeRecorder.mimeType||chunks[0]?.type||'audio/webm'});selectedAudio=recordedBlob;
   $('audioPreview').innerHTML=`<audio class="audio-player" controls src="${URL.createObjectURL(recordedBlob)}"></audio><div class="audio-chip">Đã ghi ${fmtTime(recElapsed)} · ${(recordedBlob.size/1024/1024).toFixed(2)} MB</div>`;
   stream?.getTracks().forEach(t=>t.stop());stream=null;$('recStatus').textContent='Đã dừng — có thể nghe lại và lưu';$('startRec').disabled=false;$('stopRec').disabled=true;
  };
  activeRecorder.start(1000);recStarted=Date.now();$('recDot').classList.add('live');$('recStatus').textContent='Đang ghi âm…';$('startRec').disabled=true;$('stopRec').disabled=false;
  timerHandle=setInterval(()=>{$('recTimer').textContent=fmtTime(recElapsed=Math.floor((Date.now()-recStarted)/1000))},250);
 }catch(e){stream?.getTracks().forEach(t=>t.stop());stream=null;$('recStatus').textContent='Không thể mở microphone';$('startRec').disabled=false;alert(microphoneHelp(e)+'\n\nChi tiết: '+(e.message||e.name||''))}
}
function stopRecording(){
 if(recorder&&recorder.state!=='inactive'){recElapsed=Math.floor((Date.now()-recStarted)/1000);try{recorder.stop()}catch(e){}}
 clearInterval(timerHandle);timerHandle=null;$('recTimer').textContent=fmtTime(recElapsed);$('recDot').classList.remove('live');$('stopRec').disabled=true;
}
async function saveRecord(){if(recorder&&recorder.state!=='inactive'){alert('Vui lòng nhấn Dừng ghi âm trước khi lưu.');return}const title=$('recordTitle').value.trim()||'Bản ghi '+new Date().toLocaleString('vi-VN');const audio=selectedAudio||recordedBlob;const record={id:crypto.randomUUID(),title,type:$('recordType').value,createdAt:Date.now(),duration:recElapsed||0,transcript:$('recordNotes').value.trim(),audio:audio?{blob:audio,type:audio.type,size:audio.size,name:audio.name||'recording'}:null,analysis:null};try{await put(record);$('recordDialog').close();await render();showView('records')}catch(e){alert('Không lưu được dữ liệu: '+e.message)}}
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

const GEMINI_PRIMARY_MODEL='gemini-3.8-flash';
async function getGeminiModelChain(){
 const cacheKey='voice_intelligence_gemini_models_v1';
 try{
  const cached=JSON.parse(sessionStorage.getItem(cacheKey)||'null');
  if(cached?.at&&Date.now()-cached.at<10*60*1000&&Array.isArray(cached.models)&&cached.models.length)return cached.models;
 }catch(e){}
 try{
  const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models',{
   method:'GET',headers:{'x-goog-api-key':geminiKey}
  });
  if(res.ok){
   const body=await res.json();
   const names=(body.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')&&/flash/i.test(m.name||'')&&!/(embedding|tts|live|image|audio)/i.test(m.name||''))
    .map(m=>String(m.name||'').replace(/^models\//,''));
   const unique=[...new Set(names)];
   unique.sort((a,b)=>(a===GEMINI_PRIMARY_MODEL?-1:b===GEMINI_PRIMARY_MODEL?1:a.localeCompare(b)));
   const selected=unique.slice(0,4);
   if(selected.length){try{sessionStorage.setItem(cacheKey,JSON.stringify({at:Date.now(),models:selected}))}catch(e){};return selected}
  }
 }catch(e){}
 // Safe fallback: only the known primary model. Never fabricate fallback model IDs.
 return [GEMINI_PRIMARY_MODEL];
}
const waitMs=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function retryDelayMs(response,data,attempt){
 const h=response?.headers?.get('Retry-After');
 if(h){const n=Number(h);if(Number.isFinite(n))return Math.min(60000,Math.max(1000,n*1000));const d=Date.parse(h)-Date.now();if(Number.isFinite(d)&&d>0)return Math.min(60000,d)}
 const details=data?.error?.details||[];
 const ri=details.find(x=>String(x['@type']||'').includes('RetryInfo')||x.retryDelay);
 const raw=ri?.retryDelay;
 if(typeof raw==='string'&&/^\d+(\.\d+)?s$/.test(raw))return Math.min(60000,Math.max(1000,parseFloat(raw)*1000));
 return Math.min(12000,1200*(2**attempt)+Math.floor(Math.random()*700));
}
function geminiErrorMessage(data,status){
 const msg=data?.error?.message||data?.message||`HTTP ${status}`;
 return `${msg} (HTTP ${status})`;
}
async function callGeminiResilient(contents,generationConfig,{onStatus=()=>{},modelChain=null}={}){
 modelChain=modelChain||await getGeminiModelChain();
 let lastError=null;
 for(let m=0;m<modelChain.length;m++){
  const model=modelChain[m];
  let shouldFallback=false;
  for(let attempt=0;attempt<2;attempt++){
   onStatus(m===0?`Đang gọi Gemini (${model})…`:`Model trước quá tải; đang thử model dự phòng ${model}…`);
   let response,data;
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),60000);
   try{
    response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
     method:'POST',
     headers:{'Content-Type':'application/json','x-goog-api-key':geminiKey},
     body:JSON.stringify({contents,generationConfig}),
     signal:controller.signal
    });
    data=await response.json().catch(()=>({}));
   }catch(e){
    if(e.name==='AbortError')lastError=new Error('Yêu cầu Gemini quá thời gian chờ 60 giây. Nội dung của bạn vẫn được giữ nguyên.');
    else lastError=new Error('Không kết nối được Gemini. Kiểm tra Internet rồi thử lại.');
    shouldFallback=true;
   }finally{clearTimeout(timeout)}
   if(response?.ok)return {data,model};
   const status=response?.status||0;
   lastError=new Error(geminiErrorMessage(data,status));
   if(status===429){
    lastError.status=429;lastError.apiMessage=data?.error?.message||'';
    throw lastError;
   }
   if([408,500,502,503,504].includes(status)||!response){
    if(attempt===0){
     const delay=retryDelayMs(response,data,attempt);
     onStatus(`Gemini đang bận; tự thử lại sau ${Math.ceil(delay/1000)} giây…`);
     await waitMs(delay);
     continue;
    }
    shouldFallback=true;
    break;
   }
   lastError.status=status;lastError.apiMessage=data?.error?.message||'';
   throw lastError;
  }
  if(shouldFallback&&m<modelChain.length-1){
   onStatus(`Model ${model} tạm thời không đáp ứng. Đang chuyển model dự phòng…`);
   await waitMs(350+Math.floor(Math.random()*500));
   continue;
  }
  if(lastError)break;
 }
 if(lastError)throw lastError;
 throw new Error('Gemini hiện không thể xử lý yêu cầu. Hãy thử lại sau.');
}
function explainGeminiError(error){
 const status=error?.status;
 if(status===429)return 'Gemini đã giới hạn yêu cầu (429). Đây thường là hạn mức RPM/TPM/RPD hoặc quota của project, không phải lỗi transcript. Không retry liên tục; kiểm tra AI Studio → Usage / Rate limits, rồi chờ hạn mức reset. Không bật billing nếu muốn giữ chi phí 0.';
 if(status===503||[500,502,504].includes(status))return 'Các model dự phòng đều đang bận hoặc không khả dụng (5xx). Transcript vẫn được giữ. Hãy thử lại sau vài phút; ứng dụng đã tự retry có giới hạn.';
 if(status===400)return 'Gemini từ chối request (400). Kiểm tra nội dung đầu vào hoặc cấu hình request.';
 if(status===401||status===403)return 'Gemini không chấp nhận API key hoặc key chưa được cấp quyền dùng Gemini API. Kiểm tra key trong AI Studio và quyền API.';
 if(status===404)return 'Model hoặc endpoint không tồn tại/không khả dụng với key này. Cần cập nhật model ID.';
 if(error?.name==='AbortError')return 'Gemini phản hồi quá lâu. Hãy thử với văn bản ngắn hơn.';
 return error?.message||'Lỗi không xác định khi gọi Gemini.';
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
  const contents=[{parts:[
    {text:'Chép lời chính xác bằng ngôn ngữ đang được nói (ưu tiên tiếng Việt nếu phù hợp). Giữ nguyên ý, không tóm tắt, không tự thêm từ. Nếu nghe không rõ, đánh dấu [không rõ]. Nếu nhận diện được nhiều người nói, phân biệt Người nói 1, Người nói 2 khi có thể. Chỉ trả về transcript, không thêm lời dẫn.'},
    {inlineData:{mimeType:'audio/wav',data:base64}}
   ]}];
  const {data,model}=await callGeminiResilient(contents,{temperature:0,maxOutputTokens:8192},{onStatus:s=>btn.textContent=s});
  const transcript=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n').trim();
  if(!transcript)throw new Error('Gemini không trả về transcript. Thử lại với đoạn âm thanh ngắn hơn hoặc rõ hơn.');
  record.transcript=transcript;record.transcribedAt=Date.now();record.transcriptionModel=model;
  await put(record);await render();$('detailTranscriptEditor').value=transcript;
  alert('Gemini đã chép lời. Vui lòng nghe lại và hiệu chỉnh tên riêng, số liệu trước khi sử dụng.');
 }catch(e){alert('Không chép lời được: '+e.message+'\\n\\nKiểm tra API key, quyền Gemini API, hạn mức Free Tier và định dạng âm thanh.')}
 finally{btn.disabled=false;btn.textContent='Chép lời bằng Gemini'}
}
async function playRecord(id){const r=(await getAll()).find(x=>x.id===id);if(!r?.audio)return;const a=new Audio(URL.createObjectURL(r.audio.blob));a.play().catch(()=>openDetail(id))}
function selectForAnalysis(id){showView('analysis');$('analysisRecord').value=id;getAll().then(rs=>{const r=rs.find(x=>x.id===id);$('analysisText').value=r?.transcript||''})}
async function runGemini(){
 const text=$('analysisText').value.trim();
 if(!text){$('analysisStatus').textContent='Vui lòng nhập transcript hoặc văn bản trước.';return}
 if(!geminiKey){$('analysisStatus').textContent='Chưa có API key trong phiên. Vào Cài đặt để nhập key.';return}
 const btn=$('runGemini');btn.disabled=true;btn.textContent='Đang phân tích…';
 $('analysisStatus').textContent='Đang gửi văn bản đến Gemini. Nội dung nhập vẫn được giữ trong ô văn bản.';
 $('analysisResult').textContent='';
 try{
  const contents=[{parts:[{text:`Bạn là trợ lý phân tích nội dung nói. Trả lời bằng tiếng Việt. Chỉ phân tích nội dung được nói, không suy đoán suy nghĩ ẩn, tính cách, sự trung thực hoặc chẩn đoán. Phân biệt dữ kiện, ý kiến, giả định và điều chưa kiểm chứng. Không bịa nguồn. Cấu trúc: 1) Tóm tắt; 2) Chủ đề/luận điểm; 3) Dữ kiện và nhận định; 4) Điểm cần kiểm chứng; 5) Mâu thuẫn nội bộ nếu có; 6) Hành động tiếp theo.

NỘI DUNG:
${text}`}]}];
  const {data,model}=await callGeminiResilient(contents,{temperature:0.2,maxOutputTokens:1800},{onStatus:s=>$('analysisStatus').textContent=s});
  const result=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n').trim()||'Gemini không trả về nội dung.';
  if(!data.candidates?.[0]?.content?.parts?.some(p=>p.text?.trim()))throw new Error('Gemini trả về phản hồi rỗng hoặc bị chặn. Hãy thử rút ngắn văn bản.');
  $('analysisResult').textContent=result;
  $('analysisStatus').textContent=`Phân tích hoàn tất bằng ${model}. Kiểm tra lại thông tin cần xác minh trước khi sử dụng.`;
  const id=$('analysisRecord').value;
  if(id){const r=(await getAll()).find(x=>x.id===id);if(r){r.analysis=result;r.analyzedAt=Date.now();r.analysisModel=model;await put(r);await render()}}
 }catch(e){
  const details=explainGeminiError(e);
  $('analysisStatus').textContent='Chưa hoàn tất phân tích. '+details;
  $('analysisResult').textContent='Nội dung transcript của bạn vẫn được giữ nguyên. Bạn có thể dùng “Tạo tóm tắt cơ bản” trong lúc Gemini đang bận.';
 }finally{btn.disabled=false;btn.textContent='✧ Phân tích bằng Gemini'}
}
function simpleSummary(){const text=$('analysisText').value.trim();if(!text){$('analysisStatus').textContent='Nhập văn bản để tạo tóm tắt.';return}const sentences=text.split(/(?<=[.!?。！？])\s+/).filter(Boolean);const words=text.trim().split(/\s+/).length;$('analysisResult').textContent=`TÓM TẮT CƠ BẢN (không dùng AI)\n\nSố từ ước tính: ${words}\nSố câu: ${sentences.length}\n\n${sentences.slice(0,5).join(' ')||text.slice(0,700)}\n\nLưu ý: Đây là trích đoạn theo câu, không phải kết quả phân tích ngữ nghĩa.`;$('analysisStatus').textContent='Đã tạo tóm tắt cơ bản trên thiết bị.'}

const KNOWLEDGE_STOP=new Set('và là của có cho với trong một các những thì mà được bị từ đến khi này đó kia như theo về tại đang sẽ đã nếu hoặc nhưng cũng còn rất không chưa tôi bạn chúng họ người việc thông tin nội dung bản ghi cuộc họp nói rằng'.split(' '));
function tokenizeVi(text){
 const normalized=String(text||'').toLocaleLowerCase('vi-VN');let tokens=[];
 try{if(Intl.Segmenter){const seg=new Intl.Segmenter('vi',{granularity:'word'});for(const x of seg.segment(normalized)){if(x.isWordLike)tokens.push(x.segment)}}else tokens=normalized.match(/[\\p{L}\\p{N}]{2,}/gu)||[]}catch(e){tokens=normalized.match(/[\\p{L}\\p{N}]{2,}/gu)||[]}
 return tokens.map(t=>t.replace(/[.,;:!?()[\\]{}"'“”]/g,'')).filter(t=>t.length>2&&!KNOWLEDGE_STOP.has(t)&&!/^\\d+$/.test(t));
}
function localSearchRecords(records,query){
 const terms=tokenizeVi(query);if(!terms.length)return [];
 return records.map(r=>{const body=[r.title,r.type,r.transcript,r.analysis].filter(Boolean).join(' ');const tokens=tokenizeVi(body),set=new Set(tokens);let score=0;
  for(const term of terms){if(set.has(term))score+=3;else if(tokens.some(t=>t.includes(term)))score+=1}
  if(String(r.title||'').toLocaleLowerCase('vi-VN').includes(query.toLocaleLowerCase('vi-VN')))score+=5;
  const at=body.toLocaleLowerCase('vi-VN').indexOf(query.toLocaleLowerCase('vi-VN'));const snippet=at>=0?body.slice(Math.max(0,at-90),Math.min(body.length,at+query.length+180)):body.slice(0,260);
  return {r,score,snippet}
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.r.createdAt-a.r.createdAt);
}
async function searchKnowledge(){
 const query=$('knowledgeQuery').value.trim(),records=await getAll();if(!query){$('knowledgeStatus').textContent='Nhập từ khóa hoặc câu hỏi ngắn để tìm trong bản ghi cục bộ.';$('knowledgeResults').innerHTML='';return}
 const results=localSearchRecords(records,query);$('knowledgeStatus').textContent=`Tìm thấy ${results.length} bản ghi phù hợp với “${query}”. Kết quả khớp từ khóa cục bộ, chưa phải đánh giá ngữ nghĩa AI.`;
 $('knowledgeResults').innerHTML=results.slice(0,30).map(x=>`<article class="knowledge-result"><div class="record-meta">${escapeHtml(x.r.type||'Bản ghi')} · ${fmtDate(x.r.createdAt)} · Điểm khớp ${x.score}</div><b>${escapeHtml(x.r.title||'Bản ghi')}</b><p>${escapeHtml(x.snippet)}${x.snippet.length>=260?'…':''}</p><button class="btn btn-outline" data-open="${x.r.id}">Mở nguồn</button></article>`).join('')||'<div class="empty">Chưa tìm thấy nội dung phù hợp. Thử từ khóa khác hoặc kiểm tra transcript.</div>';
}
async function renderKnowledge(){
 const records=await getAll(),counts=new Map();for(const r of records){const unique=new Set(tokenizeVi([r.title,r.transcript].filter(Boolean).join(' ')));for(const word of unique)counts.set(word,(counts.get(word)||0)+1)}
 const topics=[...counts.entries()].filter(([w,n])=>n>=2).sort((a,b)=>b[1]-a[1]).slice(0,24);
 $('knowledgeTopics').innerHTML=topics.map(([word,count])=>`<button class="topic-chip" data-topic="${escapeHtml(word)}">${escapeHtml(word)} <span>${count}</span></button>`).join('')||'<div class="empty">Cần ít nhất hai bản ghi có từ khóa lặp lại để gợi ý chủ đề.</div>';
 $('knowledgeStatus').textContent=`Kho cục bộ gồm ${records.length} bản ghi. Tìm kiếm và thống kê từ khóa không gửi dữ liệu ra ngoài.`;
}


function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)})}
function dataUrlToBlob(dataUrl){const [head,b64]=String(dataUrl).split(',');const mime=(head.match(/data:([^;]+)/)||[])[1]||'application/octet-stream';const raw=atob(b64),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:mime})}
async function exportData(){
 try{const records=await getAll(),payload=[];let total=0;
  for(const r of records){const item={...r};if(r.audio?.blob){total+=r.audio.blob.size;item.audio={name:r.audio.name||'recording',type:r.audio.type||r.audio.blob.type,size:r.audio.size||r.audio.blob.size,dataUrl:await blobToDataUrl(r.audio.blob)}}payload.push(item)}
  if(total>100*1024*1024&&!confirm(`Âm thanh khoảng ${(total/1048576).toFixed(0)} MB. JSON sẽ lớn hơn do mã hóa base64 và có thể không xuất được trên điện thoại. Bạn vẫn muốn tiếp tục?`))return;
  const blob=new Blob([JSON.stringify({app:'VOICE INTELLIGENCE AI',version:'2.0.1-free',exportedAt:new Date().toISOString(),records:payload},null,2)],{type:'application/json'});
  downloadBlob(blob,'voice-intelligence-backup-'+new Date().toISOString().slice(0,10)+'.json');
 }catch(e){alert('Không thể xuất sao lưu. Có thể dung lượng âm thanh vượt bộ nhớ trình duyệt: '+e.message)}
}
async function importData(file){
 if(!file)return;if(!confirm('Nhập sao lưu sẽ thêm bản ghi vào kho hiện tại. Nếu trùng ID, bản ghi cũ sẽ được cập nhật. Tiếp tục?'))return;
 try{const data=JSON.parse(await file.text());if(!Array.isArray(data.records))throw new Error('File không có danh sách records');
  for(const raw of data.records){const r={...raw};if(!r.id)r.id=crypto.randomUUID();
   if(r.audio?.dataUrl){const blob=dataUrlToBlob(r.audio.dataUrl);r.audio={blob,type:r.audio.type||blob.type,size:blob.size,name:r.audio.name||'recording'}}
   else if(r.audio&&!r.audio.blob)r.audio=null;await put(r)}
  await render();alert(`Đã nhập ${data.records.length} bản ghi. Nếu file có âm thanh, âm thanh đã được khôi phục.`);
 }catch(e){alert('Không nhập được bản sao lưu: '+e.message)}
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}

const SYNTHESIS_HISTORY_KEY='voice_intelligence_synthesis_reports_v1';
function getSynthesisHistory(){try{const x=JSON.parse(localStorage.getItem(SYNTHESIS_HISTORY_KEY)||'[]');return Array.isArray(x)?x:[]}catch(e){return []}}
function saveSynthesisHistory(items){try{localStorage.setItem(SYNTHESIS_HISTORY_KEY,JSON.stringify(items.slice(0,10)))}catch(e){$('synthesisStatus').textContent='Báo cáo quá lớn để lưu trong bộ nhớ trình duyệt; kết quả vẫn hiển thị.'}}
function renderSynthesisHistory(){const items=getSynthesisHistory();$('synthesisHistory').innerHTML=items.map((x,i)=>`<button class="synthesis-history-item" data-report="${i}"><b>${escapeHtml(x.question||'Báo cáo')}</b><span>${escapeHtml(new Date(x.createdAt).toLocaleString('vi-VN'))} · ${x.sourceCount||0} nguồn</span></button>`).join('')||'<div class="empty">Chưa có báo cáo liên bản ghi.</div>'}
function renderSynthesisReport(report){$('synthesisResult').textContent=report||''}
async function runKnowledgeSynthesis(){
 const question=$('synthesisQuestion').value.trim();
 if(!question){$('synthesisStatus').textContent='Hãy nhập câu hỏi hoặc mục tiêu phân tích.';return}
 if(!geminiKey){$('synthesisStatus').textContent='Chưa có Gemini API key trong phiên. Vào Cài đặt để nhập key. Tìm kiếm cục bộ vẫn hoạt động miễn phí.';return}
 const all=await getAll(),searchable=all.filter(r=>(r.transcript||r.analysis||'').trim());
 if(!searchable.length){$('synthesisStatus').textContent='Kho chưa có transcript hoặc kết quả phân tích để tổng hợp.';return}
 let ranked=localSearchRecords(searchable,question).filter(x=>x.score>0).slice(0,8).map(x=>x.r);
 if(!ranked.length)ranked=searchable.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,6);
 let remaining=26000;const sources=[];
 for(const r of ranked){if(remaining<=0)break;const body=String(r.transcript||r.analysis||'').slice(0,Math.min(5500,remaining));if(!body.trim())continue;remaining-=body.length;sources.push({ref:`[R${sources.length+1}]`,title:r.title||'Bản ghi không tên',type:r.type||'Khác',date:r.createdAt?new Date(r.createdAt).toLocaleString('vi-VN'):'Không rõ ngày',text:body})}
 if(!sources.length){$('synthesisStatus').textContent='Không có nội dung phù hợp để gửi phân tích.';return}
 const btn=$('runSynthesis');btn.disabled=true;btn.textContent='Đang tổng hợp…';$('synthesisResult').textContent='';
 $('synthesisStatus').textContent=`Đang gửi ${sources.length} nguồn liên quan lên Gemini. Chỉ transcript/văn bản được gửi, không gửi âm thanh gốc.`;
 const sourceText=sources.map(s=>`${s.ref} | Tiêu đề: ${s.title} | Loại: ${s.type} | Ngày: ${s.date}\nNội dung:\n${s.text}`).join('\n\n---\n\n');
 const prompt=`Bạn là hệ thống tổng hợp tri thức cá nhân. Trả lời bằng tiếng Việt, dựa CHỈ trên nguồn và câu hỏi. Không suy đoán suy nghĩ ẩn, tính cách, sự trung thực, chẩn đoán hoặc ý định riêng tư. Không bịa sự kiện, ngày, nguồn hay trích dẫn. Mỗi kết luận quan trọng phải có mã nguồn [R1], [R2]... và trích dẫn ngắn nguyên văn (tối đa 20 từ). Nếu thiếu bằng chứng, nói "Chưa đủ bằng chứng". Phân biệt thông tin trực tiếp, suy luận thận trọng và nội dung cần kiểm chứng. Không xem sự lặp lại là bằng chứng chắc chắn.
CÂU HỎI: ${question}
ĐẦU RA:
1. Tóm tắt câu trả lời.
2. Sự kiện/thông tin đã nêu (gắn nguồn và trích dẫn).
3. Quyết định, cam kết hoặc việc cần làm; người phụ trách/thời hạn chỉ ghi nếu nguồn nêu rõ.
4. Điểm nhất quán và khác biệt giữa nguồn; không gọi là mâu thuẫn nếu khác thời điểm/ngữ cảnh có thể giải thích.
5. Câu hỏi còn bỏ ngỏ/nội dung cần xác minh.
6. Bước tiếp theo đề xuất, ghi rõ là đề xuất AI.
NGUỒN:
${sourceText}`;
 try{
  const {data,model}=await callGeminiResilient([{parts:[{text:prompt}]}],{temperature:0.15,maxOutputTokens:3000},{onStatus:s=>$('synthesisStatus').textContent=s});
  const output=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n').trim();if(!output)throw new Error('Gemini không trả về nội dung.');
  const sourceCatalog='\\n\\nNGUỒN ĐƯỢC ĐƯA VÀO PHÂN TÍCH\\n'+sources.map(s=>`${s.ref} ${s.title} — ${s.date}`).join('\\n');
  const reportOutput=output+sourceCatalog;
  renderSynthesisReport(reportOutput);
  const report={question,createdAt:Date.now(),sourceCount:sources.length,sourceRefs:sources.map(s=>({ref:s.ref,title:s.title,date:s.date})),model,output:reportOutput};
  const history=getSynthesisHistory();history.unshift(report);saveSynthesisHistory(history);renderSynthesisHistory();
  $('synthesisStatus').textContent=`Đã tổng hợp ${sources.length} nguồn bằng ${model}. Mã [R#] là nguồn cần đối chiếu với bản ghi gốc.`;
 }catch(e){$('synthesisStatus').textContent='Chưa hoàn tất tổng hợp: '+explainGeminiError(e)+'. Bản ghi gốc vẫn được giữ nguyên.'}
 finally{btn.disabled=false;btn.textContent='✧ Phân tích kho tri thức'}
}


const ACTIONS_KEY='voice_intelligence_action_items_v1';
function getActionItems(){try{const v=JSON.parse(localStorage.getItem(ACTIONS_KEY)||'[]');return Array.isArray(v)?v:[]}catch(e){return []}}
function saveActionItems(items){localStorage.setItem(ACTIONS_KEY,JSON.stringify(items))}
function renderActionItems(){
 const items=getActionItems(),counts={todo:0,doing:0,done:0};items.forEach(x=>counts[x.status]=(counts[x.status]||0)+1);
 $('actionSummary').innerHTML=`<span class="action-count">Chưa làm <b>${counts.todo}</b></span><span class="action-count">Đang làm <b>${counts.doing}</b></span><span class="action-count">Hoàn thành <b>${counts.done}</b></span>`;
 $('actionList').innerHTML=items.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).map(x=>`<article class="action-item" data-action-id="${escapeHtml(x.id)}"><div class="action-item-main"><b>${escapeHtml(x.task||'Việc cần làm')}</b><p>${escapeHtml(x.owner||'Chưa nêu người phụ trách')} · ${escapeHtml(x.dueDate||'Chưa nêu thời hạn')}</p><small>Nguồn: ${escapeHtml(x.sourceTitle||'Bản ghi')} · ${escapeHtml(x.sourceRef||'')}</small>${x.note?`<p class="action-note">${escapeHtml(x.note)}</p>`:''}</div><div class="action-item-controls"><select class="action-status" data-status="${escapeHtml(x.id)}" aria-label="Trạng thái"><option value="todo" ${x.status==='todo'?'selected':''}>Chưa làm</option><option value="doing" ${x.status==='doing'?'selected':''}>Đang làm</option><option value="done" ${x.status==='done'?'selected':''}>Hoàn thành</option></select><button class="btn btn-outline action-delete" data-delete-action="${escapeHtml(x.id)}">Xóa</button></div></article>`).join('')||'<div class="empty">Chưa có hành động. Hãy trích xuất từ các bản ghi có transcript.</div>';
}
async function extractActionItems(){
 const query=$('actionQuery').value.trim()||'Các quyết định, cam kết, việc cần làm, người phụ trách và thời hạn';
 if(!geminiKey){$('actionStatus').textContent='Chưa có Gemini API key trong phiên. Vào Cài đặt để nhập key. Tìm kiếm cục bộ vẫn miễn phí.';return}
 const all=await getAll(),eligible=all.filter(r=>(r.transcript||r.analysis||'').trim());
 if(!eligible.length){$('actionStatus').textContent='Chưa có transcript hoặc văn bản phân tích trong kho.';return}
 let ranked=localSearchRecords(eligible,query).filter(x=>x.score>0).slice(0,8).map(x=>x.r);
 if(!ranked.length)ranked=eligible.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,6);
 let budget=22000,sources=[];
 for(const r of ranked){if(budget<=0)break;const text=String(r.transcript||r.analysis||'').slice(0,Math.min(4500,budget));if(!text.trim())continue;budget-=text.length;sources.push({ref:`[A${sources.length+1}]`,id:r.id,title:r.title||'Bản ghi',date:r.createdAt?new Date(r.createdAt).toLocaleString('vi-VN'):'Không rõ',text})}
 const btn=$('extractActions');btn.disabled=true;btn.textContent='Đang trích xuất…';
 $('actionStatus').textContent=`Đang phân tích ${sources.length} nguồn. Transcript được gửi lên Gemini; không gửi âm thanh gốc.`;
 const prompt=`Bạn là trợ lý trích xuất quyết định và công việc từ bản ghi. Chỉ trả về JSON hợp lệ, không markdown, theo dạng {"items":[{"task":"...","owner":"...","dueDate":"...","sourceRef":"[A1]","sourceQuote":"...","note":"..."}]}.
Chỉ tạo item nếu nguồn thực sự nêu hành động, quyết định hoặc cam kết cụ thể. Không biến ý tưởng chung thành nhiệm vụ. owner và dueDate phải là thông tin được nói rõ; nếu không có ghi "Chưa nêu". sourceRef phải là mã nguồn. sourceQuote là trích dẫn ngắn chính xác. Không suy luận ý nghĩ, sự trung thực hoặc ý định riêng tư. Không trùng lặp cùng một nhiệm vụ; nếu các nguồn khác nhau về trạng thái/thời hạn, ghi chú khác biệt thay vì tự hòa giải.
Yêu cầu: ${query}
Nguồn:
${sources.map(s=>`${s.ref} ${s.title} (${s.date})\n${s.text}`).join('\n\n---\n\n')}`;
 try{
  const {data,model}=await callGeminiResilient([{parts:[{text:prompt}]}],{temperature:0.1,maxOutputTokens:3500},{onStatus:s=>$('actionStatus').textContent=s});
  let raw=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n').trim()||'';
  raw=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const parsed=JSON.parse(raw),items=Array.isArray(parsed.items)?parsed.items:[];
  if(!items.length){$('actionStatus').textContent='Gemini không tìm thấy hành động rõ ràng trong các nguồn được chọn.';return}
  const existing=getActionItems(),known=new Set(existing.map(x=>(x.task||'').trim().toLowerCase()));
  let added=0;
  for(const item of items){
   const task=String(item.task||'').trim();if(!task||known.has(task.toLowerCase()))continue;
   const src=sources.find(s=>s.ref===item.sourceRef)||sources[0];
   existing.unshift({id:crypto.randomUUID(),task,owner:String(item.owner||'Chưa nêu'),dueDate:String(item.dueDate||'Chưa nêu'),sourceRef:src.ref,sourceTitle:src.title,sourceId:src.id,sourceQuote:String(item.sourceQuote||''),note:String(item.note||''),status:'todo',createdAt:Date.now()});
   known.add(task.toLowerCase());added++;
  }
  saveActionItems(existing);renderActionItems();
  $('actionStatus').textContent=`Đã thêm ${added} việc mới từ ${sources.length} nguồn bằng ${model}. Kiểm tra trích dẫn và cập nhật trạng thái trước khi sử dụng.`;
 }catch(e){$('actionStatus').textContent='Không trích xuất được danh sách: '+explainGeminiError(e)+'. Hãy thử lại với câu hỏi ngắn hơn hoặc kiểm tra hạn mức Gemini.'}
 finally{btn.disabled=false;btn.textContent='✧ Trích xuất hành động'}
}


const PROGRESS_HISTORY_KEY='voice_intelligence_progress_reviews_v1';
function getProgressHistory(){try{const v=JSON.parse(localStorage.getItem(PROGRESS_HISTORY_KEY)||'[]');return Array.isArray(v)?v:[]}catch(e){return []}}
function saveProgressHistory(v){try{localStorage.setItem(PROGRESS_HISTORY_KEY,JSON.stringify(v.slice(0,8)))}catch(e){$('progressStatus').textContent='Báo cáo quá lớn để lưu; kết quả vẫn hiển thị.'}}
function renderProgressHistory(){const v=getProgressHistory();$('progressHistory').innerHTML=v.map((x,i)=>`<button class="progress-history-item" data-progress-report="${i}"><b>${escapeHtml(x.title||'Đối chiếu tiến triển')}</b><span>${escapeHtml(x.period||'')} · ${escapeHtml(new Date(x.createdAt).toLocaleString('vi-VN'))}</span></button>`).join('')||'<div class="empty">Chưa có báo cáo đối chiếu.</div>'}
function setDefaultProgressDates(){
 const to=new Date(),from=new Date(to);from.setDate(from.getDate()-30);
 const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 if(!$('progressTo').value)$('progressTo').value=fmt(to);
 if(!$('progressFrom').value)$('progressFrom').value=fmt(from);
}
function renderProgressResult(s){$('progressResult').textContent=s||''}
async function runProgressReview(){
 const from=$('progressFrom').value,to=$('progressTo').value,scope=$('progressScope').value.trim();
 if(!from||!to||from>to){$('progressStatus').textContent='Vui lòng chọn khoảng ngày hợp lệ.';return}
 if(!geminiKey){$('progressStatus').textContent='Chưa có Gemini API key trong phiên. Nhập key trong Cài đặt; các chức năng lưu và theo dõi thủ công vẫn hoạt động.';return}
 const start=new Date(from+'T00:00:00').getTime(),end=new Date(to+'T23:59:59').getTime();
 const all=await getAll(),records=all.filter(r=>r.createdAt>=start&&r.createdAt<=end&&(r.transcript||r.analysis||'').trim()).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
 const actions=getActionItems();
 if(!actions.length){$('progressStatus').textContent='Danh sách hành động còn trống. Hãy trích xuất hành động trước khi đối chiếu.';return}
 if(!records.length){$('progressStatus').textContent='Không có transcript/văn bản trong khoảng ngày đã chọn.';return}
 // Select a bounded evidence set from records in the chosen period.
 let budget=24000;const sourceList=[];
 for(const r of records.slice(-12)){if(budget<=0)break;const body=String(r.transcript||r.analysis||'').slice(0,Math.min(3500,budget));if(!body.trim())continue;budget-=body.length;sourceList.push({ref:`[P${sourceList.length+1}]`,id:r.id,title:r.title||'Bản ghi',date:new Date(r.createdAt).toLocaleString('vi-VN'),text:body})}
 const actionList=actions.slice(0,80).map((a,i)=>({id:a.id,ref:`[T${i+1}]`,task:a.task,status:a.status==='done'?'Hoàn thành':a.status==='doing'?'Đang làm':'Chưa làm',owner:a.owner||'Chưa nêu',dueDate:a.dueDate||'Chưa nêu',originalSource:a.sourceRef||'',quote:a.sourceQuote||''}));
 const btn=$('runProgressReview');btn.disabled=true;btn.textContent='Đang đối chiếu…';$('progressResult').textContent='';
 $('progressStatus').textContent=`Đang đối chiếu ${actionList.length} hành động với ${sourceList.length} bản ghi trong khoảng đã chọn.`;
 const prompt=`Bạn là trợ lý kiểm tra tiến triển công việc dựa trên bản ghi. Trả lời tiếng Việt. Chỉ dùng dữ liệu dưới đây. KHÔNG tự đổi trạng thái trong hệ thống; chỉ đưa ra gợi ý. Không xem việc không nhắc đến là bằng chứng đã hoàn thành hoặc bị bỏ quên. Phân biệt: (a) bằng chứng mới xác nhận tiến triển, (b) bằng chứng thay đổi / cần xem xét, (c) không tìm thấy bằng chứng trong tập nguồn này. Không suy đoán người phụ trách, hạn hoặc ý định. Mọi kết luận gắn mã [T#] và/hoặc [P#], trích dẫn ngắn chính xác. Nếu nguồn không đủ, ghi rõ.
Khoảng thời gian: ${from} đến ${to}
Câu hỏi bổ sung: ${scope||'Tóm tắt tiến triển, thay đổi và nội dung cần chú ý.'}
DANH SÁCH HÀNH ĐỘNG ĐÃ THEO DÕI:
${JSON.stringify(actionList)}
BẢN GHI TRONG KHOẢNG:
${sourceList.map(s=>`${s.ref} | ${s.title} | ${s.date}\n${s.text}`).join('\n\n---\n\n')}
ĐẦU RA:
1. Tổng quan (không tạo số liệu ngoài dữ liệu).
2. Hành động có bằng chứng tiến triển; nêu bằng chứng và nguồn.
3. Hành động có thông tin mới khác với ghi nhận hiện tại; đề xuất trạng thái cần người dùng xem xét, không cập nhật tự động.
4. Hành động chưa tìm thấy bằng chứng mới trong tập bản ghi được cung cấp (không kết luận là chưa làm).
5. Mốc thời gian / thay đổi quan trọng.
6. Các câu hỏi cần người dùng xác nhận.
7. Danh sách mã nguồn [T#] và [P#] để tra cứu.
`;
 try{
  const {data,model}=await callGeminiResilient([{parts:[{text:prompt}]}],{temperature:0.15,maxOutputTokens:3500},{onStatus:s=>$('progressStatus').textContent=s});
  const output=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n').trim();if(!output)throw new Error('Gemini không trả về nội dung.');
  const catalog='\n\nNGUỒN ĐƯỢC ĐỐI CHIẾU:\n'+actionList.map(a=>`${a.ref} ${a.task} (${a.status})`).join('\n')+'\n'+sourceList.map(s=>`${s.ref} ${s.title} — ${s.date}`).join('\n');
  const reportOutput=output+catalog;renderProgressResult(reportOutput);
  const report={title:'Đối chiếu tiến triển',period:`${from} → ${to}`,createdAt:Date.now(),actionCount:actionList.length,recordCount:sourceList.length,model,output:reportOutput};
  const history=getProgressHistory();history.unshift(report);saveProgressHistory(history);renderProgressHistory();
  $('progressStatus').textContent=`Đã đối chiếu ${actionList.length} hành động với ${sourceList.length} bản ghi bằng ${model}. Không có trạng thái nào tự thay đổi.`;
 }catch(e){$('progressStatus').textContent='Không hoàn tất đối chiếu: '+explainGeminiError(e)+'. Dữ liệu gốc và trạng thái hiện tại vẫn được giữ.'}
 finally{btn.disabled=false;btn.textContent='✧ Đối chiếu tiến triển'}
}


const REPORT_KEY='voice_intelligence_official_reports_v2';
let currentReportText='',currentReportRange='';
function setReportRange(days){const now=new Date(),to=new Date(now),from=new Date(now);if(days==='month'){from.setDate(1)}else if(days==='all'){from.setFullYear(2000,0,1)}else{from.setDate(from.getDate()-Number(days)+1)}const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;$('reportFrom').value=fmt(from);$('reportTo').value=fmt(to)}
function initReportDates(){if(!$('reportFrom').value||!$('reportTo').value)setReportRange(30)}
function reportTopicCounts(records){const counts=new Map();for(const r of records){const words=tokenizeVi(`${r.title||''} ${r.transcript||''} ${r.analysis||''}`);const seen=new Set(words);for(const w of seen)counts.set(w,(counts.get(w)||0)+1)}return [...counts.entries()].filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]).slice(0,12)}
async function buildLocalReport(){const from=$('reportFrom').value,to=$('reportTo').value;if(!from||!to||from>to){$('reportStatus').textContent='Chọn khoảng ngày hợp lệ trước khi tạo báo cáo.';return}const start=new Date(from+'T00:00:00').getTime(),end=new Date(to+'T23:59:59').getTime();const all=await getAll(),records=all.filter(r=>Number(r.createdAt)>=start&&Number(r.createdAt)<=end);const actions=getActionItems(),synthesis=getSynthesisHistory(),progress=getProgressHistory();const topics=reportTopicCounts(records);const totalSec=records.reduce((s,r)=>s+Number(r.duration||0),0);const done=actions.filter(a=>a.status==='done').length,doing=actions.filter(a=>a.status==='doing').length,pending=actions.length-done-doing;const analyzed=records.filter(r=>r.analysis).length,transcribed=records.filter(r=>(r.transcript||'').trim()).length;const lines=[`VOICE INTELLIGENCE AI — BÁO CÁO TỔNG HỢP`,`Khoảng thời gian: ${from} đến ${to}`,`Tạo lúc: ${new Date().toLocaleString('vi-VN')}`,``,`I. THỐNG KÊ DỮ LIỆU`,`• Số bản ghi: ${records.length}`,`• Có transcript: ${transcribed}`,`• Có phân tích AI: ${analyzed}`,`• Tổng thời lượng: ${fmtTime(totalSec)}`,`• Dung lượng âm thanh + transcript ước tính: ${(records.reduce((s,r)=>s+(r.audio?.size||0)+new Blob([r.transcript||'']).size,0)/1048576).toFixed(2)} MB`,``,`II. CHỦ ĐỀ XUẤT HIỆN LẶP LẠI`,...(topics.length?topics.map(([w,n])=>`• ${w}: xuất hiện trong ${n} bản ghi`):['• Chưa có từ khóa lặp đủ điều kiện trong tập dữ liệu.']),``,`III. THEO DÕI HÀNH ĐỘNG (toàn bộ danh sách hiện tại)`,`• Tổng hành động: ${actions.length}`,`• Hoàn thành theo trạng thái người dùng: ${done}`,`• Đang làm: ${doing}`,`• Chưa làm / trạng thái khác: ${pending}`,``,`IV. LỊCH SỬ PHÂN TÍCH`,`• Báo cáo tổng hợp tri thức đã lưu: ${synthesis.length}`,`• Báo cáo đối chiếu tiến triển đã lưu: ${progress.length}`,``,`V. BẢN GHI TRONG KHOẢNG`];records.slice().sort((a,b)=>a.createdAt-b.createdAt).forEach((r,i)=>lines.push(`${i+1}. ${r.title||'Bản ghi không tên'} | ${fmtDate(r.createdAt)} | ${r.type||'Khác'} | ${fmtTime(r.duration||0)} | ${r.transcript?'Có transcript':'Chưa có transcript'} | ID: ${r.id}`));lines.push('','','GHI CHÚ PHƯƠNG PHÁP','• Số liệu thống kê được tính từ dữ liệu lưu cục bộ trong trình duyệt này.','• Chủ đề là từ khóa gợi ý, không phải phân loại ngữ nghĩa hoặc kết luận AI.','• Trạng thái hành động được lấy theo trạng thái người dùng đã đặt; báo cáo không tự cập nhật.','• Báo cáo không bao gồm dữ liệu ở thiết bị/trình duyệt khác nếu chưa nhập sao lưu.');currentReportText=lines.join('\n');currentReportRange=`${from}|${to}`;$('reportOutput').textContent=currentReportText;$('exportReport').disabled=false;$('reportMetrics').innerHTML=[['Bản ghi',records.length],['Transcript',transcribed],['Đã phân tích',analyzed],['Hành động',actions.length]].map(([label,value])=>`<div class="report-metric"><small>${escapeHtml(label)}</small><b>${value}</b></div>`).join('');$('reportStatus').textContent=`Đã tạo báo cáo cục bộ từ ${records.length} bản ghi. Không gửi dữ liệu lên AI.`}
async function buildAiReport(){await buildLocalReport();if(!currentReportText)return;if(!geminiKey){$('reportStatus').textContent='Chưa có Gemini API key trong phiên. Nhập key tại Cài đặt; báo cáo thống kê cục bộ vẫn dùng được.';return}const btn=$('buildAiReport');btn.disabled=true;btn.textContent='Đang phân tích…';try{const prompt=`Bạn là trợ lý phân tích tri thức cá nhân. Phân tích báo cáo thống kê dưới đây bằng tiếng Việt. Không tạo dữ kiện/số liệu mới; không suy đoán ý định, tính cách hay trung thực. Phân biệt dữ liệu thống kê, nhận xét thận trọng, câu hỏi cần xác minh và đề xuất AI. Nêu giới hạn của tập dữ liệu. Nếu thiếu dữ liệu thì nói rõ.\n\n${currentReportText}\n\nHãy viết: 1) Tóm tắt điều nổi bật, 2) xu hướng có thể quan sát từ dữ liệu (không coi keyword count là hiểu biết chắc chắn), 3) các điểm cần xem xét, 4) đề xuất bước tiếp theo, 5) giới hạn và câu hỏi xác minh.`;const {data,model}=await callGeminiResilient([{parts:[{text:prompt}]}],{temperature:0.2,maxOutputTokens:2200},{onStatus:s=>$('reportStatus').textContent=s});const out=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n').trim();if(!out)throw new Error('Gemini không trả về nội dung');currentReportText+='\n\nVI. PHÂN TÍCH AI ('+model+')\n'+out;$('reportOutput').textContent=currentReportText;$('reportStatus').textContent=`Đã bổ sung phân tích AI bằng ${model}. Kiểm tra lại nhận định với bản ghi gốc.`}catch(e){$('reportStatus').textContent='Không hoàn tất phân tích AI: '+explainGeminiError(e)}finally{btn.disabled=false;btn.textContent='✧ Phân tích báo cáo bằng Gemini'}}
function exportCurrentReport(){if(!currentReportText)return;if(currentReportRange!==`${$('reportFrom').value}|${$('reportTo').value}`){$('reportStatus').textContent='Khoảng ngày đã thay đổi. Hãy tạo lại báo cáo trước khi xuất.';return}downloadBlob(new Blob([currentReportText],{type:'text/plain;charset=utf-8'}),`VOICE_INTELLIGENCE_REPORT_${$('reportFrom').value}_${$('reportTo').value}.txt`)}

function bind(){$('reportFrom').onchange=$('reportTo').onchange=()=>{currentReportText='';currentReportRange='';$('reportOutput').textContent='';$('reportMetrics').innerHTML='';$('exportReport').disabled=true;$('reportStatus').textContent='Khoảng ngày đã thay đổi. Hãy tạo lại báo cáo.'};$('buildLocalReport').onclick=buildLocalReport;$('buildAiReport').onclick=buildAiReport;$('exportReport').onclick=exportCurrentReport;document.querySelectorAll('[data-report-range]').forEach(b=>b.onclick=()=>setReportRange(b.dataset.reportRange));document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.goto)));$('newRecordTop').onclick=$('newRecord').onclick=$('startFromHero').onclick=openRecordDialog;$('startRec').onclick=startRecording;$('stopRec').onclick=stopRecording;$('saveRecord').onclick=saveRecord;$('cancelRecord').onclick=()=>{$('recordDialog').close();if(recorder&&recorder.state!=='inactive')stopRecording()};$('audioFile').onchange=e=>{selectedAudio=e.target.files[0]||null;if(selectedAudio)$('audioPreview').innerHTML=`<div class="audio-chip">Đã chọn: ${escapeHtml(selectedAudio.name)} · ${(selectedAudio.size/1048576).toFixed(2)} MB</div>`};document.addEventListener('click',e=>{const open=e.target.closest('[data-open]'),play=e.target.closest('[data-play]');if(open)openDetail(open.dataset.open);if(play)playRecord(play.dataset.play)});$('searchRecords').oninput=async e=>{const q=e.target.value.toLowerCase();const rs=await getAll();$('allRecords').innerHTML=rs.filter(r=>(r.title+' '+r.transcript+' '+r.type).toLowerCase().includes(q)).map(cardHtml).join('')||emptyHtml()};$('analysisRecord').onchange=async e=>{const r=(await getAll()).find(x=>x.id===e.target.value);$('analysisText').value=r?.transcript||''};$('knowledgeSearchBtn').onclick=searchKnowledge;$('extractActions').onclick=extractActionItems;$('runProgressReview').onclick=runProgressReview;$('clearProgressReview').onclick=()=>{renderProgressResult('');$('progressStatus').textContent='Đã xóa kết quả đang xem; lịch sử vẫn được lưu.'};$('progressHistory').onclick=e=>{const b=e.target.closest('[data-progress-report]');if(b){const r=getProgressHistory()[Number(b.dataset.progressReport)];if(r){renderProgressResult(r.output);$('progressStatus').textContent=`Đã mở báo cáo ${r.period}.`}}};$('refreshActions').onclick=renderActionItems;$('actionList').onchange=e=>{const sel=e.target.closest('[data-status]');if(sel){const items=getActionItems(),item=items.find(x=>x.id===sel.dataset.status);if(item){item.status=sel.value;item.updatedAt=Date.now();saveActionItems(items);renderActionItems()}}};$('actionList').onclick=e=>{const b=e.target.closest('[data-delete-action]');if(b&&confirm('Xóa việc này khỏi danh sách theo dõi?')){saveActionItems(getActionItems().filter(x=>x.id!==b.dataset.deleteAction));renderActionItems()}};$('runSynthesis').onclick=runKnowledgeSynthesis;$('clearSynthesis').onclick=()=>{renderSynthesisReport('');$('synthesisStatus').textContent='Đã xóa kết quả đang xem; báo cáo đã lưu vẫn còn trong lịch sử.'};$('synthesisHistory').onclick=e=>{const b=e.target.closest('[data-report]');if(b){const report=getSynthesisHistory()[Number(b.dataset.report)];if(report){$('synthesisQuestion').value=report.question;renderSynthesisReport(report.output);$('synthesisStatus').textContent=`Đã mở báo cáo lưu ngày ${new Date(report.createdAt).toLocaleString('vi-VN')}.`}}};$('knowledgeQuery').onkeydown=e=>{if(e.key==='Enter')searchKnowledge()};$('refreshKnowledge').onclick=renderKnowledge;$('knowledgeTopics').onclick=e=>{const b=e.target.closest('[data-topic]');if(b){$('knowledgeQuery').value=b.dataset.topic;searchKnowledge()}};$('runGemini').onclick=runGemini;$('localSummary').onclick=simpleSummary;$('toggleKey').onclick=()=>{$('geminiKey').type=$('geminiKey').type==='password'?'text':'password';$('toggleKey').textContent=$('geminiKey').type==='password'?'Hiện':'Ẩn'};$('saveKey').onclick=()=>{geminiKey=$('geminiKey').value.trim();$('geminiKey').value='';try{if(geminiKey)sessionStorage.setItem('voice_intelligence_gemini_key',geminiKey);else sessionStorage.removeItem('voice_intelligence_gemini_key')}catch(e){}$('analysisStatus').textContent=geminiKey?'API key đã được lưu tạm trong phiên tab hiện tại.':'Bạn chưa nhập key.';alert(geminiKey?'Đã nhận key trong phiên hiện tại. Không đóng tab nếu muốn giữ phiên.':'Chưa nhập API key.')};$('clearKey').onclick=()=>{geminiKey='';try{sessionStorage.removeItem('voice_intelligence_gemini_key')}catch(e){}$('geminiKey').value='';alert('Đã xóa key khỏi bộ nhớ phiên tab.')};$('exportData').onclick=exportData;$('importData').onchange=e=>importData(e.target.files[0]);$('deleteAll').onclick=async()=>{if(!confirm('Xóa tất cả bản ghi trên thiết bị này? Hành động không thể hoàn tác. Hãy xuất bản sao lưu trước.'))return;const rs=await getAll();for(const r of rs)await remove(r.id);await render()}}
(async()=>{try{db=await openDB();bind();await render();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});if(location.protocol==='file:')console.warn('PWA needs HTTPS or localhost.')}catch(e){alert('Không khởi tạo được kho dữ liệu trình duyệt: '+e.message)}})();
