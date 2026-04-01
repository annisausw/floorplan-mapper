import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type NodeType = 'room' | 'junction'
type ToolMode = 'draw' | 'room' | 'junction' | 'connect' | 'select'
type TableView = 'graph' | 'db'

interface Vertex {
  id: string
  type: NodeType
  label: string | null
  objectName: string | null
  categoryId: string | null
  aliases: string[]
  cx: number
  cy: number
}

interface Edge {
  id: string
  from: string
  to: string
}

interface Transform {
  scale: number
  tx: number
  ty: number
}

interface Point { x: number; y: number }
interface PreviewLine { x1: number; y1: number; x2: number; y2: number }
interface MarqueeRect { x: number; y: number; w: number; h: number }

interface UserData {
  vertices: Vertex[]
  edges: Edge[]
  globalCounter: number
  canvasW: number
  canvasH: number
}

interface Users { [k: string]: { hash: string } }

const CATEGORIES = ['CIRCULATION', 'SERVICE', 'CLINIC', 'TOILET', 'PUBLIC'] as const

// ─────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────

function hashStr(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h.toString(36)
}

const getUsers = (): Users => JSON.parse(localStorage.getItem('fp_users') ?? '{}')
const saveUsers = (u: Users) => localStorage.setItem('fp_users', JSON.stringify(u))
const getSession = (): string | null => sessionStorage.getItem('fp_session')
const setSession = (u: string) => sessionStorage.setItem('fp_session', u)
const clearSession = () => sessionStorage.removeItem('fp_session')

function loadUserData(user: string): { data: UserData | null; svgContent: string } {
  const raw = localStorage.getItem(`fp_data_${user}`)
  return {
    data: raw ? (JSON.parse(raw) as UserData) : null,
    svgContent: localStorage.getItem(`fp_svg_${user}`) ?? '',
  }
}

function saveUserData(user: string, data: UserData, svgContent: string) {
  try {
    localStorage.setItem(`fp_data_${user}`, JSON.stringify(data))
    if (svgContent) {
      try {
        localStorage.setItem(`fp_svg_${user}`, svgContent)
      } catch {
        console.warn('SVG too large for localStorage, skipping SVG save.')
      }
    } else {
      localStorage.removeItem(`fp_svg_${user}`)
    }
  } catch (e) {
    console.warn('localStorage save failed:', e)
  }
}

// ─────────────────────────────────────────────
// AUTH SCREEN
// ─────────────────────────────────────────────

