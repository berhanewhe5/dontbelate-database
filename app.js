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

// ====== NEW: Image Checkbox & Input Elements ======
const imageContainer = document.getElementById('imageContainer');
const imageFileNameInput = document.getElementById('imageFileName');
const hasImageCheck = document.getElementById('hasImageCheck');

// ====== Image Visibility Logic ======
function updateImageInputVisibility() {
    if (hasImageCheck.checked) {
        imageContainer.style.display = 'block';
        // Make the input required only when the box is checked
        imageFileNameInput.setAttribute('required', 'true'); 
    } else {
        imageContainer.style.display = 'none';
        imageFileNameInput.removeAttribute('required');
        imageFileNameInput.value = ''; // Clear input if the user unchecks the box
    }
}

// Attach listener to the single checkbox
hasImageCheck.addEventListener('change', updateImageInputVisibility);

// Initialize on load (to hide the container if the browser remembered the checkbox state)
window.addEventListener('load', updateImageInputVisibility);

// CRITICAL FIX: Global click listener to only close the dropdown if the click is outside
window.addEventListener('click', (e)=>{
  const isDropBtn = e.target.matches('.dropbtn');
  const isInsideDropdown = e.target.closest('.dropdown-content');
  
  if (!isDropBtn && !isInsideDropdown) {
    document.querySelectorAll('.dropdown-content').forEach(dc => { 
      dc.style.display = 'none'; 
      dc.classList.remove('show'); 
    });
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
  if(category==='grade'){ selected.chapter=''; selected.topic=''; selected.questionType=''; loadChapters(); loadTopics(); loadQuestionTypes(); loadQuestions(); }
  if(category==='chapter'){ selected.topic=''; selected.questionType=''; loadTopics(); loadQuestionTypes(); loadQuestions(); }
  if(category==='topic'){ selected.questionType=''; loadQuestionTypes(); loadQuestions(); }
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

// NEW: Read the image file name (it will be empty if the checkbox was unchecked)
const imageFileName = document.getElementById('imageFileName').value.trim();

// ====== form submit ======
form.addEventListener('submit', e=>{
  e.preventDefault();
  if(!selected.grade || !selected.chapter || !selected.topic || !selected.questionType){
    showNotification('Please select grade, chapter, topic and question type.', 'error'); return;
  }
  
  // 1. Read the image file name
  const imageFileName = document.getElementById('imageFileName').value.trim();

  const ref = db.collection("Grades").doc(selected.grade)
    .collection("Chapters").doc(selected.chapter)
    .collection("Topics").doc(selected.topic)
    .collection("QuestionTypes").doc(selected.questionType)
    .collection("Questions");

  // 2. Build the base data object
  const questionData = {
    question: form.question.value.trim(), 
    answer: form.answer.value.trim(), 
    createdAt: Date.now() 
  };
    
  // 3. CRITICAL FIX: Only add the imageFileName field if the string is NOT empty
  if (imageFileName) {
      questionData.imageFileName = imageFileName;
  }
  
  // 4. Submit the conditionally built object
  ref.add(questionData)
    .then(()=> {
      showNotification('Question added!');
      form.reset();
      previewQ.textContent = '';
      previewA.textContent = '';
      
      // Reset image related fields and checkbox state
      document.getElementById('imageFileName').value = ''; 
      hasImageCheck.checked = false; // Reset checkbox
      updateImageInputVisibility(); // Hide container again
    })
    .catch(err => {
      console.error('Submission error', err);
      showNotification('Failed to add question.', 'error');
    });

    updateCurrentSelection();
    loadQuestions();
});

// ====== Question Deletion Functionality ======
function deleteQuestion(docId){
  if(!selected.grade || !selected.chapter || !selected.topic || !selected.questionType) return;
  
  if (!confirm(`Are you sure you want to delete this question?`)) {
      return;
  }
  const ref = db.collection("Grades").doc(selected.grade).collection("Chapters").doc(selected.chapter)
    .collection("Topics").doc(selected.topic).collection("QuestionTypes").doc(selected.questionType).collection("Questions");
  
  ref.doc(docId).delete()
    .then(() => showNotification('Question deleted!', 'error'))
    .catch(err => {
      console.error('Delete error', err);
      showNotification('Failed to delete question.', 'error');
    });

  updateCurrentSelection();
  loadQuestions();
}

// Function to handle password check
function checkPassword() {
  const correctPassword = 'Konita5'; // <<< CHANGE THIS PASSWORD
  const enteredPassword = prompt("Enter password to confirm deletion:");
  return enteredPassword === correctPassword;
}

// ====== render question list (answers on separate line and includes delete button) ======
function renderQuestionListItem(doc){
  const li = document.createElement('li');
  li.setAttribute('data-id', doc.id);
  
  // CRITICAL: This reliably creates the button element with the correct class: .delete-btn
  // li.innerHTML = `<span class="q">${escapeHtml(doc.data().question)}</span><span class="a">${escapeHtml(doc.data().answer)}</span>
  //                 <button class="delete-btn" data-id="${doc.id}">x</button>`;
  li.innerHTML = `
    <input type="checkbox" class="question-checkbox" data-id="${doc.id}">
    <span class="q">${escapeHtml(doc.data().question)}</span>
    <span class="a">${escapeHtml(doc.data().answer)}</span>
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

// ====== Deletion Functions for Categories ======

function deleteGrade(gradeId) {
  if (!checkPassword()) {
    return showNotification('Incorrect password. Grade deletion cancelled.', 'error');
  }

  const gradeRef = db.collection("Grades").doc(gradeId);
  gradeRef.delete()
    .then(() => {
      showNotification(`Grade ${gradeId} deleted!`, 'error');
      if (selected.grade === gradeId) {
        selected.grade = ''; selected.chapter = ''; selected.topic = ''; selected.questionType = '';
        updateCurrentSelection();
        loadChapters(); loadTopics(); loadQuestionTypes(); loadQuestions();
      }
    })
    .catch(err => {
      console.error('Grade delete error', err);
      showNotification('Failed to delete grade.', 'error');
    });
}
function deleteChapter(chapterId) {
  if (!selected.grade) return showNotification('Select grade first.', 'error');
  if (!checkPassword()) {
    return showNotification('Incorrect password. Chapter deletion cancelled.', 'error');
  }

  const chapterRef = db.collection("Grades").doc(selected.grade).collection("Chapters").doc(chapterId);

  // Check if the 'Topics' subcollection is non-empty
  chapterRef.collection('Topics').limit(1).get()
    .then(snapshot => {
      if (!snapshot.empty) {
        if (!confirm(`Chapter: ${chapterId} contains Topics. Deleting will orphan data. Continue?`)) return;
      }
      
      if (!confirm(`Are you sure you want to delete Chapter: ${chapterId} in Grade ${selected.grade}?`)) return;

      chapterRef.delete()
        .then(() => {
          showNotification(`Chapter ${chapterId} deleted!`, 'error');
          if (selected.chapter === chapterId) {
            selected.chapter = ''; selected.topic = ''; selected.questionType = '';
            updateCurrentSelection();
            loadTopics(); loadQuestionTypes(); loadQuestions();
          }
        })
        .catch(err => {
          console.error('Chapter delete error', err);
          showNotification('Failed to delete chapter.', 'error');
        });
    })
    .catch(err => console.error("Error checking chapter emptiness:", err));
}

function deleteTopic(topicId) {
  if (!selected.grade || !selected.chapter) return showNotification('Select grade and chapter first.', 'error');
  if (!checkPassword()) {
    return showNotification('Incorrect password. Topic deletion cancelled.', 'error');
  }

  const topicRef = db
    .collection("Grades").doc(selected.grade)
    .collection("Chapters").doc(selected.chapter)
    .collection("Topics").doc(topicId);
  
  // Check if the 'QuestionTypes' subcollection is non-empty
  topicRef.collection('QuestionTypes').limit(1).get()
    .then(snapshot => {
      if (!snapshot.empty) {
        if (!confirm(`Topic: ${topicId} contains Question Types. Deleting will orphan data. Continue?`)) return;
      }

      if (!confirm(`Are you sure you want to delete Topic: ${topicId} in Chapter ${selected.chapter}?`)) return;
      
      topicRef.delete()
        .then(() => {
          showNotification(`Topic ${topicId} deleted!`, 'error');
          if (selected.topic === topicId) {
            selected.topic = ''; selected.questionType = '';
            updateCurrentSelection();
            loadQuestionTypes(); loadQuestions();
          }
        })
        .catch(err => {
          console.error('Topic delete error', err);
          showNotification('Failed to delete topic.', 'error');
        });
    })
    .catch(err => console.error("Error checking topic emptiness:", err));
}

function deleteQuestionType(questionTypeId) {
  if (!selected.grade || !selected.chapter || !selected.topic) return showNotification('Select grade, chapter, and topic first.', 'error');
  if (!checkPassword()) {
    return showNotification('Incorrect password. Question Type deletion cancelled.', 'error');
  }

  const questionTypeRef = db
    .collection("Grades").doc(selected.grade)
    .collection("Chapters").doc(selected.chapter)
    .collection("Topics").doc(selected.topic)
    .collection("QuestionTypes").doc(questionTypeId);

  // Check if the 'Questions' subcollection is non-empty
  questionTypeRef.collection('Questions').limit(1).get()
    .then(snapshot => {
      if (!snapshot.empty) {
        if (!confirm(`Question Type: ${questionTypeId} contains Questions. Deleting will orphan data. Continue?`)) return;
      }
      
      if (!confirm(`Are you sure you want to delete Question Type: ${questionTypeId} in Topic ${selected.topic}?`)) return;

      questionTypeRef.delete()
        .then(() => {
          showNotification(`Question Type ${questionTypeId} deleted!`, 'error');
          if (selected.questionType === questionTypeId) {
            selected.questionType = '';
            updateCurrentSelection();
            loadQuestions();
          }
        })
        .catch(err => {
          console.error('Question Type delete error', err);
          showNotification('Failed to delete question type.', 'error');
        });
    })
    .catch(err => console.error("Error checking question type emptiness:", err));
}

// ====== load dropdowns from Firestore (FIXED with delete buttons and variable declarations) ======

function loadGrades(){
  const dropdown = document.getElementById('gradeDropdown');
  db.collection("Grades").onSnapshot(snapshot => {
    dropdown.innerHTML = '';
    
    snapshot.forEach(doc => {
      const gradeId = doc.id; 
      const itemContainer = document.createElement('div');
      itemContainer.className = 'dropdown-item-container';

      const a = document.createElement('a');
      a.textContent = gradeId;
      if(gradeId === selected.grade) a.classList.add('selected');
      a.onclick = () => selectOption(gradeId, 'grade');

      const delBtn = document.createElement('button');
      delBtn.textContent = 'x';
      delBtn.className = 'delete-dropdown-item'; 
      
      delBtn.onclick = (e) => {
          e.stopPropagation(); 
          deleteGrade(gradeId);
      };

      itemContainer.appendChild(a);
      itemContainer.appendChild(delBtn);
      dropdown.appendChild(itemContainer);
    });

    const input = document.createElement('input'); 
    input.placeholder = "New grade"; 
    input.id='newGradeInput';
    input.onclick = (e) => e.stopPropagation(); 
    dropdown.appendChild(input);
    
    const addBtn = document.createElement('a'); 
    addBtn.textContent = '+ Add'; 
    addBtn.onclick = (e) => addNewGrade(e); 
    dropdown.appendChild(addBtn);
  }, err => console.error('Grades load error', err));
}

function loadChapters(){
  const dropdown = document.getElementById('chapterDropdown');
  if(!selected.grade){ dropdown.innerHTML=''; return; }
  db.collection("Grades").doc(selected.grade).collection("Chapters").onSnapshot(snapshot=>{
    dropdown.innerHTML='';
    snapshot.forEach(doc=>{
      const chapterId = doc.id;
      
      const itemContainer = document.createElement('div');
      itemContainer.className = 'dropdown-item-container';

      const a = document.createElement('a'); // CRITICAL: This line declares 'a'
      a.textContent = chapterId;
      if(chapterId === selected.chapter) a.classList.add('selected');
      a.onclick = () => selectOption(chapterId, 'chapter');

      const delBtn = document.createElement('button');
      delBtn.textContent = 'x';
      delBtn.className = 'delete-dropdown-item';
      
      delBtn.onclick = (e) => {
          e.stopPropagation(); 
          deleteChapter(chapterId); 
      };

      itemContainer.appendChild(a);
      itemContainer.appendChild(delBtn);
      dropdown.appendChild(itemContainer);
      
    });
    
    const input = document.createElement('input'); 
    input.placeholder='New chapter'; 
    input.id='newChapterInput';
    input.onclick = (e) => e.stopPropagation();
    dropdown.appendChild(input);
    const addBtn = document.createElement('a'); 
    addBtn.textContent = '+ Add'; 
    addBtn.onclick = (e) => addNewChapter(e);
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
        const topicId = doc.id;
        
        const itemContainer = document.createElement('div');
        itemContainer.className = 'dropdown-item-container';

        const a = document.createElement('a'); // CRITICAL: This line declares 'a'
        a.textContent = topicId;
        if(topicId === selected.topic) a.classList.add('selected');
        a.onclick = () => selectOption(topicId, 'topic');
        
        const delBtn = document.createElement('button');
        delBtn.textContent = 'x';
        delBtn.className = 'delete-dropdown-item';
        
        delBtn.onclick = (e) => {
            e.stopPropagation(); 
            deleteTopic(topicId); 
        };

        itemContainer.appendChild(a);
        itemContainer.appendChild(delBtn);
        dropdown.appendChild(itemContainer);
        
      });
      
      const input = document.createElement('input'); 
      input.placeholder='New topic'; 
      input.id='newTopicInput';
      input.onclick = (e) => e.stopPropagation(); 
      dropdown.appendChild(input);
      const addBtn = document.createElement('a'); 
      addBtn.textContent = '+ Add'; 
      addBtn.onclick = (e) => addNewTopic(e);
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
        const typeId = doc.id;

        const itemContainer = document.createElement('div');
        itemContainer.className = 'dropdown-item-container';

        const a = document.createElement('a'); // CRITICAL: This line declares 'a'
        a.textContent = typeId;
        if(typeId === selected.questionType) a.classList.add('selected');
        a.onclick = () => selectOption(typeId, 'questionType');

        const delBtn = document.createElement('button');
        delBtn.textContent = 'x';
        delBtn.className = 'delete-dropdown-item';
        
        delBtn.onclick = (e) => {
            e.stopPropagation(); 
            deleteQuestionType(typeId);
        };
        
        itemContainer.appendChild(a);
        itemContainer.appendChild(delBtn);
        dropdown.appendChild(itemContainer);
        
      });
      
      const input = document.createElement('input'); 
      input.placeholder='New type'; 
      input.id='newQuestionTypeInput';
      input.onclick = (e) => e.stopPropagation(); 
      dropdown.appendChild(input);
      const addBtn = document.createElement('a'); 
      addBtn.textContent = '+ Add'; 
      addBtn.onclick = (e) => addNewQuestionType(e);
      dropdown.appendChild(addBtn);
  }, err => console.error('QuestionTypes load error', err));
}

// ====== add new items (Ensure stop propagation happens here too for safety) ======
function addNewGrade(e){ 
if(e) e.stopPropagation(); 
  const inputEl = document.getElementById('newGradeInput');
  const val = inputEl.value?.trim(); 
  
  if(!val) return showNotification('Grade empty','error'); 
  
  // CRITICAL ADDITION: Check for spaces
  if(val.includes(' ')){
    return showNotification('Grade name cannot contain spaces.','error');
  }

  db.collection('Grades').doc(val).set({createdAt:Date.now()}); 
  inputEl.value = ''; 
  showNotification('Grade added');
}
function addNewChapter(e){ 
  if(e) e.stopPropagation(); 
  if(!selected.grade) return showNotification('Select grade first','error'); 
  const inputEl = document.getElementById('newChapterInput');
  const val = inputEl.value?.trim(); 
  
  if(!val) return showNotification('Chapter empty','error'); 
  
  // CRITICAL ADDITION: Check for spaces
  if(val.includes(' ')){
    return showNotification('Chapter name cannot contain spaces.','error');
  }
  
  db.collection('Grades').doc(selected.grade).collection('Chapters').doc(val).set({createdAt:Date.now()}); 
  inputEl.value=''; 
  showNotification('Chapter added');
}
function addNewTopic(e){ 
  if(e) e.stopPropagation(); 
  if(!selected.grade || !selected.chapter) return showNotification('Select grade & chapter','error'); 
  const inputEl = document.getElementById('newTopicInput'); // Use inputEl variable
  const val = inputEl.value?.trim(); 
  
  if(!val) return showNotification('Topic empty','error'); 
  
  // CRITICAL ADDITION: Check for spaces
  if(val.includes(' ')){
    return showNotification('Topic name cannot contain spaces.','error');
  }
  
  db.collection('Grades').doc(selected.grade).collection('Chapters').doc(selected.chapter).collection('Topics').doc(val).set({createdAt:Date.now()}); 
  inputEl.value = ''; // Use inputEl variable to clear
  showNotification('Topic added'); 
}
function addNewQuestionType(e){ 
  if(e) e.stopPropagation(); 
  if(!selected.grade || !selected.chapter || !selected.topic) return showNotification('Select grade/chapter/topic','error'); 
  const inputEl = document.getElementById('newQuestionTypeInput'); // Use inputEl variable
  const val = inputEl.value?.trim(); 
  
  if(!val) return showNotification('Type empty','error'); 
  
  // CRITICAL ADDITION: Check for spaces
  if(val.includes(' ')){
    return showNotification('Question Type name cannot contain spaces.','error');
  }
  
  db.collection('Grades').doc(selected.grade).collection('Chapters').doc(selected.chapter).collection('Topics').doc(selected.topic).collection('QuestionTypes').doc(val).set({createdAt:Date.now()}); 
  inputEl.value = ''; // Use inputEl variable to clear
  showNotification('Question type added'); 
}

// ====== load questions (RESTORED REAL-TIME LISTENER) ======
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
  const data = doc.data();
 const li = document.createElement("li");
 const qSpan = document.createElement("span");
 const aSpan = document.createElement("span");
 const del = document.createElement("div");


 
 li.setAttribute("data-id", doc.id);
 const imgBadge = data.imageFileName 
                ? `<span class="img-badge">🖼️ File: <strong>${escapeHtml(data.imageFileName)}</strong></span>` 
                : '';
 qSpan.textContent = doc.data().question;
 aSpan.textContent = doc.data().answer;
 del.textContent = "x";
 
 li.appendChild(qSpan);
 li.appendChild(aSpan);
 li.appendChild(del);

 // NEW: HTML for the image badge, only included if a file name exists

li.innerHTML = `
                <input type="checkbox" class="question-checkbox" data-id="${doc.id}">
                ${imgBadge} 
                <span class="q" data-field="question" contenteditable="true">${escapeHtml(data.question)}</span>
                <span class="a" data-field="answer" contenteditable="true">${escapeHtml(data.answer)}</span>
                <button class="delete-btn" data-id="${doc.id}">x</button>`;
  
  questionList.appendChild(li);

  // Add event listener for the delete button
  li.querySelector('.delete-btn').addEventListener('click', () => deleteQuestion(doc.id));
  li.querySelector('.q').addEventListener('blur', (e) => updateQuestionField(doc.id, 'question', e.target.textContent));
  li.querySelector('.a').addEventListener('blur', (e) => updateQuestionField(doc.id, 'answer', e.target.textContent));
 questionList.appendChild(li);
 updateMassDeleteButtonState();
 del.addEventListener("click", () => {
 ref.doc(doc.id).delete();
 });
 });
 });
 }   

function updateQuestionField(docId, fieldName, newValue) {
    if (!selected.grade || !selected.chapter || !selected.topic || !selected.questionType) {
        return showNotification('Cannot edit: Please select all categories.', 'error');
    }
    
    // 1. Get the Firestore document reference
    const ref = db.collection("Grades").doc(selected.grade).collection("Chapters").doc(selected.chapter)
        .collection("Topics").doc(selected.topic).collection("QuestionTypes").doc(selected.questionType).collection("Questions").doc(docId);
        
    // 2. Prepare the update object
    const update = {};
    update[fieldName] = newValue.trim(); // Trim the value before saving

    // 3. Perform the update
    ref.update(update)
        .then(() => {
            // Because loadQuestions uses an onSnapshot listener, the list will refresh automatically.
            showNotification(`${fieldName === 'question' ? 'Question' : 'Answer'} updated!`);
        })
        .catch(err => {
            console.error('Update error', err);
            showNotification('Failed to update field.', 'error');
        });
}
 function updateMassDeleteButtonState() {
    const checkboxes = document.querySelectorAll('.question-checkbox');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const massDeleteBtn = document.getElementById('massDeleteBtn');
    
    massDeleteBtn.disabled = checkedCount === 0;
    massDeleteBtn.classList.toggle('disabled-delete-btn', checkedCount === 0);
}

function massDeleteQuestions() {
    if (!selected.grade || !selected.chapter || !selected.topic || !selected.questionType) {
        return showNotification('Please select all categories.', 'error');
    }

    const checkboxes = document.querySelectorAll('.question-checkbox:checked');
    if (checkboxes.length === 0) {
        return showNotification('No questions selected for deletion.', 'error');
    }

    if (!confirm(`Are you sure you want to delete ${checkboxes.length} selected questions?`)) {
        return;
    }

    const ref = db
        .collection("Grades").doc(selected.grade)
        .collection("Chapters").doc(selected.chapter)
        .collection("Topics").doc(selected.topic)
        .collection("QuestionTypes").doc(selected.questionType)
        .collection("Questions");

    const batch = db.batch();
    
    checkboxes.forEach(cb => {
        const docId = cb.getAttribute('data-id');
        const docRef = ref.doc(docId);
        batch.delete(docRef);
    });
    updateCurrentSelection();
    loadChapters(); loadTopics(); loadQuestionTypes(); loadQuestions();
    batch.commit()
        .then(() => {
            showNotification(`${checkboxes.length} questions deleted successfully!`, 'error');
        })
        .catch(err => {
            console.error('Mass delete error', err);
            showNotification('Failed to delete selected questions.', 'error');
        });
}

// ====== init ======
window.onload = () => {
  loadGrades();
  loadChapters();
  loadTopics();
  loadQuestionTypes();
  updateCurrentSelection();

  // New listener for the mass delete button
  document.getElementById('massDeleteBtn').addEventListener('click', massDeleteQuestions);
  
  // Add global listener for checkbox changes
  document.getElementById('question-list').addEventListener('change', (e) => {
    if (e.target.matches('.question-checkbox')) {
        updateMassDeleteButtonState();
    }
  });

  // NEW: Attach listener for the image visibility toggle and initialize state
  document.getElementById('hasImageCheck').addEventListener('change', updateImageInputVisibility);
  updateImageInputVisibility(); // Initialize visibility state
};