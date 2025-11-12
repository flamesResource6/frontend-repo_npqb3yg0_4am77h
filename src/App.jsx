import { useEffect, useMemo, useState } from 'react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || ''

function LargeButton({ children, onClick, color = 'bg-blue-600' }) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-6 text-2xl font-semibold text-white ${color} rounded-2xl shadow-lg active:scale-95 transition`}
    >
      {children}
    </button>
  )
}

function TodayCard({ item, onTake, onSnooze }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-md">
      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-3xl">
        💊
      </div>
      <div className="flex-1">
        <div className="text-2xl font-bold text-gray-900">{item.name}</div>
        <div className="text-gray-600 text-lg">{item.dosage}</div>
        <div className="text-sm text-gray-500">Scheduled: {new Date(item.scheduled_at).toLocaleTimeString()}</div>
      </div>
      <div className="flex flex-col gap-2 w-40">
        <LargeButton color="bg-green-600" onClick={() => onTake(item)}>Take</LargeButton>
        <LargeButton color="bg-amber-600" onClick={() => onSnooze(item)}>Remind later</LargeButton>
      </div>
    </div>
  )
}

function Voice({ userId, onResponse }) {
  const [listening, setListening] = useState(false)
  const canVoice = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window

  const recognition = useMemo(() => {
    if (!canVoice) return null
    const R = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new R()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = async (e) => {
      const text = e.results[0][0].transcript
      onResponse(`You said: ${text}`)
      const res = await fetch(`${BACKEND}/api/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, user_id: userId })
      }).then(r => r.json())
      onResponse(res.response)
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(res.response)
        window.speechSynthesis.speak(utter)
      }
      setListening(false)
    }
    rec.onend = () => setListening(false)
    return rec
  }, [canVoice, onResponse, userId])

  const start = () => {
    if (!recognition) return
    setListening(true)
    recognition.start()
  }

  return (
    <div className="mt-4">
      <button onClick={start} className={`w-full py-8 rounded-2xl text-2xl font-bold text-white ${listening ? 'bg-red-600' : 'bg-indigo-600'} shadow-lg active:scale-95`}>
        🎤 Hold to speak
      </button>
      {!canVoice && <div className="text-center text-sm text-gray-500 mt-2">Voice unavailable in this browser</div>}
    </div>
  )
}

function ElderHome({ userId }) {
  const [items, setItems] = useState([])
  const [message, setMessage] = useState('')

  const load = async () => {
    const res = await fetch(`${BACKEND}/api/today/${userId}`).then(r => r.json())
    setItems(res.items || [])
  }

  useEffect(() => { load() }, [])

  const take = async (item) => {
    await fetch(`${BACKEND}/api/take`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, medication_id: item.medication_id, scheduled_at: item.scheduled_at })
    })
    load()
  }

  const snooze = async (item) => {
    await fetch(`${BACKEND}/api/snooze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, medication_id: item.medication_id, scheduled_at: item.scheduled_at, minutes: 15 })
    })
    load()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-3xl font-extrabold">Today's medicine</div>
      <div className="mt-4 flex flex-col gap-4">
        {items.length === 0 && (
          <div className="p-6 bg-white rounded-2xl shadow text-lg text-gray-600">No medication due right now.</div>
        )}
        {items.map(it => (
          <TodayCard key={`${it.medication_id}-${it.scheduled_at}`} item={it} onTake={take} onSnooze={snooze} />
        ))}
      </div>
      <Voice userId={userId} onResponse={setMessage} />
      {message && <div className="mt-3 text-center text-lg text-gray-700">{message}</div>}
    </div>
  )
}

function CaregiverForm({ userId }) {
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [days, setDays] = useState([])
  const [time, setTime] = useState('08:00')
  const [imageUrl, setImageUrl] = useState('')
  const toggleDay = (i) => setDays(d => d.includes(i) ? d.filter(x => x !== i) : [...d, i])
  const submit = async (e) => {
    e.preventDefault()
    const payload = { user_id: userId, name, dosage, pill_image_url: imageUrl, schedule: { days_of_week: days.sort(), times: [time] } }
    await fetch(`${BACKEND}/api/medications`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setName(''); setDosage(''); setDays([]); setImageUrl('')
    alert('Medication added')
  }

  const week = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  return (
    <form onSubmit={submit} className="max-w-xl mx-auto p-4 bg-white rounded-2xl shadow space-y-4">
      <div className="text-2xl font-bold">Add medication</div>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Drug name" className="w-full p-4 text-xl border rounded-lg" required />
      <input value={dosage} onChange={e=>setDosage(e.target.value)} placeholder="Dosage" className="w-full p-4 text-xl border rounded-lg" required />
      <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="Pill image URL (optional)" className="w-full p-4 text-xl border rounded-lg" />
      <div>
        <div className="font-semibold mb-2">Days of week</div>
        <div className="grid grid-cols-7 gap-2">
          {week.map((d,i)=> (
            <button type="button" key={i} onClick={()=>toggleDay(i)} className={`py-3 rounded-xl text-lg ${days.includes(i)?'bg-blue-600 text-white':'bg-gray-100'}`}>{d}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="font-semibold mb-2">Time</div>
        <input type="time" value={time} onChange={e=>setTime(e.target.value)} className="p-3 border rounded-lg text-lg" />
      </div>
      <LargeButton>Save</LargeButton>
    </form>
  )
}

function CaregiverCalendar({ userId }) {
  const [days, setDays] = useState([])
  useEffect(()=>{
    fetch(`${BACKEND}/api/caregiver/compliance/${userId}`).then(r=>r.json()).then(d=>setDays(d.calendar||[]))
  },[])
  const color = (s)=> s==='taken'?'bg-green-500': s==='missed'?'bg-red-500':'bg-amber-400'
  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="text-2xl font-bold mb-3">Compliance</div>
      <div className="grid grid-cols-7 gap-2">
        {days.map(d => (
          <div key={d.date} className={`h-12 rounded-lg ${color(d.status)} text-white flex items-center justify-center text-sm`}>{new Date(d.date).getDate()}</div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState('elder') // 'elder' | 'caregiver'
  const [elderId, setElderId] = useState('elder-1')

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between py-4">
          <div className="text-3xl font-extrabold">SmartPill</div>
          <div className="flex gap-2">
            <button onClick={()=>setMode('elder')} className={`px-4 py-2 rounded-xl ${mode==='elder'?'bg-indigo-600 text-white':'bg-white'}`}>Elder</button>
            <button onClick={()=>setMode('caregiver')} className={`px-4 py-2 rounded-xl ${mode==='caregiver'?'bg-indigo-600 text-white':'bg-white'}`}>Caregiver</button>
          </div>
        </div>

        {mode==='elder' && <ElderHome userId={elderId} />}
        {mode==='caregiver' && (
          <div className="grid md:grid-cols-2 gap-6">
            <CaregiverForm userId={elderId} />
            <CaregiverCalendar userId={elderId} />
          </div>
        )}
      </div>
    </div>
  )
}