function AuthScreen({ onLogin }: { onLogin: (u: string) => void }) {
  const [isReg, setIsReg] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function submit() {
    setError('')
    if (!username.trim() || !password.trim()) { setError('Please fill in all fields.'); return }
    const users = getUsers()
    if (isReg) {
      if (users[username]) { setError('Username already taken.'); return }
      users[username] = { hash: hashStr(password) }
      saveUsers(users)
      setSession(username)
      onLogin(username)
    } else {
      if (!users[username] || users[username].hash !== hashStr(password)) {
        setError('Invalid username or password.'); return
      }
      setSession(username)
      onLogin(username)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
      background: 'linear-gradient(145deg, #0f1c26 0%, #1a2f40 40%, #243b55 100%)',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Decorative grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{
        position: 'relative', background: 'rgba(255,255,255,0.97)', borderRadius: 20,
        padding: '44px 48px', width: 420,
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
      }}>
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #1a6fad, #2ecc71)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(26,111,173,0.4)',
          }}>🗺️</div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f1c26', letterSpacing: '-0.5px' }}>
            Floorplan Mapper
          </h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
            {isReg ? 'Create your workspace account' : 'Sign in to your workspace'}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 24,
        }}>
          {(['Sign In', 'Register'] as const).map((label, i) => {
            const active = isReg === (i === 1)
            return (
              <button key={label} onClick={() => { setIsReg(i === 1); setError('') }}
                style={{
                  flex: 1, padding: '8px 0', border: 'none', borderRadius: 7, cursor: 'pointer',
                  fontWeight: 700, fontSize: 13, fontFamily: 'inherit', transition: 'all 0.2s',
                  background: active ? 'white' : 'transparent',
                  color: active ? '#1a6fad' : '#64748b',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                }}>
                {label}
              </button>
            )
          })}
        </div>

        {error && (
          <div style={{
            background: '#fff5f5', color: '#b91c1c', padding: '10px 14px', borderRadius: 8,
            marginBottom: 18, fontSize: 13, borderLeft: '3px solid #ef4444',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            ⚠️ {error}
          </div>
        )}

        {[
          { label: 'Username', value: username, set: setUsername, type: 'text', ph: 'your_username' },
          { label: 'Password', value: password, set: setPassword, type: 'password', ph: '••••••••' },
        ].map(({ label, value, set, type, ph }) => (
          <div key={label} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              {label}
            </label>
            <input
              type={type} value={value} placeholder={ph}
              autoFocus={type === 'text'}
              onChange={e => set(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              style={{
                width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none',
                transition: 'border-color 0.2s', color: '#0f1c26',
              }}
              onFocus={e => (e.target.style.borderColor = '#1a6fad')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>
        ))}

        <button onClick={submit} style={{
          width: '100%', padding: '13px', marginTop: 8,
          background: 'linear-gradient(135deg, #1a6fad, #1558a0)',
          color: 'white', border: 'none', borderRadius: 10,
          fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 4px 16px rgba(26,111,173,0.4)',
          letterSpacing: '0.02em',
        }}>
          {isReg ? '✨ Create Account' : '→ Sign In'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#94a3b8' }}>
          Your data is saved locally to this browser.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────

function PropField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
        {label}
      </label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#1e293b' }}
        onFocus={e => (e.target.style.borderColor = '#3b82f6')}
        onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
      />
    </div>
  )
}

const TD: React.CSSProperties = {
  padding: '5px 8px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap',
  overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90, fontSize: 10, color: '#475569',
}

// ─────────────────────────────────────────────
// FLOORPLAN MAPPER
// ─────────────────────────────────────────────

function FloorplanMapper({ user, onLogout }: { user: string; onLogout: () => void }) {
  // ── Data State ──
  const [vertices, setVertices] = useState<Vertex[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [globalCounter, setGlobalCounter] = useState(1)
  const [svgContent, setSvgContent] = useState('')
  const [canvasW, setCanvasW] = useState(1500)
  const [canvasH, setCanvasH] = useState(1000)

  // ── UI State ──
  const [mode, setModeState] = useState<ToolMode>('draw')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [tableView, setTableView] = useState<TableView>('graph')
  const [idPrefix, setIdPrefix] = useState('LT5-')
  const [pixelSpacing, setPixelSpacing] = useState(40)
  const [history, setHistory] = useState<string[]>([])
  const [connectFirst, setConnectFirst] = useState<Vertex | null>(null)
  const [transform, setTransform] = useState<Transform>({ scale: 1, tx: 0, ty: 0 })
  const [preview, setPreview] = useState<PreviewLine | null>(null)
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null)

  // ── Interaction Refs ──
  const isDrawingRef = useRef(false)
  const isDraggingRef = useRef(false)
  const isPanningRef = useRef(false)
  const isSelectingRef = useRef(false)
  const interactStartRef = useRef<{ x: number; y: number; tx?: number; ty?: number } | null>(null)
  const snapStartRef = useRef<Vertex | null>(null)

  // ── Mutable Refs (avoid stale closures in window event handlers) ──
  const vRef = useRef(vertices)
  const eRef = useRef(edges)
  const selRef = useRef(selectedIds)
  const gcRef = useRef(globalCounter)
  const modeRef = useRef(mode)
  const prefixRef = useRef(idPrefix)
  const spacingRef = useRef(pixelSpacing)
  const txRef = useRef(transform)
  const cfRef = useRef(connectFirst)
  const histRef = useRef(history)
  const svgRef = useRef<SVGSVGElement>(null)
  const vpRef = useRef<HTMLDivElement>(null)

  useEffect(() => { vRef.current = vertices }, [vertices])
  useEffect(() => { eRef.current = edges }, [edges])
  useEffect(() => { selRef.current = selectedIds }, [selectedIds])
  useEffect(() => { gcRef.current = globalCounter }, [globalCounter])
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { prefixRef.current = idPrefix }, [idPrefix])
  useEffect(() => { spacingRef.current = pixelSpacing }, [pixelSpacing])
  useEffect(() => { txRef.current = transform }, [transform])
  useEffect(() => { cfRef.current = connectFirst }, [connectFirst])
  useEffect(() => { histRef.current = history }, [history])

  // ── Load from localStorage ──
  useEffect(() => {
    const { data, svgContent: svg } = loadUserData(user)
    if (data) {
      setVertices(data.vertices ?? [])
      setEdges(data.edges ?? [])
      setGlobalCounter(data.globalCounter ?? 1)
      setCanvasW(data.canvasW ?? 1500)
      setCanvasH(data.canvasH ?? 1000)
    }
    if (svg) setSvgContent(svg)
  }, [user])

  // ── Auto-save to localStorage ──
  useEffect(() => {
    saveUserData(user, { vertices, edges, globalCounter, canvasW, canvasH }, svgContent)
  }, [user, vertices, edges, globalCounter, canvasW, canvasH, svgContent])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // ─── Utility ───

  function getCoords(e: MouseEvent): Point {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    const s = txRef.current.scale
    return { x: (e.clientX - rect.left) / s, y: (e.clientY - rect.top) / s }
  }

  function findNear(pt: Point, vs?: Vertex[]): Vertex | undefined {
    const threshold = 20 / txRef.current.scale
    return (vs ?? vRef.current).find(v => Math.hypot(v.cx - pt.x, v.cy - pt.y) < threshold)
  }

  function captureHistory() {
    const snap = JSON.stringify({ vertices: vRef.current, edges: eRef.current, globalCounter: gcRef.current })
    setHistory(prev => { const n = [...prev, snap]; return n.length > 50 ? n.slice(-50) : n })
  }

  function undo() {
    if (histRef.current.length === 0) return
    const last = histRef.current[histRef.current.length - 1]
    const s = JSON.parse(last)
    setVertices(s.vertices)
    setEdges(s.edges)
    setGlobalCounter(s.globalCounter)
    setSelectedIds([])
    setHistory(p => p.slice(0, -1))
  }

  // ─── Pan & Zoom ───

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const d = e.deltaY > 0 ? 0.9 : 1.1
    setTransform(prev => {
      if (e.ctrlKey) {
        const ns = Math.min(Math.max(prev.scale * d, 0.05), 20)
        const r = vpRef.current!.getBoundingClientRect()
        const mx = e.clientX - r.left, my = e.clientY - r.top
        return { scale: ns, tx: mx - (mx - prev.tx) * (ns / prev.scale), ty: my - (my - prev.ty) * (ns / prev.scale) }
      }
      return { ...prev, tx: prev.tx - e.deltaX, ty: prev.ty - e.deltaY }
    })
  }

  // ─── Mouse Down on SVG ───

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    // Middle mouse → pan
    if (e.button === 1) {
      isPanningRef.current = true
      interactStartRef.current = { x: e.clientX, y: e.clientY, tx: txRef.current.tx, ty: txRef.current.ty }
      e.preventDefault()
      return
    }
    if (e.button !== 0) return

    const pt = getCoords(e.nativeEvent)
    const hit = findNear(pt)
    const m = modeRef.current

    if (m === 'select') {
      if (hit) {
        if (!e.shiftKey) {
          if (!selRef.current.includes(hit.id)) setSelectedIds([hit.id])
        } else {
          setSelectedIds(p => p.includes(hit.id) ? p.filter(x => x !== hit.id) : [...p, hit.id])
        }
        isDraggingRef.current = true
        interactStartRef.current = pt
      } else {
        isSelectingRef.current = true
        interactStartRef.current = pt
        setSelectedIds([])
        setMarquee({ x: pt.x, y: pt.y, w: 0, h: 0 })
      }
    } else if (m === 'connect') {
      if (!hit) return
      if (!cfRef.current) {
        setConnectFirst(hit)
      } else if (cfRef.current.id !== hit.id) {
        captureHistory()
        const eid = `${cfRef.current.id}_to_${hit.id}`
        if (!eRef.current.some(e2 => e2.id === eid)) {
          setEdges(p => [...p, { id: eid, from: cfRef.current!.id, to: hit.id }])
        }
        setConnectFirst(null)
      }
    } else if (m === 'room' || m === 'junction') {
      captureHistory()
      const nid = `${prefixRef.current}${m === 'room' ? 'v' : 'j'}${gcRef.current}`
      setGlobalCounter(c => c + 1)
      setVertices(p => [...p, {
        id: nid, type: m as NodeType, label: null, objectName: null,
        categoryId: 'PUBLIC', aliases: [], cx: Math.round(pt.x), cy: Math.round(pt.y),
      }])
    } else if (m === 'draw') {
      isDrawingRef.current = true
      snapStartRef.current = hit ?? null
      const sp = hit ? { x: hit.cx, y: hit.cy } : pt
      interactStartRef.current = sp
      setPreview({ x1: sp.x, y1: sp.y, x2: sp.x, y2: sp.y })
    }
  }

  // ─── Global Mouse Move / Up ───

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (isPanningRef.current && interactStartRef.current) {
        const { x: sx, y: sy, tx: stx = 0, ty: sty = 0 } = interactStartRef.current
        setTransform(p => ({ ...p, tx: stx + (e.clientX - sx), ty: sty + (e.clientY - sy) }))
        return
      }
      if (!svgRef.current) return
      const pt = getCoords(e)

      if (isDraggingRef.current && selRef.current.length > 0 && interactStartRef.current) {
        const dx = Math.round(pt.x - interactStartRef.current.x)
        const dy = Math.round(pt.y - interactStartRef.current.y)
        if (dx !== 0 || dy !== 0) {
          setVertices(p => p.map(v => selRef.current.includes(v.id) ? { ...v, cx: v.cx + dx, cy: v.cy + dy } : v))
          interactStartRef.current = pt
        }
      } else if (isSelectingRef.current && interactStartRef.current) {
        const sx = interactStartRef.current.x, sy = interactStartRef.current.y
        const x = Math.min(sx, pt.x), y = Math.min(sy, pt.y)
        const w = Math.abs(sx - pt.x), h = Math.abs(sy - pt.y)
        setMarquee({ x, y, w, h })
        setSelectedIds(vRef.current.filter(v => v.cx >= x && v.cx <= x + w && v.cy >= y && v.cy <= y + h).map(v => v.id))
      } else if (isDrawingRef.current) {
        const snap = findNear(pt)
        setPreview(p => p ? { ...p, x2: snap ? snap.cx : pt.x, y2: snap ? snap.cy : pt.y } : null)
      }
    }

    function onUp(e: MouseEvent) {
      isPanningRef.current = false
      if (isDrawingRef.current) {
        isDrawingRef.current = false
        if (svgRef.current && interactStartRef.current) {
          const pt = getCoords(e)
          const snap = findNear(pt)
          const sp = interactStartRef.current
          const ep = snap ? { x: snap.cx, y: snap.cy } : pt
          if (Math.hypot(ep.x - sp.x, ep.y - sp.y) > 5) {
            captureHistory()
            createPath(sp, ep, snapStartRef.current, snap ?? null)
          }
        }
        setPreview(null)
      }
      isDraggingRef.current = false
      isSelectingRef.current = false
      setMarquee(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // ─── Create Path (draw mode) ───

  function createPath(p1: Point, p2: Point, sNode: Vertex | null, eNode: Vertex | null) {
    const interval = spacingRef.current || 40
    const prefix = prefixRef.current
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const count = Math.max(2, Math.floor(dist / interval))

    let ctr = gcRef.current
    const newVerts: Vertex[] = []
    const newEdges: Edge[] = []
    const seg: Vertex[] = []

    for (let i = 0; i < count; i++) {
      if (i === 0 && sNode) { seg.push(sNode); continue }
      if (i === count - 1 && eNode) { seg.push(eNode); continue }
      const t = i / (count - 1)
      const nv: Vertex = {
        id: `${prefix}j${ctr++}`, type: 'junction', label: null, objectName: null,
        categoryId: null, aliases: [],
        cx: Math.round(p1.x + (p2.x - p1.x) * t),
        cy: Math.round(p1.y + (p2.y - p1.y) * t),
      }
      newVerts.push(nv); seg.push(nv)
    }

    for (let i = 0; i < seg.length - 1; i++) {
      newEdges.push({ id: `${seg[i].id}_to_${seg[i + 1].id}`, from: seg[i].id, to: seg[i + 1].id })
    }

    setGlobalCounter(ctr)
    setVertices(p => [...p, ...newVerts])
    setEdges(p => [...p, ...newEdges])
  }

  // ─── Node Property Updates ───

  function liveUpdate(field: string, value: string) {
    if (selectedIds.length === 0) return
    if (selectedIds.length === 1) {
      const id = selectedIds[0]
      if (field === 'id') {
        const nid = value.trim()
        if (!nid || nid === id) return
        setVertices(p => p.map(v => v.id === id ? { ...v, id: nid } : v))
        setEdges(p => p.map(e => ({ ...e, from: e.from === id ? nid : e.from, to: e.to === id ? nid : e.to })))
        setSelectedIds([nid])
      } else if (field === 'aliases') {
        const arr = value.split(',').map(s => s.trim()).filter(Boolean)
        setVertices(p => p.map(v => v.id === id ? { ...v, aliases: arr } : v))
      } else {
        setVertices(p => p.map(v => v.id === id ? { ...v, [field]: value || null } : v))
      }
    } else {
      if (field === 'type' || field === 'categoryId') {
        setVertices(p => p.map(v => selectedIds.includes(v.id) ? { ...v, [field]: value } : v))
      }
    }
  }

  function deleteSelected() {
    if (selectedIds.length === 0) return
    captureHistory()
    setVertices(p => p.filter(v => !selectedIds.includes(v.id)))
    setEdges(p => p.filter(e => !selectedIds.includes(e.from) && !selectedIds.includes(e.to)))
    setSelectedIds([])
  }

  // ─── Import / Export ───

  function importSVG(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader()
    r.onload = ev => {
      const text = ev.target?.result as string
      setSvgContent(text)
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
      const el = doc.querySelector('svg')
      setCanvasW(parseInt(el?.getAttribute('width') ?? '0') || 1500)
      setCanvasH(parseInt(el?.getAttribute('height') ?? '0') || 1000)
    }
    r.readAsText(file); e.target.value = ''
  }

  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader()
    r.onload = ev => {
      const data = JSON.parse(ev.target?.result as string)
      setVertices(data.vertices ?? [])
      setEdges(data.edges ?? [])
      const nums = (data.vertices ?? []).map((v: Vertex) => { const m = v.id.match(/\d+/); return m ? parseInt(m[0]) : 0 })
      setGlobalCounter(nums.length > 0 ? Math.max(...nums) + 1 : 1)
      setSelectedIds([])
    }
    r.readAsText(file); e.target.value = ''
  }

  function dl(content: string, name: string) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
    a.download = name; a.click()
  }

  function exportGraph() {
    dl(JSON.stringify({ vertices: vertices.map(v => ({ id: v.id, type: v.type, objectName: v.objectName, label: v.label, cx: v.cx, cy: v.cy })), edges }, null, 2), 'graph_navigation.json')
  }

  function exportDB() {
    dl(JSON.stringify(vertices.filter(v => v.type === 'room').map(v => ({ id: v.id, label: v.objectName ?? v.id, category: (v.categoryId ?? 'PUBLIC').toUpperCase(), aliases: v.aliases ?? [], description: v.label ?? '' })), null, 2), 'rooms_database.json')
  }

  function setMode(m: ToolMode) { setModeState(m); setConnectFirst(null) }

  function handleRowClick(e: React.MouseEvent, v: Vertex) {
    if (e.shiftKey) {
      setSelectedIds(p => p.includes(v.id) ? p.filter(x => x !== v.id) : [...p, v.id])
    } else {
      setSelectedIds([v.id])
    }
  }

  const selectedNode = selectedIds.length === 1 ? vertices.find(v => v.id === selectedIds[0]) : null

  // ─── Button style helper ───
  function toolBtn(active: boolean): React.CSSProperties {
    return {
      padding: '6px 11px', borderRadius: 7, cursor: 'pointer', fontWeight: 700,
      fontSize: 12, fontFamily: 'inherit', border: 'none', transition: 'all 0.15s',
      background: active ? '#3b82f6' : 'rgba(255,255,255,0.12)',
      color: active ? 'white' : 'rgba(255,255,255,0.85)',
      boxShadow: active ? '0 2px 8px rgba(59,130,246,0.5)' : 'none',
    }
  }

  const roomCount = vertices.filter(v => v.type === 'room').length
  const junctCount = vertices.filter(v => v.type === 'junction').length

  // ─────────────────────────── RENDER ───────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Toolbar ── */}
      <div style={{
        background: 'linear-gradient(90deg, #0f1c26 0%, #1a2f40 100%)',
        padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center',
        flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.08)', zIndex: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
      }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRight: '1px solid rgba(255,255,255,0.12)', paddingRight: 14, marginRight: 2 }}>
          <span style={{ fontSize: 20 }}>🗺️</span>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 800, fontSize: 14, letterSpacing: '-0.3px' }}>Floorplan</span>
        </div>

        {/* File group */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', borderRight: '1px solid rgba(255,255,255,0.12)', paddingRight: 12 }}>
          <button style={toolBtn(false)} onClick={() => document.getElementById('svg-inp')?.click()}>🖼️ Import SVG</button>
          <button style={toolBtn(false)} onClick={() => document.getElementById('json-inp')?.click()}>📂 Import JSON</button>
          <input id="svg-inp" type="file" accept=".svg" hidden onChange={importSVG} />
          <input id="json-inp" type="file" accept=".json" hidden onChange={importJSON} />
          {svgContent && (
            <button onClick={() => setSvgContent('')}
              style={{ ...toolBtn(false), background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}>
              🗑️ Clear BG
            </button>
          )}
        </div>

        {/* Prefix + Spacing */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderRight: '1px solid rgba(255,255,255,0.12)', paddingRight: 12 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>PREFIX</span>
          <input value={idPrefix} onChange={e => setIdPrefix(e.target.value)}
            style={{ width: 68, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>SPACING</span>
          <input type="number" min={10} value={pixelSpacing} onChange={e => setPixelSpacing(parseInt(e.target.value) || 40)}
            style={{ width: 52, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
        </div>

        {/* Mode buttons */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', borderRight: '1px solid rgba(255,255,255,0.12)', paddingRight: 12 }}>
          {([
            ['draw', '✏️ Draw'],
            ['room', '🏠 Room'],
            ['junction', '🔵 Junction'],
            ['connect', '🔗 Connect'],
            ['select', '🖐️ Select'],
          ] as [ToolMode, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setMode(id)} style={toolBtn(mode === id)}>{label}</button>
          ))}
        </div>

        <button onClick={undo} title="Ctrl+Z" style={{ ...toolBtn(false), background: 'rgba(245,158,11,0.25)', color: '#fcd34d' }}>↩ Undo</button>

        {/* Spacer + user info */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'right', lineHeight: 1.4 }}>
            <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>👤 {user}</div>
            <div>{vertices.length} nodes · {edges.length} edges</div>
          </div>
          <button onClick={onLogout}
            style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Viewport / Canvas ── */}
        <div ref={vpRef} onWheel={handleWheel}
          style={{ flex: 1, background: '#1a2535', position: 'relative', overflow: 'hidden', touchAction: 'none' }}>

          {/* Grid pattern on dark bg */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.03,
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '50px 50px', pointerEvents: 'none',
          }} />

          {/* Mode hint */}
          <div style={{
            position: 'absolute', bottom: 16, left: 16, zIndex: 5,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            padding: '6px 12px', borderRadius: 8, fontSize: 11, color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {mode === 'draw' && '✏️ Click+drag to draw paths — snap to existing nodes'}
            {mode === 'room' && '🏠 Click anywhere to place a room node'}
            {mode === 'junction' && '🔵 Click anywhere to place a junction'}
            {mode === 'connect' && `🔗 ${connectFirst ? `Node "${connectFirst.id}" selected — click 2nd node` : 'Click first node to connect'}`}
            {mode === 'select' && '🖐️ Click or drag marquee to select · Drag to move · Shift+click to multi-select'}
          </div>

          {/* Zoom info */}
          <div style={{
            position: 'absolute', bottom: 16, right: 16, zIndex: 5,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            padding: '6px 10px', borderRadius: 8, fontSize: 11, color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span>Ctrl+Scroll zoom · Scroll pan · Middle drag pan</span>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4, color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>
              {Math.round(transform.scale * 100)}%
            </span>
            <button onClick={() => setTransform({ scale: 1, tx: 0, ty: 0 })}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '2px 6px', fontSize: 11, fontFamily: 'inherit' }}>
              Reset
            </button>
          </div>

          {/* Pan-zoom wrapper */}
          <div style={{
            position: 'absolute', transformOrigin: '0 0', willChange: 'transform',
            transform: `translate(${transform.tx}px,${transform.ty}px) scale(${transform.scale})`,
          }}>
            <div style={{
              position: 'relative', background: 'white',
              width: canvasW, height: canvasH,
              boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)',
            }}>
              {/* Background SVG layer */}
              {svgContent && (
                <div
                  style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, overflow: 'hidden', pointerEvents: 'none' }}
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              )}

              {/* Draw SVG layer */}
              <svg ref={svgRef} style={{ position: 'absolute', top: 0, left: 0 }}
                width={canvasW} height={canvasH} viewBox={`0 0 ${canvasW} ${canvasH}`}
                onMouseDown={handleMouseDown}>

                {/* Edges */}
                {edges.map(edge => {
                  const v1 = vertices.find(v => v.id === edge.from)
                  const v2 = vertices.find(v => v.id === edge.to)
                  if (!v1 || !v2) return null
                  return (
                    <line key={edge.id} x1={v1.cx} y1={v1.cy} x2={v2.cx} y2={v2.cy}
                      stroke="#1e293b" strokeWidth={3} opacity={0.35} strokeLinecap="round"
                      style={{ cursor: mode === 'select' ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (modeRef.current !== 'select') return
                        if (window.confirm(`Delete edge: ${edge.from} → ${edge.to}?`)) {
                          captureHistory()
                          setEdges(p => p.filter(x => x.id !== edge.id))
                        }
                      }}
                    />
                  )
                })}

                {/* Nodes */}
                {vertices.map(v => {
                  const sel = selectedIds.includes(v.id) || connectFirst?.id === v.id
                  const isRoom = v.type === 'room'
                  return (
                    <g key={v.id}>
                      <circle cx={v.cx} cy={v.cy} r={sel ? 11 : (isRoom ? 9 : 7)}
                        fill={isRoom ? '#ef4444' : '#3b82f6'}
                        stroke={sel ? '#fbbf24' : 'white'}
                        strokeWidth={sel ? 3.5 : 2}
                        style={{ cursor: 'pointer', transition: 'r 0.1s' }}
                      />
                      {/* Show label for rooms */}
                      {isRoom && v.objectName && (
                        <text x={v.cx} y={v.cy - 14} textAnchor="middle"
                          fontSize={9} fill="#1e293b" fontWeight={600}
                          style={{ pointerEvents: 'none', userSelect: 'none' }}>
                          {v.objectName.length > 18 ? v.objectName.slice(0, 17) + '…' : v.objectName}
                        </text>
                      )}
                    </g>
                  )
                })}

                {/* Preview line */}
                {preview && (
                  <line x1={preview.x1} y1={preview.y1} x2={preview.x2} y2={preview.y2}
                    stroke="#22c55e" strokeWidth={2} strokeDasharray="7,4" pointerEvents="none" />
                )}

                {/* Marquee */}
                {marquee && (
                  <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h}
                    fill="rgba(59,130,246,0.08)" stroke="#3b82f6" strokeWidth={1} strokeDasharray="5,3" pointerEvents="none" />
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div style={{
          width: 460, background: '#f8fafc', borderLeft: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', zIndex: 10, overflow: 'hidden',
        }}>
          {/* Sidebar header */}
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Node Properties</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {roomCount} rooms · {junctCount} junctions · {edges.length} edges
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>

            {/* Properties form */}
            {selectedIds.length > 0 && (
              <div style={{ background: 'white', border: '2px solid #3b82f6', borderRadius: 10, padding: 14, marginBottom: 14, boxShadow: '0 4px 16px rgba(59,130,246,0.1)' }}>

                <div style={{ background: '#eff6ff', borderLeft: '3px solid #3b82f6', padding: '7px 11px', borderRadius: 6, fontSize: 11, color: '#1e40af', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>✓</span>
                  <span><strong>{selectedIds.length}</strong> node{selectedIds.length > 1 ? 's' : ''} selected</span>
                  {connectFirst && <span style={{ marginLeft: 'auto', color: '#dc2626', fontWeight: 700 }}>🔗 Click 2nd node</span>}
                </div>

                {selectedNode && (
                  <>
                    <PropField label="ID" value={selectedNode.id} onChange={v => liveUpdate('id', v)} placeholder="e.g. LT2-ROOM1" />
                    <PropField label="Object Name (DB Label)" value={selectedNode.objectName ?? ''} onChange={v => liveUpdate('objectName', v)} placeholder="ENT / THT & General" />
                    <PropField label="Display Label (DB Desc)" value={selectedNode.label ?? ''} onChange={v => liveUpdate('label', v)} placeholder="Klinik konsultasi spesialis..." />

                    {selectedNode.type === 'room' && (
                      <>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Category</label>
                          <select value={selectedNode.categoryId ?? 'PUBLIC'} onChange={e => liveUpdate('categoryId', e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#1e293b', background: 'white' }}>
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <PropField label="Aliases (comma separated)" value={(selectedNode.aliases ?? []).join(', ')} onChange={v => liveUpdate('aliases', v)} placeholder="alias1, alias2..." />
                      </>
                    )}

                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Node Type</label>
                      <select value={selectedNode.type} onChange={e => liveUpdate('type', e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#1e293b', background: 'white' }}>
                        <option value="junction">Junction</option>
                        <option value="room">Room</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedIds.length > 1 && (
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Bulk change type</label>
                    <select defaultValue="" onChange={e => e.target.value && liveUpdate('type', e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#1e293b', background: 'white' }}>
                      <option value="" disabled>Change all selected to...</option>
                      <option value="junction">Junction</option>
                      <option value="room">Room</option>
                    </select>
                  </div>
                )}

                <button onClick={deleteSelected}
                  style={{ width: '100%', padding: '9px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', marginTop: 4 }}>
                  🗑️ Delete Selection ({selectedIds.length})
                </button>
              </div>
            )}

            {/* Table toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {tableView === 'graph' ? '📊 Graph View' : '🗄️ DB View'}
              </span>
              <button onClick={() => setTableView(v => v === 'graph' ? 'db' : 'graph')}
                style={{ padding: '4px 10px', fontSize: 10, borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', color: '#475569' }}>
                {tableView === 'graph' ? 'Show DB View' : 'Show Graph View'}
              </button>
            </div>

            {/* Data table */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {(tableView === 'graph'
                        ? ['ID', 'Name', 'Label', 'Type', 'Coords']
                        : ['ID', 'Category', 'Name', 'Aliases']
                      ).map(h => (
                        <th key={h} style={{ background: '#f1f5f9', padding: '7px 8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableView === 'graph'
                      ? vertices.map(v => (
                        <tr key={v.id} onClick={e => handleRowClick(e as React.MouseEvent, v)}
                          style={{ background: selectedIds.includes(v.id) ? '#fef9c3' : '', cursor: 'pointer' }}
                          onMouseEnter={e => { if (!selectedIds.includes(v.id)) (e.currentTarget as HTMLTableRowElement).style.background = '#f8fafc' }}
                          onMouseLeave={e => { if (!selectedIds.includes(v.id)) (e.currentTarget as HTMLTableRowElement).style.background = '' }}>
                          <td style={{ ...TD, color: '#1e293b', fontWeight: 600 }}>{v.id}</td>
                          <td style={TD}>{v.objectName ?? '—'}</td>
                          <td style={TD}>{v.label ?? '—'}</td>
                          <td style={TD}>
                            <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: v.type === 'room' ? '#fee2e2' : '#dbeafe', color: v.type === 'room' ? '#dc2626' : '#1d4ed8' }}>
                              {v.type}
                            </span>
                          </td>
                          <td style={TD}>{v.cx},{v.cy}</td>
                        </tr>
                      ))
                      : vertices.filter(v => v.type === 'room').map(v => (
                        <tr key={v.id} onClick={e => handleRowClick(e as React.MouseEvent, v)}
                          style={{ background: selectedIds.includes(v.id) ? '#fef9c3' : '', cursor: 'pointer' }}
                          onMouseEnter={e => { if (!selectedIds.includes(v.id)) (e.currentTarget as HTMLTableRowElement).style.background = '#f8fafc' }}
                          onMouseLeave={e => { if (!selectedIds.includes(v.id)) (e.currentTarget as HTMLTableRowElement).style.background = '' }}>
                          <td style={{ ...TD, color: '#1e293b', fontWeight: 600 }}>{v.id}</td>
                          <td style={TD}>{v.categoryId ?? '—'}</td>
                          <td style={TD}>{v.objectName ?? '—'}</td>
                          <td style={TD}>{(v.aliases ?? []).join(', ') || '—'}</td>
                        </tr>
                      ))
                    }
                    {vertices.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: 12 }}>
                        No nodes yet. Start drawing!
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={exportGraph} style={{ flex: 1, padding: '10px 8px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 11, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}>
                📊 Export Graph JSON
              </button>
              <button onClick={exportDB} style={{ flex: 1, padding: '10px 8px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 11, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(139,92,246,0.3)' }}>
                🗄️ Export DB JSON
              </button>
            </div>

            {/* Legend */}
            <div style={{ marginTop: 14, padding: '10px 12px', background: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Legend</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width={14} height={14}><circle cx={7} cy={7} r={6} fill="#ef4444" stroke="white" strokeWidth={1.5} /></svg>
                  Room ({roomCount})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width={14} height={14}><circle cx={7} cy={7} r={5} fill="#3b82f6" stroke="white" strokeWidth={1.5} /></svg>
                  Junction ({junctCount})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width={14} height={14}><circle cx={7} cy={7} r={6} fill="#ef4444" stroke="#fbbf24" strokeWidth={2.5} /></svg>
                  Selected
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(() => getSession())

  function handleLogin(u: string) { setSession(u); setCurrentUser(u) }
  function handleLogout() { clearSession(); setCurrentUser(null) }

  if (!currentUser) return <AuthScreen onLogin={handleLogin} />
  return <FloorplanMapper user={currentUser} onLogout={handleLogout} />
}
