import { useMemo, useState } from 'react'
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
  const [character, setCharacter] = useState({
    name: '',
    concept: '',
    sire: '',
    chronicle: '',
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

  return (
    <main className="sheet">
      <header>
        <h1>Vampire: The Masquerade V5 - Конструктор персонажа</h1>
        <p className="subtitle">Собери чарлист, отметь ключевые параметры и держи важное на одном экране.</p>
      </header>

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
    </main>
  )
}

export default App
