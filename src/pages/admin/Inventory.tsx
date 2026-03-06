import {
  Package,
  AlertTriangle,
  TrendingDown,
  Plus,
  Pencil,
  Trash2,
  BarChart3,
  Sparkles
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://192.168.1.18:8000/api/inventory'

interface Ingredient {
  id: string
  name: string
  unit: string
  current_stock: string
  min_stock: string
}

const INVENTORY_UNITS = [
  'kg',
  'g',
  'L',
  'ml',
  'pcs',
  'pack',
  'box',
  'bottle',
  'dozen',
] as const

const Inventory = () => {
  const navigate = useNavigate()
  const [items, setItems] = useState<Ingredient[]>([])
  const [search, setSearch] = useState('')
  const [openingSearch, setOpeningSearch] = useState('')
  const [openingQuantities, setOpeningQuantities] = useState<Record<string, string>>({})
  const [openingLoading, setOpeningLoading] = useState(false)
  const [openingStatusLoading, setOpeningStatusLoading] = useState(false)
  const [openingInitialized, setOpeningInitialized] = useState(false)
  const [openingInitializedOn, setOpeningInitializedOn] = useState<string | null>(null)
  const [openingMessage, setOpeningMessage] = useState<string | null>(null)
  const [openingError, setOpeningError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Ingredient | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const token = localStorage.getItem('access')

  const loadOpeningStatus = async () => {
    setOpeningStatusLoading(true)
    try {
      const res = await fetch(`${API_BASE}/opening-stock/status/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load opening stock status')
      const data = await res.json()
      setOpeningInitialized(Boolean(data?.initialized))
      setOpeningInitializedOn(data?.initialized_on ? String(data.initialized_on) : null)
      if (data?.initialized) {
        setOpeningMessage('Opening stock is already initialized and locked.')
      }
    } catch {
      setOpeningError('Unable to check opening stock status.')
    } finally {
      setOpeningStatusLoading(false)
    }
  }

  const loadItems = async () => {
    const res = await fetch(`${API_BASE}/ingredients/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    setItems(data)
  }

  useEffect(() => {
    loadItems()
    loadOpeningStatus()
  }, [])

  const getStatus = (current: number, min: number) => {
    if (current <= 0) return 'out'
    if (current <= min) return 'low'
    return 'good'
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )
  const openingFiltered = items.filter(i =>
    i.name.toLowerCase().includes(openingSearch.toLowerCase())
  )

  const lowCount = items.filter(
    i => getStatus(Number(i.current_stock), Number(i.min_stock)) === 'low'
  ).length

  const outCount = items.filter(
    i => getStatus(Number(i.current_stock), Number(i.min_stock)) === 'out'
  ).length
const calculateHealthScore = (current: number, min: number) => {
  if (current <= 0) return 0
  if (current <= min) return 40
  return 100
}

const calculateReorder = (current: number, min: number) => {
  if (current <= min) {
    return min * 2 - current
  }
  return 0
}

const calculateValuation = (stock: number) => {
  return stock * 50 // fake cost per unit (can replace later)
}

  const handleInitOpeningStock = async () => {
    if (openingInitialized) {
      setOpeningError('Opening stock is already initialized and cannot be changed.')
      setOpeningMessage(null)
      return
    }
    const payloadItems = items
      .filter((i) => (openingQuantities[i.id] ?? '').trim() !== '')
      .map((i) => ({
        ingredient: i.id,
        quantity: openingQuantities[i.id].trim(),
      }))

    if (!payloadItems.length) {
      setOpeningError('Enter at least one opening stock quantity.')
      setOpeningMessage(null)
      return
    }

    setOpeningLoading(true)
    setOpeningError(null)
    setOpeningMessage(null)
    try {
      const res = await fetch(`${API_BASE}/opening-stock/init/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items: payloadItems })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(String(data?.error ?? 'Failed to initialize opening stock'))
      }

      setOpeningMessage(`Opening stock initialized for ${data?.count ?? payloadItems.length} ingredients.`)
      setOpeningQuantities({})
      setOpeningInitialized(true)
      setOpeningInitializedOn(new Date().toISOString())
      loadItems()
      loadOpeningStatus()
    } catch (err) {
      setOpeningError(err instanceof Error ? err.message : 'Unable to initialize opening stock.')
    } finally {
      setOpeningLoading(false)
    }
  }
  /* ================= ADD ================= */

  const handleAdd = async () => {
    const name = (document.getElementById('addName') as HTMLInputElement).value
    const unit = (document.getElementById('addUnit') as HTMLSelectElement).value
    const current = (document.getElementById('addCurrent') as HTMLInputElement).value
    const min = (document.getElementById('addMin') as HTMLInputElement).value

    await fetch(`${API_BASE}/ingredients/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name,
        unit,
        current_stock: current,
        min_stock: min
      })
    })

    setShowAdd(false)
    loadItems()
  }

  /* ================= EDIT ================= */

  const handleUpdate = async () => {
    if (!selected) return

    const name = (document.getElementById('editName') as HTMLInputElement).value
    const unit = (document.getElementById('editUnit') as HTMLSelectElement).value
    const current = (document.getElementById('editCurrent') as HTMLInputElement).value
    const min = (document.getElementById('editMin') as HTMLInputElement).value

    await fetch(`${API_BASE}/ingredients/${selected.id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name,
        unit,
        current_stock: current,
        min_stock: min
      })
    })

    setShowEdit(false)
    loadItems()
  }

  /* ================= DELETE ================= */

  const handleDelete = async () => {
    if (!selected) return

    await fetch(`${API_BASE}/ingredients/${selected.id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })

    setShowDelete(false)
    loadItems()
  }

  return (
    <div className="relative -mt-4 space-y-6 overflow-hidden animate-fade-in md:-mt-6">
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-violet-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-10 h-80 w-80 rounded-full bg-fuchsia-300/20 blur-3xl" />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-violet-200 bg-[linear-gradient(130deg,#1b1132_0%,#452678_42%,#7441c9_100%)] p-7 text-white shadow-[0_18px_42px_rgba(52,22,97,0.34)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(255,255,255,0.26),transparent_34%),radial-gradient(circle_at_82%_26%,rgba(255,255,255,0.14),transparent_28%)]" />
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.24em] text-violet-100/90">Enterprise Supply Desk</p>
            <h1 className="mt-2 text-4xl font-bold leading-tight">Inventory Intelligence</h1>
            <p className="mt-1.5 max-w-xl text-sm text-violet-100/95">
              Real-time stock posture, reorder liability, and valuation visibility in one workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5">Realtime Monitoring</span>
              <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5">Forecast Ready</span>
              <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5">Ops Compliant</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-violet-200/80 bg-white/92 p-6 shadow-[0_14px_34px_rgba(72,35,130,0.12)] backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-violet-700">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">Actions</span>
            </div>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              {filtered.length} visible
            </span>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ingredients..."
                className="w-full rounded-xl border border-violet-200 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-300/40"
              />
            </div>

            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#7f56d9_0%,#6f43cf_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(111,67,207,0.34)] transition hover:opacity-95"
            >
              <Plus className="w-4 h-4" />
              Add Ingredient
            </button>
            <button
              onClick={() => navigate('/admin/assets')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300 bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            >
              <Package className="w-4 h-4" />
              Manage Assets
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Total Items" value={items.length} icon={<Package className="w-5 h-5 text-violet-600" />} />
        <Card title="Low Stock" value={lowCount} icon={<AlertTriangle className="w-5 h-5 text-fuchsia-500" />} />
        <Card title="Out of Stock" value={outCount} icon={<TrendingDown className="w-5 h-5 text-rose-500" />} />
        <Card
          title="Inventory Health"
          value={`${items.length === 0 ? 0 : Math.round(((items.length - lowCount - outCount) / items.length) * 100)}%`}
          icon={<BarChart3 className="w-5 h-5 text-violet-600" />}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_20px_rgba(2,6,23,0.06)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Opening Stock Initialization (One Time)</h2>
            <p className="text-xs text-slate-600">
              Set initial stock only on first setup. Backend blocks re-initialization after first success.
            </p>
            {openingInitialized ? (
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                Locked
                {openingInitializedOn ? ` on ${new Date(openingInitializedOn).toLocaleString()}` : ''}.
              </p>
            ) : null}
          </div>
          <button
            onClick={handleInitOpeningStock}
            disabled={openingLoading || openingStatusLoading || openingInitialized}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {openingInitialized ? 'Already Initialized' : openingLoading ? 'Initializing...' : 'Initialize Opening Stock'}
          </button>
        </div>

        <input
          value={openingSearch}
          onChange={(e) => setOpeningSearch(e.target.value)}
          placeholder="Search ingredient for opening stock..."
          disabled={openingInitialized}
          className="mb-4 w-full rounded-xl border border-violet-200 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-300/40"
        />

        {openingError ? <p className="mb-3 text-sm font-medium text-rose-600">{openingError}</p> : null}
        {openingMessage ? <p className="mb-3 text-sm font-medium text-emerald-700">{openingMessage}</p> : null}

        <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] tracking-[0.12em]">
              <tr>
                <th className="px-4 py-3 text-left">Ingredient</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-left">Current Stock</th>
                <th className="px-4 py-3 text-left">Opening Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {openingFiltered.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{row.name}</td>
                  <td className="px-4 py-2.5 text-slate-700">{row.unit}</td>
                  <td className="px-4 py-2.5 text-slate-700">{row.current_stock}</td>
                  <td className="px-4 py-2.5">
                    <input
                      value={openingQuantities[row.id] ?? ''}
                      onChange={(e) => setOpeningQuantities((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      placeholder="0"
                      type="number"
                      disabled={openingInitialized}
                      className="h-9 w-36 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-violet-400"
                    />
                  </td>
                </tr>
              ))}
              {openingFiltered.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-slate-500" colSpan={4}>No ingredients found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_20px_rgba(2,6,23,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[11px] tracking-[0.12em]">
              <tr>
                <th className="px-6 py-3.5 text-left">Ingredient</th>
                <th className="px-6 py-3.5 text-left">Stock</th>
                <th className="px-6 py-3.5 text-left">Min Level</th>
                <th className="px-6 py-3.5 text-left">Reorder</th>
                <th className="px-6 py-3.5 text-left">Valuation</th>
                <th className="px-6 py-3.5 text-left">Health</th>
                <th className="px-6 py-3.5 text-left">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map(i => {
                const current = Number(i.current_stock)
                const min = Number(i.min_stock)
                const status = getStatus(current, min)
                const health = calculateHealthScore(current, min)
                const reorder = calculateReorder(current, min)
                const valuation = calculateValuation(current)

                return (
                  <tr key={i.id} className="transition hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span className="font-semibold tracking-tight text-slate-900">{i.name}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-700">
                      {i.current_stock} {i.unit}
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-700">
                      {i.min_stock} {i.unit}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                        reorder > 0 ? "border border-amber-200 bg-amber-50 text-amber-700" : "border border-slate-200 bg-slate-50 text-slate-600"
                      }`}>
                        {reorder > 0 ? `Reorder ${reorder} ${i.unit}` : "No Reorder"}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-900">
                      Rs.{valuation.toLocaleString()}
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          status === 'good'
                            ? 'text-emerald-700'
                            : status === 'low'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}>
                          <span className={`h-2 w-2 rounded-full ${
                            status === 'good'
                              ? 'bg-emerald-500'
                              : status === 'low'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`} />
                          {status === 'good'
                            ? 'Healthy'
                            : status === 'low'
                            ? 'Low Stock'
                            : 'Out of Stock'}
                        </span>
                        <div className="h-1.5 w-28 rounded-full bg-slate-200">
                          <div
                            className={`h-1.5 rounded-full ${
                              health >= 100 ? "bg-emerald-500" : health >= 40 ? "bg-amber-500" : "bg-rose-500"
                            }`}
                            style={{ width: `${health}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelected(i)
                            setShowEdit(true)
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelected(i)
                            setShowDelete(true)
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODALS */}
      {showAdd && (
        <Modal title="Add Ingredient" onClose={() => setShowAdd(false)} onSave={handleAdd} />
      )}

      {showEdit && selected && (
        <Modal
          title="Edit Ingredient"
          ingredient={selected}
          onClose={() => setShowEdit(false)}
          onSave={handleUpdate}
        />
      )}

      {showDelete && selected && (
        <DeleteModal
          name={selected.name}
          onClose={() => setShowDelete(false)}
          onDelete={handleDelete}
        />
      )}

    </div>
  )
}

export default Inventory

const Card = ({ title, value, icon }: { title: string; value: string | number; icon: JSX.Element }) => (
  <div className="rounded-2xl border border-violet-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)] p-5 shadow-[0_10px_22px_rgba(75,35,132,0.08)] flex justify-between items-center">
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-violet-500">{title}</p>
      <h3 className="text-2xl font-semibold mt-1 text-violet-950">{value}</h3>
    </div>
    {icon}
  </div>
)

/* ================= MODALS ================= */

const Modal = ({
  title,
  ingredient,
  onClose,
  onSave,
}: {
  title: string;
  ingredient?: Ingredient;
  onClose: () => void;
  onSave: () => void;
}) => (
  (() => {
    const unitId = ingredient ? 'editUnit' : 'addUnit'
    const selectedUnit = ingredient?.unit || INVENTORY_UNITS[0]
    const unitOptions = INVENTORY_UNITS.includes(selectedUnit as typeof INVENTORY_UNITS[number])
      ? INVENTORY_UNITS
      : [...INVENTORY_UNITS, selectedUnit]
    return (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white w-[520px] rounded-2xl p-6 space-y-5 shadow-2xl border border-violet-200">

      <h2 className="text-lg font-semibold text-violet-950">{title}</h2>

      <input
        id={ingredient ? 'editName' : 'addName'}
        defaultValue={ingredient?.name}
        placeholder="Name"
        className="w-full px-4 py-2.5 border border-violet-200 rounded-xl outline-none focus:border-violet-400"
      />

      <select
        id={unitId}
        defaultValue={selectedUnit}
        className="w-full px-4 py-2.5 border border-violet-200 rounded-xl outline-none focus:border-violet-400 bg-white"
      >
        {unitOptions.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>

      <input
        id={ingredient ? 'editCurrent' : 'addCurrent'}
        defaultValue={ingredient?.current_stock}
        type="number"
        placeholder="Current Stock"
        className="w-full px-4 py-2.5 border border-violet-200 rounded-xl outline-none focus:border-violet-400"
      />

      <input
        id={ingredient ? 'editMin' : 'addMin'}
        defaultValue={ingredient?.min_stock}
        type="number"
        placeholder="Minimum Stock"
        className="w-full px-4 py-2.5 border border-violet-200 rounded-xl outline-none focus:border-violet-400"
      />

      <div className="flex justify-end gap-4">
        <button onClick={onClose} className="text-violet-500 hover:text-violet-700">
          Cancel
        </button>

        <button
          onClick={onSave}
          className="bg-violet-600 text-white px-5 py-2 rounded-xl hover:bg-violet-700 transition"
        >
          Save
        </button>
      </div>

    </div>
  </div>
    )
  })()
)

const DeleteModal = ({
  name,
  onClose,
  onDelete,
}: {
  name: string;
  onClose: () => void;
  onDelete: () => void;
}) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white w-[420px] rounded-2xl p-6 space-y-5 shadow-2xl border border-violet-200">

      <h2 className="text-lg font-semibold text-rose-600">Delete Ingredient</h2>

      <p className="text-sm text-violet-600/75">
        Are you sure you want to delete <strong>{name}</strong>?
      </p>

      <div className="flex justify-end gap-4">
        <button onClick={onClose} className="text-violet-500 hover:text-violet-700">
          Cancel
        </button>

        <button
          onClick={onDelete}
          className="bg-rose-600 text-white px-5 py-2 rounded-xl hover:bg-rose-700 transition"
        >
          Delete
        </button>
      </div>

    </div>
  </div>
)


