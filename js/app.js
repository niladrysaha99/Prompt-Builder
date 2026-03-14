let API_KEY = localStorage.getItem("gemini_api_key")

function saveKey(){

const key=document.getElementById("apikey").value

localStorage.setItem("gemini_api_key",key)

API_KEY=key

alert("API key saved")

}



/* PILLS */

document.querySelectorAll(".pill").forEach(p=>{

p.onclick=()=>p.classList.toggle("active")

})



/* IMAGE PREVIEW */

document.querySelectorAll(".drop-area").forEach(area=>{

const input=document.getElementById(area.dataset.input)

area.onclick=()=>input.click()

input.onchange=()=>{

const file=input.files[0]

preview(file,input.id)

}

})



function preview(file,type){

const reader=new FileReader()

reader.onload=e=>{

document.getElementById(type.replace("Input","Preview")).src=e.target.result

}

reader.readAsDataURL(file)

}



/* PROMPT GENERATOR */

document.getElementById("generatePrompt").onclick=generatePrompt


async function generatePrompt(){

const subject=document.getElementById("subjectInput").value
const action=document.getElementById("actionInput").value
const env=document.getElementById("environmentText").value

let tags=[]

document.querySelectorAll(".pill.active").forEach(p=>tags.push(p.innerText))

const userPrompt=`

Create cinematic prompt using structure:

Camera → Subject → Action → Environment → Lighting → Texture

Subject: ${subject}
Action: ${action}
Environment: ${env}
Extra style: ${tags.join(", ")}

Return JSON format:

{
"camera":"",
"subject":"",
"action":"",
"environment":"",
"lighting":"",
"texture":"",
"final_prompt":""
}

Keep total characters under 1000.

`

const body={
contents:[
{
parts:[{text:userPrompt}]
}
]
}

const res=await fetch(
`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify(body)
}
)

const data=await res.json()

const text=data.candidates[0].content.parts[0].text

document.getElementById("promptOutput").innerText=text

saveHistory(text)

}



/* HISTORY */

function saveHistory(prompt){

let history=JSON.parse(localStorage.getItem("history"))||[]

history.unshift(prompt)

localStorage.setItem("history",JSON.stringify(history))

renderHistory()

}

function renderHistory(){

let history=JSON.parse(localStorage.getItem("history"))||[]

const box=document.getElementById("history")

box.innerHTML=""

history.forEach(p=>{

const div=document.createElement("div")

div.innerText=p

box.appendChild(div)

})

}

renderHistory()
