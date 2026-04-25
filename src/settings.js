import { emit } from '@tauri-apps/api/event'
import { getCurrentWindow, PhysicalSize } from '@tauri-apps/api/window'
import './style.css'

const win = getCurrentWindow()

const ALL_ALGOS = [
  { id: 'size',      label: 'Size (bytes)' },
  { id: 'md5',       label: 'MD5' },
  { id: 'sha1',      label: 'SHA-1' },
  { id: 'sha224',    label: 'SHA-224' },
  { id: 'sha256',    label: 'SHA-256' },
  { id: 'sha384',    label: 'SHA-384' },
  { id: 'sha512',    label: 'SHA-512' },
  { id: 'sha3_256',  label: 'SHA-3 (256)' },
  { id: 'sha3_512',  label: 'SHA-3 (512)' },
  { id: 'blake2b',   label: 'BLAKE2b' },
  { id: 'blake2s',   label: 'BLAKE2s' },
  { id: 'blake3',    label: 'BLAKE3' },
  { id: 'crc32',     label: 'CRC32' },
  { id: 'adler32',   label: 'Adler-32' },
  { id: 'ripemd160', label: 'RIPEMD-160' },
  { id: 'whirlpool', label: 'Whirlpool' },
]

const STORAGE_KEY_VISIBLE = 'hashcalc_visible'
const STORAGE_KEY_CHECKED = 'hashcalc_checked'
const DEFAULT_HIDDEN = new Set(['adler32', 'sha224', 'sha3_512', 'blake2s', 'whirlpool'])

function loadVisible() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY_VISIBLE))
    if (Array.isArray(v)) return new Set(v)
  } catch {}
  return new Set(ALL_ALGOS.map(a => a.id).filter(id => !DEFAULT_HIDDEN.has(id)))
}

const settingsList  = document.getElementById('settings-list')
const settingsAll   = document.getElementById('settings-select-all')
const settingsNone  = document.getElementById('settings-deselect-all')
const settingsSave  = document.getElementById('settings-save')

function renderList() {
  settingsList.innerHTML = ''
  ALL_ALGOS.forEach((algo, i) => {
    const label = document.createElement('label')
    label.className = 'settings-item'

    const input = document.createElement('input')
    input.type = 'checkbox'
    input.value = algo.id
    input.checked = loadVisible().has(algo.id)

    const box = document.createElement('span')
    box.className = 'settings-checkbox'

    const text = document.createElement('span')
    text.className = 'settings-label'
    text.textContent = algo.label

    label.appendChild(input)
    label.appendChild(box)
    label.appendChild(text)
    settingsList.appendChild(label)
    if (i === 0) {
      const divider = document.createElement('div')
      divider.className = 'settings-divider'
      settingsList.appendChild(divider)
    }
  })
}

settingsAll.addEventListener('click', () =>
  settingsList.querySelectorAll('input').forEach(cb => cb.checked = true))

settingsNone.addEventListener('click', () =>
  settingsList.querySelectorAll('input').forEach(cb => cb.checked = false))

settingsSave.addEventListener('click', async () => {
  const newVisible = new Set()
  settingsList.querySelectorAll('input').forEach(cb => {
    if (cb.checked) newVisible.add(cb.value)
  })
  localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify([...newVisible]))

  try {
    const checked = JSON.parse(localStorage.getItem(STORAGE_KEY_CHECKED))
    if (Array.isArray(checked)) {
      localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify(checked.filter(id => newVisible.has(id))))
    }
  } catch {}

  await emit('settings-saved')
  await win.hide()
})

// Intercept native close button — hide instead of destroy to avoid WebKit crash
win.onCloseRequested(async (event) => {
  event.preventDefault()
  await win.hide()
})

async function resizeToContent() {
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const outerSize = await win.outerSize()
  const dpr = window.devicePixelRatio || 1
  const vertChromePx = Math.max(0, outerSize.height - Math.round(window.innerHeight * dpr))
  const page = document.getElementById('settings-page')
  const bodyStyle = getComputedStyle(document.body)
  const contentHeightPx = Math.round((page.getBoundingClientRect().bottom + parseFloat(bodyStyle.paddingBottom)) * dpr)
  const newHeightPx = Math.max(Math.round(200 * dpr), contentHeightPx + vertChromePx)
  await win.setSize(new PhysicalSize(outerSize.width, newHeightPx))
}

window.addEventListener('focus', () => {
  renderList()
  resizeToContent()
})

renderList()
resizeToContent()
