import { useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import bloodSplatter from './img/—Pngtree—realistic blood splatter stain_22930222.png'
import './App.css'

const CLANS = [
  'Бруха',
  'Вентру',
  'Гангрел',
  'Малкавиане',
  'Носферату',
  'Тореадор',
  'Тремер',
  'Равнос',
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
  Социальные: ['Обаяние', 'Манипулирование', 'Самообладание'],
  Ментальные: ['Интеллект', 'Смекалка', 'Упорство'],
}

const SKILLS = {
  Физические: ['Атлетика', 'Драка', 'Ремесло', 'Вождение', 'Стрельба', 'Воровство', 'Фехтование', 'Скрытность', 'Выживание'],
  Социальные: ['Обращение с животными', 'Этикет', 'Проницательность', 'Запугивание', 'Лидерство', 'Исполнение', 'Принципы', 'Уличное чутье', 'Хитрость'],
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

const initialSkillNotes = Object.values(SKILLS).flat().reduce((acc, item) => {
  acc[item] = ''
  return acc
}, {})

/** Печать: не показывать пустые слоты с дефолтным именем «Дисциплина N» без текста и без точек. */
function isDisciplineFilledForPrint(item) {
  const name = item?.name?.trim() ?? ''
  const descRaw = item?.description?.replace(/\r\n/g, '\n') ?? ''
  const descTrimmed = descRaw.trim()
  const dots = Number(item?.dots) || 0
  if (dots > 0) return true
  if (descTrimmed.length > 0) return true
  if (!name) return false
  if (/^Дисциплина\s*\d+$/i.test(name)) return false
  return true
}

function paginateNotesForPrint(rawText) {
  const text = (rawText || '').replace(/\r\n/g, '\n').trim()
  if (!text) return ['']

  const mmToPx = (mm) => (mm * 96) / 25.4
  const notesWidthPx = mmToPx(198 - (1.8 * 2) - (0.8 * 2))
  const lineHeightPx = 9 * (96 / 72) * 1.4
  const usableHeightPx = mmToPx(285 - 16)
  const maxLinesPerPage = Math.max(1, Math.floor(usableHeightPx / lineHeightPx))

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return [text]
  ctx.font = '9pt Inter, Arial, Helvetica, sans-serif'

  const paragraphs = text.split('\n')
  const lines = []

  for (const paragraph of paragraphs) {
    const p = paragraph.trim()
    if (!p) {
      lines.push('')
      continue
    }
    const words = p.split(/\s+/)
    let currentLine = ''
    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word
      if (ctx.measureText(candidate).width <= notesWidthPx) {
        currentLine = candidate
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    }
    if (currentLine) lines.push(currentLine)
  }

  const pages = []
  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    pages.push(lines.slice(i, i + maxLinesPerPage).join('\n').trim())
  }
  return pages.length ? pages : ['']
}

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
    predatorHuntComment: '',
    generation: '13',
    convictions: '',
    attachment: '',
    humanity: 7,
    hunger: 1,
    health: 4,
    willpower: 2,
    bloodPotency: 1,
    merits: '',
    flaws: '',
    notes: '',
  })
  const [attributes, setAttributes] = useState(initialAttributes)
  const [skills, setSkills] = useState(initialSkills)
  const [skillNotes, setSkillNotes] = useState(initialSkillNotes)
  const [disciplines, setDisciplines] = useState([
    { name: 'Дисциплина 1', dots: 1, description: '' },
    { name: 'Дисциплина 2', dots: 0, description: '' },
  ])
  const [merits, setMerits] = useState([{ name: 'Достоинство 1', dots: 1, description: '' }])
  const [flaws, setFlaws] = useState([{ name: 'Недостаток 1', dots: 1, description: '' }])

  const derived = useMemo(
    () => ({
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
    void printSheetRef.current?.offsetHeight
    let canvas
    try {
      const images = Array.from(printSheetRef.current.querySelectorAll('img'))
      await Promise.all(
        images.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) {
                resolve()
                return
              }
              img.addEventListener('load', resolve, { once: true })
              img.addEventListener('error', resolve, { once: true })
            }),
        ),
      )

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

    const characterName = character.name?.trim() || 'Без имени'
    pdf.save(`${characterName} — лист персонажа.pdf`)
  }

  const printA4 = () => {
    const originalTitle = document.title
    const characterName = character.name?.trim() || 'Без имени'
    document.title = `${characterName} — лист`

    const restoreTitle = () => {
      document.title = originalTitle
      window.removeEventListener('afterprint', restoreTitle)
    }

    window.addEventListener('afterprint', restoreTitle)
    window.print()
    setTimeout(restoreTitle, 1000)
  }

  const renderTrack = (filled, total = 5, mode = 'filled', shape = 'circle') => (
    <span className="track">
      {Array.from({ length: total }).map((_, i) => (
        <svg
          key={i}
          className={`dot-svg ${
            mode === 'disabled-after-limit' ? (i >= filled ? 'filled' : '') : (i < filled ? 'filled' : '')
          }`}
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          {shape === 'square'
            ? <rect className="dot-ring" x="8" y="8" width="84" height="84" />
            : <circle className="dot-ring" cx="50" cy="50" r="44" />}
          {(mode === 'disabled-after-limit' ? i >= filled : i < filled)
            ? (shape === 'square'
              ? <rect className="dot-core" x="18" y="18" width="64" height="64" />
              : <circle className="dot-core" cx="50" cy="50" r="34" />)
            : null}
        </svg>
      ))}
    </span>
  )

  const printDisciplines = useMemo(() => {
    return disciplines
      .filter(isDisciplineFilledForPrint)
      .map((item) => ({
        name: item.name?.trim() || '',
        dots: item.dots ?? 0,
        // do not trim description body: preserve intentional blank lines inside text
        description: item.description?.replace(/\r\n/g, '\n') ?? '',
      }))
  }, [disciplines])

  const printMerits = useMemo(() => {
    return merits.map((item) => ({
      name: item.name?.trim() || '',
      dots: item.dots ?? 0,
      description: item.description?.replace(/\r\n/g, '\n') ?? '',
    }))
  }, [merits])

  const printFlaws = useMemo(() => {
    return flaws.map((item) => ({
      name: item.name?.trim() || '',
      dots: item.dots ?? 0,
      description: item.description?.replace(/\r\n/g, '\n') ?? '',
    }))
  }, [flaws])

  const printNotesPages = useMemo(
    () => paginateNotesForPrint(character.notes),
    [character.notes],
  )

  const saveCharacterJson = () => {
    const data = {
      version: 'v5-character-sheet-1',
      character,
      attributes,
      skills,
      skillNotes,
      disciplines,
      merits,
      flaws,
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
      setSkillNotes((prev) => ({ ...prev, ...initialSkillNotes, ...(parsed.skillNotes || {}) }))
      setDisciplines(
        Array.isArray(parsed.disciplines)
          ? parsed.disciplines.map((item, i) => ({
              name: item?.name ?? `Дисциплина ${i + 1}`,
              dots: Number.isFinite(item?.dots) ? item.dots : 0,
              description: item?.description ?? '',
            }))
          : [],
      )
      setMerits(
        Array.isArray(parsed.merits)
          ? parsed.merits.map((item, i) => ({
              name: item?.name ?? `Достоинство ${i + 1}`,
              dots: Number.isFinite(item?.dots) ? item.dots : 0,
              description: item?.description ?? '',
            }))
          : parsed.character?.merits
            ? [{ name: 'Достоинство 1', dots: 0, description: parsed.character.merits }]
            : [],
      )
      setFlaws(
        Array.isArray(parsed.flaws)
          ? parsed.flaws.map((item, i) => ({
              name: item?.name ?? `Недостаток ${i + 1}`,
              dots: Number.isFinite(item?.dots) ? item.dots : 0,
              description: item?.description ?? '',
            }))
          : parsed.character?.flaws
            ? [{ name: 'Недостаток 1', dots: 0, description: parsed.character.flaws }]
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
          Цель
          <input value={character.ambition} onChange={(e) => updateCharacter('ambition', e.target.value)} />
        </label>
        <label>
          Прихоть
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
        <div className="predator-type-block">
          <label>
            Стиль охоты
            <select value={character.predatorType} onChange={(e) => updateCharacter('predatorType', e.target.value)}>
              {PREDATOR_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Коммент к стилю охоты
            <input
              value={character.predatorHuntComment}
              placeholder="Что бросать, чтобы успешно насытиться..."
              onChange={(e) => updateCharacter('predatorHuntComment', e.target.value)}
            />
          </label>
        </div>
        <label>
          Поколение
          <input value={character.generation} onChange={(e) => updateCharacter('generation', e.target.value)} />
        </label>
        <label>
          Убеждения
          <input value={character.convictions} onChange={(e) => updateCharacter('convictions', e.target.value)} />
        </label>
        <label>
          Привязанность
          <input value={character.attachment} onChange={(e) => updateCharacter('attachment', e.target.value)} />
        </label>
        <label>
          Человечность ({character.humanity})
          <input type="range" min="0" max="10" value={character.humanity} onChange={(e) => updateCharacter('humanity', Number(e.target.value))} />
        </label>
        <label>
          Голод ({character.hunger})
          <input type="range" min="0" max="5" value={character.hunger} onChange={(e) => updateCharacter('hunger', Number(e.target.value))} />
        </label>
        <label>
          Сила крови ({character.bloodPotency})
          <input type="range" min="0" max="10" value={character.bloodPotency} onChange={(e) => updateCharacter('bloodPotency', Number(e.target.value))} />
        </label>
      </section>

      <section className="panel stats">
        <h2>Производные значения</h2>
        <label>
          ХП ({character.health})
          <input type="range" min="0" max="10" value={character.health} onChange={(e) => updateCharacter('health', Number(e.target.value))} />
        </label>
        <label>
          Воля ({character.willpower})
          <input type="range" min="0" max="10" value={character.willpower} onChange={(e) => updateCharacter('willpower', Number(e.target.value))} />
        </label>
        <div>Всего точек атрибутов: {derived.attributeDotsTotal}</div>
        <div>Всего точек навыков: {derived.skillDotsTotal}</div>
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
              <div key={skill} className="skill-item">
                <label className="row">
                  <span>{skill}</span>
                  {renderDotInput(
                    skills[skill],
                    (value) => setSkills((prev) => ({ ...prev, [skill]: value })),
                    5,
                    0,
                  )}
                </label>
                <input
                  value={skillNotes[skill] || ''}
                  placeholder="Специализация (опционально)"
                  onChange={(e) => setSkillNotes((prev) => ({ ...prev, [skill]: e.target.value }))}
                />
              </div>
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
              className="lined-textarea"
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
        <div className="panel">
          <h2>Достоинства</h2>
          {merits.map((merit, index) => (
            <div className="discipline-item" key={`merit-${index}`}>
              <div className="discipline-head">
                <input
                  value={merit.name}
                  placeholder={`Достоинство ${index + 1}`}
                  onChange={(e) =>
                    setMerits((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)),
                    )
                  }
                />
                {renderDotInput(
                  merit.dots,
                  (dots) =>
                    setMerits((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, dots } : item)),
                    ),
                  5,
                  0,
                )}
                <button
                  type="button"
                  className="discipline-delete"
                  onClick={() =>
                    setMerits((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  Удалить
                </button>
              </div>
              <textarea
                className="lined-textarea"
                rows={2}
                value={merit.description || ''}
                placeholder="Что даёт достоинство, в чём проявляется..."
                onChange={(e) =>
                  setMerits((prev) =>
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
              setMerits((prev) => [
                ...prev,
                { name: `Достоинство ${prev.length + 1}`, dots: 0, description: '' },
              ])
            }
          >
            Добавить достоинство
          </button>
        </div>
        <div className="panel">
          <h2>Недостатки</h2>
          {flaws.map((flaw, index) => (
            <div className="discipline-item" key={`flaw-${index}`}>
              <div className="discipline-head">
                <input
                  value={flaw.name}
                  placeholder={`Недостаток ${index + 1}`}
                  onChange={(e) =>
                    setFlaws((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)),
                    )
                  }
                />
                {renderDotInput(
                  flaw.dots,
                  (dots) =>
                    setFlaws((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, dots } : item)),
                    ),
                  5,
                  0,
                )}
                <button
                  type="button"
                  className="discipline-delete"
                  onClick={() =>
                    setFlaws((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  Удалить
                </button>
              </div>
              <textarea
                className="lined-textarea"
                rows={2}
                value={flaw.description || ''}
                placeholder="В чём недостаток, как мешает персонажу..."
                onChange={(e) =>
                  setFlaws((prev) =>
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
              setFlaws((prev) => [
                ...prev,
                { name: `Недостаток ${prev.length + 1}`, dots: 0, description: '' },
              ])
            }
          >
            Добавить недостаток
          </button>
        </div>
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
        <section className="print-main-page">
          <img className="print-blood-splatter print-blood-splatter--top-left" src={bloodSplatter} alt="" aria-hidden="true" />
          <img className="print-blood-splatter print-blood-splatter--top-right" src={bloodSplatter} alt="" aria-hidden="true" />
          <img className="print-blood-splatter print-blood-splatter--middle-right" src={bloodSplatter} alt="" aria-hidden="true" />
          <img className="print-blood-splatter print-blood-splatter--discipline-center" src={bloodSplatter} alt="" aria-hidden="true" />
          <img className="print-blood-splatter print-blood-splatter--bottom-right" src={bloodSplatter} alt="" aria-hidden="true" />
          <div className="print-block">
            <h2 className="print-title">Vampire: The Masquerade</h2>
            <div className="print-top">
              <div className="print-top-col">
                <div><strong>Имя:</strong> {character.name || '____________________'}</div>
                <div><strong>Концепт:</strong> {character.concept || '____________________'}</div>
                <div><strong>Хроника:</strong> {character.chronicle || '____________________'}</div>
              </div>
              <div className="print-top-col">
                <div><strong>Цель:</strong> {character.ambition || '____________________'}</div>
                <div><strong>Прихоть:</strong> {character.desire || '____________________'}</div>
                <div><strong>Стиль охоты:</strong> {character.predatorType}</div>
                <div><strong>Коммент стиля:</strong> {character.predatorHuntComment || '____________________'}</div>
              </div>
              <div className="print-top-col">
                <div><strong>Клан:</strong> {character.clan}</div>
                <div><strong>Сир:</strong> {character.sire || '____________________'}</div>
                <div><strong>Убеждения:</strong> {character.convictions || '____________________'}</div>
                <div><strong>Привязанность:</strong> {character.attachment || '____________________'}</div>
              </div>
            </div>
          </div>

          <div className="print-block">
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
          </div>

          <div className="print-block">
            <h3>Навыки</h3>
            <div className="print-grid3">
              {Object.entries(SKILLS).map(([group, list]) => (
                <div key={group} className="print-card">
                  <h4>{group}</h4>
                  {list.map((item) => (
                    <div key={item} className="print-row">
                      <span>
                        {item}
                        {skillNotes[item]?.trim() ? ` (${skillNotes[item].trim()})` : ''}
                      </span>
                      {renderTrack(skills[item], 5)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="print-block">
            <h3>Достоинства и недостатки</h3>
            <div className="print-grid2-full">
              <div className="print-card discipline-card print-merit-flaw-card">
                <h4>Достоинства</h4>
                {printMerits.map((item, i) => (
                  <div className="print-row discipline-row" key={`print-merit-${i}`}>
                    <div className="print-row-main">
                      <span>{item.name}</span>
                      {renderTrack(item.dots, 5)}
                    </div>
                    <div className="print-row-note">
                      {item.description || ''}
                    </div>
                  </div>
                ))}
              </div>
              <div className="print-card discipline-card print-merit-flaw-card">
                <h4>Недостатки</h4>
                {printFlaws.map((item, i) => (
                  <div className="print-row discipline-row" key={`print-flaw-${i}`}>
                    <div className="print-row-main">
                      <span>{item.name}</span>
                      {renderTrack(item.dots, 5)}
                    </div>
                    <div className="print-row-note">
                      {item.description || ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="print-grid2-full">
            <div className="print-block">
              <h3>Состояние</h3>
              <div className="print-card">
                <h4>Трекеры</h4>
                <div className="print-row"><span>Здоровье</span>{renderTrack(character.health, 10, 'disabled-after-limit', 'square')}</div>
                <div className="print-row"><span>Воля</span>{renderTrack(character.willpower, 10, 'disabled-after-limit', 'square')}</div>
                <div className="print-row"><span>Голод</span>{renderTrack(character.hunger, 5, 'filled', 'square')}</div>
                <div className="print-row"><span>Человечность</span>{renderTrack(character.humanity, 10, 'filled', 'square')}</div>
              </div>
            </div>
            <div className="print-block">
              <h3>Сила крови</h3>
              <div className="print-card">
                <h4>Показатель</h4>
                <div className="print-row"><span>Поколение</span><span>{character.generation || '____________________'}</span></div>
                <div className="print-row"><span>Сила крови</span><span>{character.bloodPotency}</span></div>
                <div className="print-row"><span>Текущая</span>{renderTrack(character.bloodPotency, 10, 'disabled-after-limit')}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="print-disciplines-page">
          <div className="print-disciplines-stack">
            <h3>Дисциплины</h3>
            <div className="print-grid2-full print-disciplines-by-row">
              {printDisciplines.map((d, i) => (
                <div className="print-card discipline-card" key={`discipline-cell-${i}`}>
                  <div className="print-row discipline-row">
                    <div className="print-row-main">
                      <span>{d.name}</span>
                      {renderTrack(d.dots, 5)}
                    </div>
                    <div className="print-row-note">
                      {d.description || ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {printNotesPages.map((notesPage, pageIndex) => (
          <section className="print-notes-page" key={`notes-page-${pageIndex}`}>
            <div className="print-notes-stack">
              <h3>{pageIndex === 0 ? 'Заметки персонажа' : `Заметки персонажа — стр. ${pageIndex + 1}`}</h3>
              <div className="print-card print-notes-card">
                <div className="print-notes">
                  {notesPage}
                </div>
              </div>
            </div>
          </section>
        ))}
      </section>
    </main>
  )
}

export default App
