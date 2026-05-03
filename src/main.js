import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow, PhysicalSize } from '@tauri-apps/api/window'

const ALL_ALGOS = [
  { id: 'blake2b',   label: 'BLAKE2b' },
  { id: 'blake2s',   label: 'BLAKE2s' },
  { id: 'blake3',    label: 'BLAKE3' },
  { id: 'crc32',     label: 'CRC32' },
  { id: 'md5',       label: 'MD5' },
  { id: 'ripemd160', label: 'RIPEMD-160' },
  { id: 'sha1',      label: 'SHA-1' },
  { id: 'sha224',    label: 'SHA-224' },
  { id: 'sha256',    label: 'SHA-256' },
  { id: 'sha384',    label: 'SHA-384' },
  { id: 'sha512',    label: 'SHA-512' },
  { id: 'sha3_256',  label: 'SHA-3 (256)' },
  { id: 'sha3_512',  label: 'SHA-3 (512)' },
  { id: 'whirlpool', label: 'Whirlpool' },
]

const ALL_SETTINGS_ALGOS = [
  { id: 'size', label: 'Size (bytes)' },
  ...ALL_ALGOS,
]

const STORAGE_KEY_VISIBLE = 'hashcalc_visible'
const STORAGE_KEY_CHECKED = 'hashcalc_checked'

const DEFAULT_HIDDEN = new Set(['sha224', 'sha3_512', 'blake2s', 'whirlpool'])

function loadVisible() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY_VISIBLE))
    if (Array.isArray(v)) return new Set(v)
  } catch {}
  return new Set(ALL_ALGOS.map(a => a.id).filter(id => !DEFAULT_HIDDEN.has(id)))
}

function loadChecked() {
  try {
    const c = JSON.parse(localStorage.getItem(STORAGE_KEY_CHECKED))
    if (Array.isArray(c)) return new Set(c)
  } catch {}
  return new Set(ALL_ALGOS.map(a => a.id))
}

let visibleAlgos = loadVisible()
let checkedAlgos = loadChecked()
let selectedFile  = null

const headerBrowse   = document.getElementById('header-browse')
const algoList       = document.getElementById('algo-list')
const sizeRow        = document.getElementById('size-row')
const sizeValue      = document.getElementById('size-value')
const progressWrap   = document.getElementById('progress-wrap')
const progressFill   = document.getElementById('progress-fill')
const progressLabel  = document.getElementById('progress-label')
const settingsBtn    = document.getElementById('settings-btn')
const settingsPanel  = document.getElementById('settings-panel')
const settingsList   = document.getElementById('settings-panel-list')

// Build single-column algorithm rows with inline hash boxes
function renderAlgoList() {
  algoList.innerHTML = ''
  sizeRow.classList.toggle('hidden', !visibleAlgos.has('size'))

  const visible = ALL_ALGOS.filter(a => visibleAlgos.has(a.id))

  if (visible.length === 0) {
    const msg = document.createElement('div')
    msg.className = 'algo-empty'
    msg.textContent = 'Select Hashes to display in the Settings.'
    algoList.appendChild(msg)
    return
  }

  visible.forEach(algo => {
    const row = document.createElement('div')
    row.className = 'algo-row'
    row.dataset.id = algo.id

    // Checkbox + label
    const checkLabel = document.createElement('label')
    checkLabel.className = 'algo-check-label'

    const input = document.createElement('input')
    input.type = 'checkbox'
    input.value = algo.id
    input.checked = checkedAlgos.has(algo.id)
    input.addEventListener('change', () => {
      if (input.checked) checkedAlgos.add(algo.id)
      else checkedAlgos.delete(algo.id)
      localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify([...checkedAlgos]))
    })

    const box = document.createElement('span')
    box.className = 'algo-checkbox'

    checkLabel.appendChild(input)
    checkLabel.appendChild(box)

    // Algorithm name
    const name = document.createElement('span')
    name.className = 'algo-name'
    name.textContent = algo.label

    // Hash result box
    const hashBox = document.createElement('div')
    hashBox.className = 'hash-box'
    hashBox.dataset.algoId = algo.id
    hashBox.textContent = '—'
    hashBox.title = 'Click to copy'
    hashBox.addEventListener('click', () => {
      if (!hashBox.classList.contains('has-value')) return
      navigator.clipboard.writeText(hashBox.dataset.hash).then(() => {
        hashBox.classList.add('copied')
        hashBox.textContent = 'Copied!'
        setTimeout(() => {
          hashBox.classList.remove('copied')
          hashBox.textContent = hashBox.dataset.hash
        }, 1200)
      })
    })

    row.appendChild(checkLabel)
    row.appendChild(name)
    row.appendChild(hashBox)
    algoList.appendChild(row)
  })
}

function setHashResult(algoId, hash) {
  const hashBox = algoList.querySelector(`.hash-box[data-algo-id="${algoId}"]`)
  if (!hashBox) return
  hashBox.dataset.hash = hash
  hashBox.textContent = hash
  hashBox.classList.add('has-value')
  hashBox.title = 'Click to copy'
}

