import { useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import './App.css'

const CLANS = [
  'Бруха',
  'Гангрел',
  'Малкавиан',
  'Носферату',
  'Тореадор',
  'Тремер',
  'Вентру',
  'Ласомбра',
  'Хекада',
  'Министерство',
  'Тцимици',
  'Тонкокровный',
]

const PREDATOR_TYPES = [
  'Аллигатор',
  'Котоподобный',
  'Кровавый культист',
  'Осирис',
  'Песочница',
  'Сирена',
  'Фермер',
]

const ATTRIBUTES = {
  Физические: ['Сила', 'Ловкость', 'Выносливость'],
  Социальные: ['Харизма', 'Манипуляция', 'Самообладание'],
  Ментальные: ['Интеллект', 'Сообразительность', 'Решительность'],
}

const SKILLS = {
  Физические: ['Атлетика', 'Драка', 'Ремесло', 'Вождение', 'Огнестрел', 'Кража', 'Скрытность', 'Выживание', 'Рукопашный бой'],
  Социальные: ['Обаяние', 'Запугивание', 'Этикет', 'Выступление', 'Убеждение', 'Уличная мудрость', 'Хитрость', 'Животные', 'Лидерство'],
  Ментальные: ['Академичность', 'Осведомленность', 'Финансы', 'Расследование', 'Медицина', 'Оккультизм', 'Политика', 'Наука', 'Технологии'],
}

const initialAttributes = Object.values(ATTRIBUTES).flat().reduce((acc, item) => {
  acc[item] = 1
  return acc
}, {})

const initialSkills = Object.values(SKILLS).flat().reduce((acc, item) => {
  acc[item] = 0
  return acc
}, {})

function App() {
  const sheetRef = useRef(null)
  const printSheetRef = useRef(null)
  const [character, setCharacter] = useState({
    name: '',
    concept: '',
    sire: '',
    chronicle: '',
    ambition: '',
    desire: '',
    clan: CLANS[0],
    predatorType: PREDATOR_TYPES[0],
    generation: '13',
    humanity: 7,
    bloodPotency: 1,
    notes: '',
  })
  const [attributes, setAttributes] = useState(initialAttributes)
  const [skills, setSkills] = useState(initialSkills)
  const [disciplines, setDisciplines] = useState([
    { name: 'Дисциплина 1', dots: 1 },
    { name: 'Дисциплина 2', dots: 0 },
  ])

  const derived = useMemo(
    () => ({
      health: 3 + attributes['Выносливость'],
      willpower: attributes['Самообладание'] + attributes['Решительность'],
      skillDotsTotal: Object.values(skills).reduce((sum, value) => sum + value, 0),
      attributeDotsTotal: Object.values(attributes).reduce((sum, value) => sum + value, 0),
    }),
    [attributes, skills],
  )

  const updateCharacter = (field, value) => {
    setCharacter((prev) => ({ ...prev, [field]: value }))
  }

  const renderDotInput = (value, onChange, max = 5, min = 0) => (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {Array.from({ length: max - min + 1 }).map((_, i) => {
        const dots = i + min
        return (
          <option key={dots} value={dots}>
            {dots}
          </option>
        )
      })}
    </select>
  )

  const downloadPdf = async () => {
    if (!printSheetRef.current) return

    document.body.classList.add('pdf-export')
    let canvas
    try {
      canvas = await html2canvas(printSheetRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
      })
    } finally {
      document.body.classList.remove('pdf-export')
    }

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imageRatio = canvas.width / canvas.height
    const pageRatio = pageWidth / pageHeight

    let renderWidth = pageWidth
    let renderHeight = pageHeight

    if (imageRatio > pageRatio) {
      renderHeight = pageWidth / imageRatio
    } else {
      renderWidth = pageHeight * imageRatio
    }

    const x = (pageWidth - renderWidth) / 2
    const y = (pageHeight - renderHeight) / 2

    pdf.setFillColor(255, 255, 255)
    pdf.rect(0, 0, pageWidth, pageHeight, 'F')
    pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST')

    const safeName = character.name?.trim() ? character.name.trim() : 'v5-character'
    pdf.save(`${safeName}.pdf`)
  }

  const printA4 = () => {
    window.print()
  }

  const renderTrack = (filled, total = 5) => (
    <span className="track">
      {Array.from({ length: total }).map((_, i) => (
        <svg
          key={i}
          className={`dot-svg ${i < filled ? 'filled' : ''}`}
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <circle className="dot-ring" cx="50" cy="50" r="44" />
          {i < filled ? <circle className="dot-core" cx="50" cy="50" r="34" /> : null}
        </svg>
      ))}
    </span>
  )

  return (
    <main className="sheet" ref={sheetRef}>
      <header className="vamp-header">
        <h1>Vampire: The Masquerade V5 - Конструктор персонажа</h1>
        <p className="subtitle">Собери чарлист, отметь ключевые параметры и держи важное на одном экране.</p>
        <div className="blood-drips" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="vamp-fangs" aria-hidden="true">
          <span />
          <span />
        </div>
        <div className="bite-marks" aria-hidden="true">
          <span />
          <span />
        </div>
        <div className="actions">
          <button type="button" className="download printBtn" onClick={printA4}>
            Печать / PDF A4 (белый лист)
          </button>
        </div>
      </header>

      <div className="editor-only">
      <section className="panel grid2">
        <label>
          Имя персонажа
          <input value={character.name} onChange={(e) => updateCharacter('name', e.target.value)} />
        </label>
        <label>
          Концепция
          <input value={character.concept} onChange={(e) => updateCharacter('concept', e.target.value)} />
        </label>
        <label>
          Сир
          <input value={character.sire} onChange={(e) => updateCharacter('sire', e.target.value)} />
        </label>
        <label>
          Хроника
          <input value={character.chronicle} onChange={(e) => updateCharacter('chronicle', e.target.value)} />
        </label>
        <label>
          Амбиция
          <input value={character.ambition} onChange={(e) => updateCharacter('ambition', e.target.value)} />
        </label>
        <label>
          Желание
          <input value={character.desire} onChange={(e) => updateCharacter('desire', e.target.value)} />
        </label>
        <label>
          Клан
          <select value={character.clan} onChange={(e) => updateCharacter('clan', e.target.value)}>
            {CLANS.map((clan) => (
              <option key={clan}>{clan}</option>
            ))}
          </select>
        </label>
        <label>
          Тип хищника
          <select value={character.predatorType} onChange={(e) => updateCharacter('predatorType', e.target.value)}>
            {PREDATOR_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          Поколение
          <input value={character.generation} onChange={(e) => updateCharacter('generation', e.target.value)} />
        </label>
        <label>
          Человечность ({character.humanity})
          <input type="range" min="0" max="10" value={character.humanity} onChange={(e) => updateCharacter('humanity', Number(e.target.value))} />
        </label>
      </section>

      <section className="panel stats">
        <h2>Производные значения</h2>
        <div>Здоровье: {derived.health}</div>
        <div>Сила воли: {derived.willpower}</div>
        <div>Всего точек атрибутов: {derived.attributeDotsTotal}</div>
        <div>Всего точек навыков: {derived.skillDotsTotal}</div>
        <label>
          Мощь крови
          {renderDotInput(character.bloodPotency, (value) => updateCharacter('bloodPotency', value), 10, 0)}
        </label>
      </section>

      <section className="grid3">
        {Object.entries(ATTRIBUTES).map(([group, list]) => (
          <div key={group} className="panel">
            <h2>{group} атрибуты</h2>
            {list.map((attr) => (
              <label key={attr} className="row">
                <span>{attr}</span>
                {renderDotInput(
                  attributes[attr],
                  (value) => setAttributes((prev) => ({ ...prev, [attr]: value })),
                  5,
                  1,
                )}
              </label>
            ))}
          </div>
        ))}
      </section>

      <section className="grid3">
        {Object.entries(SKILLS).map(([group, list]) => (
          <div key={group} className="panel">
            <h2>{group} навыки</h2>
            {list.map((skill) => (
              <label key={skill} className="row">
                <span>{skill}</span>
                {renderDotInput(
                  skills[skill],
                  (value) => setSkills((prev) => ({ ...prev, [skill]: value })),
                  5,
                  0,
                )}
              </label>
            ))}
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>Дисциплины</h2>
        {disciplines.map((discipline, index) => (
          <div className="discipline" key={`${discipline.name}-${index}`}>
            <input
              value={discipline.name}
              onChange={(e) =>
                setDisciplines((prev) =>
                  prev.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)),
                )
              }
            />
            {renderDotInput(
              discipline.dots,
              (dots) =>
                setDisciplines((prev) =>
                  prev.map((item, i) => (i === index ? { ...item, dots } : item)),
                ),
              5,
              0,
            )}
          </div>
        ))}
        <button
          className="add"
          onClick={() => setDisciplines((prev) => [...prev, { name: `Дисциплина ${prev.length + 1}`, dots: 0 }])}
        >
          Добавить дисциплину
        </button>
      </section>

      <section className="panel">
        <h2>Заметки персонажа</h2>
        <textarea
          rows={6}
          value={character.notes}
          onChange={(e) => updateCharacter('notes', e.target.value)}
          placeholder="Бэкграунд, амбиции, связи, цели, слабости..."
        />
      </section>
      </div>

      <section className="print-sheet" ref={printSheetRef}>
        <h2 className="print-title">Vampire: The Masquerade</h2>
        <div className="print-top">
          <div><strong>Имя:</strong> {character.name || '____________________'}</div>
          <div><strong>Концепт:</strong> {character.concept || '____________________'}</div>
          <div><strong>Хроника:</strong> {character.chronicle || '____________________'}</div>
          <div><strong>Амбиция:</strong> {character.ambition || '____________________'}</div>
          <div><strong>Желание:</strong> {character.desire || '____________________'}</div>
          <div><strong>Стиль охоты:</strong> {character.predatorType}</div>
          <div><strong>Клан:</strong> {character.clan}</div>
          <div><strong>Поколение:</strong> {character.generation}</div>
          <div><strong>Сир:</strong> {character.sire || '____________________'}</div>
          <div><strong>Сила крови:</strong> {character.bloodPotency}</div>
        </div>

        <h3>Атрибуты</h3>
        <div className="print-grid3">
          {Object.entries(ATTRIBUTES).map(([group, list]) => (
            <div key={group} className="print-card">
              <h4>{group}</h4>
              {list.map((item) => (
                <div key={item} className="print-row">
                  <span>{item}</span>
                  {renderTrack(attributes[item], 5)}
                </div>
              ))}
            </div>
          ))}
        </div>

        <h3>Навыки</h3>
        <div className="print-grid3">
          {Object.entries(SKILLS).map(([group, list]) => (
            <div key={group} className="print-card">
              <h4>{group}</h4>
              {list.map((item) => (
                <div key={item} className="print-row">
                  <span>{item}</span>
                  {renderTrack(skills[item], 5)}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="print-bottom">
          <div className="print-card">
            <h4>Дисциплины</h4>
            {disciplines.map((d, i) => (
              <div className="print-row" key={i}>
                <span>{d.name}</span>
                {renderTrack(d.dots, 5)}
              </div>
            ))}
          </div>
          <div className="print-card">
            <h4>Состояние</h4>
            <div className="print-row"><span>Здоровье</span>{renderTrack(derived.health, 10)}</div>
            <div className="print-row"><span>Воля</span>{renderTrack(derived.willpower, 10)}</div>
            <div className="print-row"><span>Голод</span>{renderTrack(0, 5)}</div>
            <div className="print-row"><span>Человечность</span>{renderTrack(character.humanity, 10)}</div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
