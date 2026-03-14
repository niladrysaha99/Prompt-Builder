let API_KEY = localStorage.getItem("gemini_api_key")

function saveKey(){

const key=document.getElementById("apikey").value

localStorage.setItem("gemini_api_key",key)

API_KEY=key

alert("API key saved")

}



/* TABS */

document.querySelectorAll(".tab").forEach(tab=>{

tab.onclick=()=>{

document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"))

document.querySelectorAll(".tab-content").forEach(c=>c.classList.remove("active"))

tab.classList.add("active")

document.getElementById(tab.dataset.tab).classList.add("active")

}

})



/* PILLS */

document.querySelectorAll(".pill").forEach(p=>{

p.onclick=()=>p.classList.toggle("active")

})



/* UPLOAD */

document.querySelectorAll(".drop-area").forEach(area=>{

const input=document.getElementById(area.dataset.input)

area.onclick=()=>input.click()

input.onchange=()=>{

const file=input.files[0]

previewImage(file,input.id)

analyzeImage(file,input.id)

}

})



function previewImage(file,type){

const reader=new FileReader()

reader.onload=e=>{

document.getElementById(type.replace("Input","Preview")).src=e.target.result

}

reader.readAsDataURL(file)

}



/* GEMINI IMAGE ANALYSIS */

async function analyzeImage(file,type){

const base64=await toBase64(file)

const body={
contents:[
{
parts:[
{ text:"Describe this image for AI image generation prompt."},
{
inline_data:{
mime_type:file.type,
data:base64.split(",")[1]
}
}
]
}
]
}

const res=await fetch(
`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify(body)
})

const data=await res.json()

const text=data.candidates[0].content.parts[0].text

document.getElementById(type.replace("Input","Prompt")).innerText=text

}



function toBase64(file){

return new Promise((resolve,reject)=>{

const reader=new FileReader()

reader.readAsDataURL(file)

reader.onload=()=>resolve(reader.result)

reader.onerror=reject

})

}



/* PROMPT GENERATOR */

document.getElementById("generatePrompt").onclick=()=>{

const subject=document.getElementById("subjectInput").value

let tags=[]

document.querySelectorAll(".pill.active").forEach(p=>tags.push(p.innerText))

const prompt=`${subject}, ${tags.join(", ")}`

document.getElementById("promptOutput").innerText=prompt

saveHistory(prompt)

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