function clearHashResults() {
  algoList.querySelectorAll('.hash-box').forEach(box => {
    box.dataset.hash = ''
    box.textContent = '—'
    box.classList.remove('has-value', 'copied')
  })
  sizeValue.dataset.size = ''
  sizeValue.textContent = '—'
  sizeValue.classList.remove('has-value', 'copied')
}

async function calculateHashes(filePath) {
  const selected = [...checkedAlgos].filter(id => visibleAlgos.has(id))

  progressWrap.classList.remove('hidden')
  clearHashResults()

  if (visibleAlgos.has('size')) {
    try {
      const bytes = await invoke('get_file_size', { filePath })
      const display = String(bytes)
      sizeValue.dataset.size = display
      sizeValue.textContent = display
      sizeValue.classList.add('has-value')
    } catch (err) {
      sizeValue.textContent = `Error: ${err}`
    }
  }

  if (selected.length === 0) {
    progressWrap.classList.add('hidden')
    return
  }

  const total = selected.length
  let done = 0

  for (const algoId of selected) {
    progressLabel.textContent = `Computing ${algoId}...`
    try {
      const hash = await invoke('compute_hash', { filePath, algorithm: algoId })
      setHashResult(algoId, hash)
    } catch (err) {
      setHashResult(algoId, `Error: ${err}`)
    }
    done++
    progressFill.style.width = `${Math.round((done / total) * 100)}%`
  }

  progressWrap.classList.add('hidden')
  progressFill.style.width = '0%'
}

// File selection
function setFilePath(path) {
  if (!path) return
  selectedFile = { path, name: path.split(/[\\/]/).pop() }
  calculateHashes(selectedFile.path)
}

async function openFilePicker() {
  const path = await open({ multiple: false, directory: false })
  if (path) setFilePath(path)
}

sizeValue.addEventListener('click', () => {
  if (!sizeValue.classList.contains('has-value')) return
  navigator.clipboard.writeText(sizeValue.dataset.size).then(() => {
    sizeValue.classList.add('copied')
    const prev = sizeValue.textContent
    sizeValue.textContent = 'Copied!'
    setTimeout(() => {
      sizeValue.classList.remove('copied')
      sizeValue.textContent = prev
    }, 1200)
  })
})

headerBrowse.addEventListener('click', openFilePicker)

document.addEventListener('dragover', (e) => e.preventDefault())
document.addEventListener('drop', (e) => e.preventDefault())

// Tauri native drag-drop gives us the real file path
listen('tauri://drag-drop', (event) => {
  const paths = event.payload?.paths
  if (paths && paths.length > 0) setFilePath(paths[0])
})

// Inline settings panel
function renderSettingsPanel() {
  settingsList.innerHTML = ''
  ALL_SETTINGS_ALGOS.forEach((algo, i) => {
    const label = document.createElement('label')
    label.className = 'settings-item'

    const input = document.createElement('input')
    input.type = 'checkbox'
    input.value = algo.id
    input.checked = visibleAlgos.has(algo.id)
    input.addEventListener('change', () => {
      if (input.checked) visibleAlgos.add(algo.id)
      else visibleAlgos.delete(algo.id)
      localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify([...visibleAlgos]))
      checkedAlgos = new Set([...checkedAlgos].filter(id => visibleAlgos.has(id)))
      localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify([...checkedAlgos]))
      renderAlgoList()
      resizeWindowToContent()
    })

    const box = document.createElement('span')
    box.className = 'settings-checkbox'

    const text = document.createElement('span')
    text.className = 'settings-label'
    text.textContent = algo.label

    label.appendChild(input)
    label.appendChild(box)
    label.appendChild(text)
    settingsList.appendChild(label)
  })
}

settingsBtn.addEventListener('click', () => {
  const nowVisible = settingsPanel.classList.toggle('hidden') === false
  if (nowVisible) renderSettingsPanel()
  resizeWindowToContent()
})


let lastSetHeightPx = 0

async function resizeWindowToContent() {
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const win = getCurrentWindow()
  const outerSize = await win.outerSize()
  const dpr = window.devicePixelRatio || 1
  const vertChromePx = outerSize.height - Math.round(window.innerHeight * dpr)
  const app = document.getElementById('app')
  const bodyStyle = getComputedStyle(document.body)
  const contentHeightPx = Math.round((app.getBoundingClientRect().bottom + parseFloat(bodyStyle.paddingBottom)) * dpr)
  const newHeightPx = Math.max(Math.round(200 * dpr), contentHeightPx + vertChromePx)
  if (newHeightPx === lastSetHeightPx) return
  lastSetHeightPx = newHeightPx
  await win.setSize(new PhysicalSize(Math.round(window.innerWidth * dpr), newHeightPx))
}

// Init
renderAlgoList()
resizeWindowToContent()
