const API_KEY = "AIzaSyALe7aNOil-9pHou10fk6JQy6lgWzA_I3g"

let references = {
character:"",
background:"",
element:""
}


/* TAB SWITCH */

const tabs=document.querySelectorAll(".tab")
const contents=document.querySelectorAll(".tab-content")

tabs.forEach(tab=>{

tab.addEventListener("click",()=>{

tabs.forEach(t=>t.classList.remove("active"))
contents.forEach(c=>c.classList.remove("active"))

tab.classList.add("active")

document.getElementById(tab.dataset.tab).classList.add("active")

})

})



/* UPLOAD CLICK */

document.querySelectorAll(".drop-area").forEach(area=>{

const input=document.getElementById(area.dataset.input)

area.addEventListener("click",()=>input.click())

input.addEventListener("change",()=>{

const file=input.files[0]

if(file){

handleImageUpload(file,input.id)

}

})

})



/* IMAGE → GEMINI PROMPT */

async function handleImageUpload(file,type){

const base64 = await toBase64(file)

const body = {
contents:[
{
parts:[
{
text:"Describe this image in a detailed way suitable for AI image generation prompts."
},
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

const res = await fetch(
`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify(body)
}
)

const data = await res.json()

const text = data.candidates[0].content.parts[0].text


if(type==="characterInput"){
references.character=text
document.getElementById("characterPrompt").innerText=text
}

if(type==="backgroundInput"){
references.background=text
document.getElementById("backgroundPrompt").innerText=text
}

if(type==="elementInput"){
references.element=text
document.getElementById("elementPrompt").innerText=text
}

}



/* BASE64 CONVERTER */

function toBase64(file){

return new Promise((resolve,reject)=>{

const reader=new FileReader()

reader.readAsDataURL(file)

reader.onload=()=>resolve(reader.result)

reader.onerror=error=>reject(error)

})

}



/* FINAL PROMPT */

document.getElementById("generatePrompt").onclick=()=>{

const subject=document.getElementById("subjectInput").value

const finalPrompt = `

${references.character}

${references.background}

${references.element}

Subject: ${subject}

Ultra detailed cinematic image, 8k, professional photography
`

document.getElementById("promptOutput").innerText=finalPrompt

}
