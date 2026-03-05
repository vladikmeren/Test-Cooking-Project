import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange, t }) {
  return (
    <div style={{ position: 'relative', maxWidth: 520 }}>
      <Search
        size={17}
        style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-3)', pointerEvents: 'none',
        }}
      />
      <input
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={t.searchPlaceholder}
        style={{ paddingLeft: 42, paddingRight: value ? 40 : 14 }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-3)', display: 'flex', padding: 4,
          }}
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}
