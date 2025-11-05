const questionList = document.querySelector('#question-list');
const form = document.querySelector('#add-question-form');

//create element and render questions
function renderQuestionList(doc) {
    let li = document.createElement("li");
    let question = document.createElement("span");
    let answer = document.createElement("span");
    let cross = document.createElement("div");

    li.setAttribute('data-id', doc.id);
    question.textContent = doc.data().question;
    answer.textContent = doc.data().answer;
    cross.textContent = 'x';

    li.appendChild(question);
    li.appendChild(answer);
    li.appendChild(cross);

    questionList.appendChild(li);

    // deleting data

    cross.addEventListener("click", (e) => {
        e.stopPropagation();
        let id = e.target.parentElement.getAttribute("data-id");
        db.collection("Grades").doc("Grade_4").collection("Chapters").doc("Chapter_1").collection("Topics").doc("Understand_Place_Value").collection("QuestionTypes").doc("QuestionType1").collection("Questions").doc(id).delete();
    })
}

// //getting data
// db.collection("Grades").doc("Grade_4").collection("Chapters").doc("Chapter_1").collection("Topics").doc("Understand_Place_Value").collection("QuestionTypes").doc("QuestionType1").collection("Questions").get().then((snapshot) => {
//     snapshot.docs.forEach(doc => {
//         renderQuestionList(doc);
//     })
// })

//saving data
form.addEventListener("submit", (e) => {
    e.preventDefault();
    db.collection("Grades").doc("Grade_4").collection("Chapters").doc("Chapter_1").collection("Topics").doc("Understand_Place_Value").collection("QuestionTypes").doc("QuestionType1").collection("Questions").add({
        question: form.question.value,
        answer: form.answer.value,
    });
    form.question.value = "";
    form.answer.value = "";
})

// real-time listener

db.collection("Grades").doc("Grade_4").collection("Chapters").doc("Chapter_1").collection("Topics").doc("Understand_Place_Value").collection("QuestionTypes").doc("QuestionType1").collection("Questions").onSnapshot(snapshot => {
    let changes = snapshot.docChanges();
    changes.forEach(change => {
        if(change.type === 'added'){
            renderQuestionList(change.doc);
        } else if(change.type === 'removed'){
            let li = questionList.querySelector("[data-id=" + change.doc.id + "]");
            questionList.removeChild(li);
        }
    })
})
