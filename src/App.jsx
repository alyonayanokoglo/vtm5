import { useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import './App.css'

const CLANS = [
  'Бруха',
  'Вентру',
  'Гангрел',
  'Малкавиане',
  'Носферату',
  'Тореадор',
  'Тремер',
  'Каитифы',
  'Цимисхи',
  'Слабокровные',
]

const PREDATOR_TYPES = [
  'Бестия',
  'Джентльмен',
  'Идол',
  'Искуситель',
  'Морфей',
  'Налетчик',
  'Семьянин',
  'Суррогатчик',
  'Тусовщик',
  'Фермер',
]

const ATTRIBUTES = {
  Физические: ['Сила', 'Ловкость', 'Выносливость'],
  Социальные: ['Харизма', 'Манипулирование', 'Самообладание'],
  Ментальные: ['Интеллект', 'Смекалка', 'Решительность'],
}

const SKILLS = {
  Физические: ['Атлетика', 'Рукопашный бой', 'Ремесло', 'Вождение', 'Стрельба', 'Воровство', 'Холодное оружие', 'Скрытность', 'Выживание'],
  Социальные: ['Обращение с животными', 'Этикет', 'Проницательность', 'Запугивание', 'Лидерство', 'Исполнение', 'Убеждение', 'Уличное чутье', 'Хитрость'],
  Ментальные: ['Гуманитарные науки', 'Наблюдательность', 'Финансы', 'Расследование', 'Медицина', 'Оккультизм', 'Политика', 'Естественные науки', 'Технологии'],
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
  const importInputRef = useRef(null)
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
    merits: '',
    flaws: '',
    notes: '',
  })
  const [attributes, setAttributes] = useState(initialAttributes)
  const [skills, setSkills] = useState(initialSkills)
  const [disciplines, setDisciplines] = useState([
    { name: 'Дисциплина 1', dots: 1, description: '' },
    { name: 'Дисциплина 2', dots: 0, description: '' },
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

  const printDisciplines = useMemo(() => {
    const rows = disciplines.slice(0, 4).map((item) => ({
      name: item.name?.trim() || '________________',
      dots: item.dots ?? 0,
      description: item.description?.trim() || '',
    }))

    while (rows.length < 4) {
      rows.push({ name: '________________', dots: 0, description: '' })
    }

    return rows
  }, [disciplines])

  const saveCharacterJson = () => {
    const data = {
      version: 'v5-character-sheet-1',
      character,
      attributes,
      skills,
      disciplines,
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const safeName = (character.name || 'vtm-character').trim().replace(/\s+/g, '-')
    link.href = url
    link.download = `${safeName}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const openJsonImport = () => {
    importInputRef.current?.click()
  }

  const loadCharacterJson = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const raw = await file.text()
      const parsed = JSON.parse(raw)

      if (!parsed?.character || !parsed?.attributes || !parsed?.skills || !parsed?.disciplines) {
        throw new Error('Некорректный формат файла персонажа.')
      }

      setCharacter((prev) => ({ ...prev, ...parsed.character }))
      setAttributes((prev) => ({ ...prev, ...parsed.attributes }))
      setSkills((prev) => ({ ...prev, ...parsed.skills }))
      setDisciplines(
        Array.isArray(parsed.disciplines)
          ? parsed.disciplines.map((item, i) => ({
              name: item?.name ?? `Дисциплина ${i + 1}`,
              dots: Number.isFinite(item?.dots) ? item.dots : 0,
              description: item?.description ?? '',
            }))
          : [],
      )
    } catch (error) {
      window.alert(`Не удалось загрузить JSON: ${error.message}`)
    } finally {
      event.target.value = ''
    }
  }

  return (
    <main className="sheet" ref={sheetRef}>
      <header className="vamp-header">
        <h1>Vampire: The Masquerade V5 - Конструктор персонажа</h1>
        <p className="subtitle">Собери чарлист, отметь ключевые параметры и держи важное на одном экране.</p>
        <div className="actions">
          <button type="button" className="download printBtn" onClick={printA4}>
            Печать / PDF A4 (белый лист)
          </button>
          <button type="button" className="download" onClick={saveCharacterJson}>
            Сохранить JSON
          </button>
          <button type="button" className="download" onClick={openJsonImport}>
            Загрузить JSON
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={loadCharacterJson}
            style={{ display: 'none' }}
          />
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
          Стиль охоты
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
          Сила крови
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
          <div className="discipline-item" key={`discipline-${index}`}>
            <div className="discipline-head">
              <input
                value={discipline.name}
                placeholder={`Дисциплина ${index + 1}`}
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
              <button
                type="button"
                className="discipline-delete"
                onClick={() =>
                  setDisciplines((prev) => prev.filter((_, i) => i !== index))
                }
              >
                Удалить
              </button>
            </div>
            <textarea
              rows={2}
              value={discipline.description || ''}
              placeholder="О чем дисциплина, как проявляется, ключевые эффекты..."
              onChange={(e) =>
                setDisciplines((prev) =>
                  prev.map((item, i) =>
                    i === index ? { ...item, description: e.target.value } : item,
                  ),
                )
              }
            />
          </div>
        ))}
        <button
          className="add"
          onClick={() =>
            setDisciplines((prev) => [
              ...prev,
              { name: `Дисциплина ${prev.length + 1}`, dots: 0, description: '' },
            ])
          }
        >
          Добавить дисциплину
        </button>
      </section>

      <section className="panel grid2">
        <label>
          Достоинства
          <textarea
            rows={4}
            value={character.merits}
            onChange={(e) => updateCharacter('merits', e.target.value)}
            placeholder="Ресурсы, союзники, влияние, убежище..."
          />
        </label>
        <label>
          Недостатки
          <textarea
            rows={4}
            value={character.flaws}
            onChange={(e) => updateCharacter('flaws', e.target.value)}
            placeholder="Враги, уязвимости, обязательства, ограничения..."
          />
        </label>
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
          <div className="print-top-col">
            <div><strong>Имя:</strong> {character.name || '____________________'}</div>
            <div><strong>Концепт:</strong> {character.concept || '____________________'}</div>
            <div><strong>Хроника:</strong> {character.chronicle || '____________________'}</div>
          </div>
          <div className="print-top-col">
            <div><strong>Амбиция:</strong> {character.ambition || '____________________'}</div>
            <div><strong>Желание:</strong> {character.desire || '____________________'}</div>
            <div><strong>Стиль охоты:</strong> {character.predatorType}</div>
          </div>
          <div className="print-top-col">
            <div><strong>Клан:</strong> {character.clan}</div>
            <div><strong>Поколение:</strong> {character.generation}</div>
            <div><strong>Сир:</strong> {character.sire || '____________________'}</div>
            <div><strong>Сила крови:</strong> {character.bloodPotency}</div>
          </div>
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

        <h3>Дисциплины</h3>
        <div className="print-grid2-full">
          <div className="print-card discipline-card">
            {printDisciplines.slice(0, 2).map((d, i) => (
              <div className="print-row discipline-row" key={`discipline-left-${i}`}>
                <div className="print-row-main">
                  <span>{d.name}</span>
                  {renderTrack(d.dots, 5)}
                </div>
                <div className="print-row-note">
                  {d.description || '________________'}
                </div>
              </div>
            ))}
          </div>
          <div className="print-card discipline-card">
            {printDisciplines.slice(2, 4).map((d, i) => (
              <div className="print-row discipline-row" key={`discipline-right-${i}`}>
                <div className="print-row-main">
                  <span>{d.name}</span>
                  {renderTrack(d.dots, 5)}
                </div>
                <div className="print-row-note">
                  {d.description || '________________'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <h3>Достоинства и недостатки</h3>
        <div className="print-grid2-full">
          <div className="print-card">
            <h4>Достоинства</h4>
            <div className="print-lined-block">{character.merits?.trim() ? character.merits : ''}</div>
          </div>
          <div className="print-card">
            <h4>Недостатки</h4>
            <div className="print-lined-block">{character.flaws?.trim() ? character.flaws : ''}</div>
          </div>
        </div>

        <h3>Состояние</h3>
        <div className="print-card">
          <h4>Трекеры</h4>
          <div className="print-row"><span>Здоровье</span>{renderTrack(derived.health, 10)}</div>
          <div className="print-row"><span>Воля</span>{renderTrack(derived.willpower, 10)}</div>
          <div className="print-row"><span>Голод</span>{renderTrack(0, 5)}</div>
          <div className="print-row"><span>Человечность</span>{renderTrack(character.humanity, 10)}</div>
        </div>

        <section className="print-notes-page">
          <h3>Заметки персонажа</h3>
          <div className="print-card print-notes-card">
            <div className="print-notes">
              {character.notes?.trim() ? character.notes : ''}
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
