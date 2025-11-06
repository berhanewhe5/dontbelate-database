// ====== Firebase config (keep your config) ======
var config = {
    apiKey: "AIzaSyDEeH5L9mYt4V07voQAgz32o-NV1h4B59U",
    authDomain: "don-t-be-late-e3d9b.firebaseapp.com",
    projectId: "don-t-be-late-e3d9b",
    storageBucket: "don-t-be-late-e3d9b.firebasestorage.app",
    messagingSenderId: "448144006032",
    appId: "1:448144006032:web:971617f191a315d2277115"
};
firebase.initializeApp(config);
const db = firebase.firestore();

// ====== State & elements ======
const selected = { grade: "", chapter: "", topic: "", questionType: "" };
const notification = document.getElementById('notification');
const submitBtn = document.getElementById('submitBtn');
const form = document.getElementById('question-form');
const previewQ = document.getElementById('preview-question');
const previewA = document.getElementById('preview-answer');
const questionList = document.getElementById('question-list');

// ====== utilities ======
function showNotification(msg, type='success'){
  notification.textContent = msg;
  notification.className = type;
  setTimeout(()=> { notification.textContent=''; notification.className=''; }, 3000);
}

function toggleDropdown(id){
  const el = document.getElementById(id);
  if(!el) return;
  // close others
  document.querySelectorAll('.dropdown-content').forEach(d => { if(d.id !== id) d.classList.remove('show'); d.style.display = (d.classList.contains('show') ? 'block' : d.style.display); });
  // toggle this
  if(el.style.display === 'block'){ el.style.display = 'none'; el.classList.remove('show'); }
  else { el.style.display = 'block'; el.classList.add('show'); }
}

// close dropdowns clicking outside
window.addEventListener('click', (e)=>{
  if(!e.target.matches('.dropbtn')){
    document.querySelectorAll('.dropdown-content').forEach(dc => { dc.style.display = 'none'; dc.classList.remove('show'); });
  }
});

// ====== update UI state ======
function updateCurrentSelection(){
  document.getElementById('current-grade').textContent = "Grade: " + (selected.grade || "None");
  document.getElementById('current-chapter').textContent = "Chapter: " + (selected.chapter || "None");
  document.getElementById('current-topic').textContent = "Topic: " + (selected.topic || "None");
  document.getElementById('current-questionType').textContent = "Type: " + (selected.questionType || "None");

  submitBtn.disabled = !(selected.grade && selected.chapter && selected.topic && selected.questionType);

  document.getElementById('chapterBtn').classList.toggle('disabled', !selected.grade);
  document.getElementById('topicBtn').classList.toggle('disabled', !selected.chapter);
  document.getElementById('questionTypeBtn').classList.toggle('disabled', !selected.topic);
}

// called when user picks an option
function selectOption(value, category){
  selected[category] = value;
  if(category==='grade'){ selected.chapter=''; selected.topic=''; selected.questionType=''; loadChapters(); loadTopics(); loadQuestionTypes(); }
  if(category==='chapter'){ selected.topic=''; selected.questionType=''; loadTopics(); loadQuestionTypes(); }
  if(category==='topic'){ selected.questionType=''; loadQuestionTypes(); }
  if(category==='questionType'){ loadQuestions(); }
  updateCurrentSelection();
  // close the dropdown after selecting
  const id = category + 'Dropdown';
  const el = document.getElementById(id);
  if(el){ el.style.display='none'; el.classList.remove('show'); }
}

// ====== preview handling ======
form.question.addEventListener('input', e => previewQ.textContent = e.target.value);
form.answer.addEventListener('input', e => previewA.textContent = e.target.value);

// ====== form submit ======
form.addEventListener('submit', e=>{
  e.preventDefault();
  if(!selected.grade || !selected.chapter || !selected.topic || !selected.questionType){
    showNotification('Please select grade, chapter, topic and question type.', 'error'); return;
  }
  const ref = db.collection("Grades").doc(selected.grade)
    .collection("Chapters").doc(selected.chapter)
    .collection("Topics").doc(selected.topic)
    .collection("QuestionTypes").doc(selected.questionType)
    .collection("Questions");

  ref.add({ question: form.question.value.trim(), answer: form.answer.value.trim(), createdAt: Date.now() })
    .then(()=> {
      showNotification('Question added!');
      form.reset();
      previewQ.textContent = '';
      previewA.textContent = '';
      // loadQuestions() called automatically by onSnapshot listener
    })
    .catch(err => {
      console.error(err);
      showNotification('Failed to add question.', 'error');
    });
});

// ====== Question Deletion Functionality ======
function deleteQuestion(docId){
  if(!selected.grade || !selected.chapter || !selected.topic || !selected.questionType) return;
  
  const ref = db.collection("Grades").doc(selected.grade).collection("Chapters").doc(selected.chapter)
    .collection("Topics").doc(selected.topic).collection("QuestionTypes").doc(selected.questionType).collection("Questions");
  
  ref.doc(docId).delete()
    .then(() => showNotification('Question deleted!', 'error'))
    .catch(err => {
      console.error('Delete error', err);
      showNotification('Failed to delete question.', 'error');
    });
}


// ====== render question list (answers on separate line and includes delete button) ======
function renderQuestionListItem(doc){
  const li = document.createElement('li');
  li.setAttribute('data-id', doc.id);
  
  // Use .q and .a classes for separate lines (as defined in styles.css) and add delete button
  li.innerHTML = `<span class="q">${escapeHtml(doc.data().question)}</span><span class="a">${escapeHtml(doc.data().answer)}</span>
                  <button class="delete-btn" data-id="${doc.id}">x</button>`;
  
  questionList.appendChild(li);

  // Add event listener for the delete button
  li.querySelector('.delete-btn').addEventListener('click', () => deleteQuestion(doc.id));
}

// safe small escaper
function escapeHtml(str){
  if(!str) return '';
  return str.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

// ====== load dropdowns from Firestore ======
function loadGrades(){
  const dropdown = document.getElementById('gradeDropdown');
  db.collection("Grades").onSnapshot(snapshot => {
    dropdown.innerHTML = '';
    snapshot.forEach(doc => {
      const a = document.createElement('a');
      a.textContent = doc.id;
      if(doc.id === selected.grade) a.classList.add('selected');
      a.onclick = () => selectOption(doc.id, 'grade');
      dropdown.appendChild(a);
    });
    const input = document.createElement('input'); input.placeholder = "New grade"; input.id='newGradeInput';
    dropdown.appendChild(input);
    const addBtn = document.createElement('a'); addBtn.textContent = '+ Add'; addBtn.onclick = addNewGrade;
    dropdown.appendChild(addBtn);
  }, err => console.error('Grades load error', err));
}

function loadChapters(){
  const dropdown = document.getElementById('chapterDropdown');
  if(!selected.grade){ dropdown.innerHTML=''; return; }
  db.collection("Grades").doc(selected.grade).collection("Chapters").onSnapshot(snapshot=>{
    dropdown.innerHTML='';
    snapshot.forEach(doc=>{
      const a = document.createElement('a');
      a.textContent = doc.id;
      if(doc.id === selected.chapter) a.classList.add('selected');
      a.onclick = () => selectOption(doc.id, 'chapter');
      dropdown.appendChild(a);
    });
    const input = document.createElement('input'); input.placeholder='New chapter'; input.id='newChapterInput';
    dropdown.appendChild(input);
    const addBtn = document.createElement('a'); addBtn.textContent = '+ Add'; addBtn.onclick = addNewChapter;
    dropdown.appendChild(addBtn);
  }, err => console.error('Chapters load error', err));
}

function loadTopics(){
  const dropdown = document.getElementById('topicDropdown');
  if(!selected.grade || !selected.chapter){ dropdown.innerHTML=''; return; }
  db.collection("Grades").doc(selected.grade).collection("Chapters").doc(selected.chapter).collection("Topics")
    .onSnapshot(snapshot=>{
      dropdown.innerHTML='';
      snapshot.forEach(doc=>{
        const a = document.createElement('a');
        a.textContent = doc.id;
        if(doc.id === selected.topic) a.classList.add('selected');
        a.onclick = () => selectOption(doc.id, 'topic');
        dropdown.appendChild(a);
      });
      const input = document.createElement('input'); input.placeholder='New topic'; input.id='newTopicInput';
      dropdown.appendChild(input);
      const addBtn = document.createElement('a'); addBtn.textContent = '+ Add'; addBtn.onclick = addNewTopic;
      dropdown.appendChild(addBtn);
  }, err => console.error('Topics load error', err));
}

function loadQuestionTypes(){
  const dropdown = document.getElementById('questionTypeDropdown');
  if(!selected.grade || !selected.chapter || !selected.topic){ dropdown.innerHTML=''; return; }
  db.collection("Grades").doc(selected.grade).collection("Chapters").doc(selected.chapter)
    .collection("Topics").doc(selected.topic).collection("QuestionTypes")
    .onSnapshot(snapshot=>{
      dropdown.innerHTML='';
      snapshot.forEach(doc=>{
        const a = document.createElement('a');
        a.textContent = doc.id;
        if(doc.id === selected.questionType) a.classList.add('selected');
        a.onclick = () => selectOption(doc.id, 'questionType');
        dropdown.appendChild(a);
      });
      const input = document.createElement('input'); input.placeholder='New type'; input.id='newQuestionTypeInput';
      dropdown.appendChild(input);
      const addBtn = document.createElement('a'); addBtn.textContent = '+ Add'; addBtn.onclick = addNewQuestionType;
      dropdown.appendChild(addBtn);
  }, err => console.error('QuestionTypes load error', err));
}

// ====== add new items ======
function addNewGrade(){ const val=document.getElementById('newGradeInput').value?.trim(); if(!val) return showNotification('Grade empty','error'); db.collection('Grades').doc(val).set({createdAt:Date.now()}); document.getElementById('newGradeInput').value=''; showNotification('Grade added'); }
function addNewChapter(){ if(!selected.grade) return showNotification('Select grade first','error'); const val=document.getElementById('newChapterInput').value?.trim(); if(!val) return showNotification('Chapter empty','error'); db.collection('Grades').doc(selected.grade).collection('Chapters').doc(val).set({createdAt:Date.now()}); document.getElementById('newChapterInput').value=''; showNotification('Chapter added'); }
function addNewTopic(){ if(!selected.grade || !selected.chapter) return showNotification('Select grade & chapter','error'); const val=document.getElementById('newTopicInput').value?.trim(); if(!val) return showNotification('Topic empty','error'); db.collection('Grades').doc(selected.grade).collection('Chapters').doc(selected.chapter).collection('Topics').doc(val).set({createdAt:Date.now()}); document.getElementById('newTopicInput').value=''; showNotification('Topic added'); }
function addNewQuestionType(){ if(!selected.grade || !selected.chapter || !selected.topic) return showNotification('Select grade/chapter/topic','error'); const val=document.getElementById('newQuestionTypeInput').value?.trim(); if(!val) return showNotification('Type empty','error'); db.collection('Grades').doc(selected.grade).collection('Chapters').doc(selected.chapter).collection('Topics').doc(selected.topic).collection('QuestionTypes').doc(val).set({createdAt:Date.now()}); document.getElementById('newQuestionTypeInput').value=''; showNotification('Question type added'); }

// ====== load questions (REAL-TIME LISTENER) ======
let questionsUnsubscribe = null;
function loadQuestions() {
 const questionList = document.getElementById('question-list');
 questionList.innerHTML = '';
 
 if (!selected.grade || !selected.chapter || !selected.topic || !selected.questionType) return;
 
 const ref = db
 .collection("Grades").doc(selected.grade)
 .collection("Chapters").doc(selected.chapter)
 .collection("Topics").doc(selected.topic)
 .collection("QuestionTypes").doc(selected.questionType)
 .collection("Questions");
 
 ref.get().then(snapshot => {
 snapshot.forEach(doc => {
 const li = document.createElement("li");
 const qSpan = document.createElement("span");
 const aSpan = document.createElement("span");
 const del = document.createElement("div");
 
 li.setAttribute("data-id", doc.id);
 qSpan.textContent = doc.data().question;
 aSpan.textContent = doc.data().answer;
 del.textContent = "x";
 
 li.appendChild(qSpan);
 li.appendChild(aSpan);
 li.appendChild(del);
 
 questionList.appendChild(li);
 
 del.addEventListener("click", () => {
 ref.doc(doc.id).delete();
 });
 });
 });
 }


// ====== init ======
window.onload = () => {
  loadGrades();
  loadChapters();
  loadTopics();
  loadQuestionTypes();
  updateCurrentSelection();
  // We don't need to call loadQuestions here, as it will be called automatically
  // when the user makes the final selection (Question Type).
};