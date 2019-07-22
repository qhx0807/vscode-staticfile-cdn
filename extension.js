// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode')
const request = require('request-promise')
const LIBS_SEARCH_URL = 'https://api.cdnjs.com/libraries/?search='
const LINKS_SEARCH_UEL = 'https://api.cdnjs.com/libraries/'
const PACKAGE_PREFIX_URL = 'https://cdn.staticfile.org/'
let selectedName = ''
let libAssets = []

function debounce (fun, delay) {
  return function () {
    let that = this
    let _args = arguments
    clearTimeout(fun.id)
    fun.id = setTimeout(function () {
      fun.call(that, ..._args)
    }, delay)
  }
}

function selectLibs () {
  const libPicker = vscode.window.createQuickPick()
  libPicker.placeholder = '请输入包名'
  libPicker.items = []
  libPicker.show()
  libPicker.onDidChangeSelection((e) => {
    selectedName = e[0].label
    selectVerion(e[0].label)
  })
  libPicker.onDidChangeValue(e => {
    debounce(getLibs, 500)(e, libPicker)
  })
}

async function selectVerion (name) {
  const verPiker = vscode.window.createQuickPick()
  verPiker.busy = true
  verPiker.placeholder = `请选择版本 ${selectedName}`
  verPiker.show()
  let items = await getVersionList(name)
  verPiker.items = items
  verPiker.busy = false
  verPiker.onDidChangeSelection((version) => {
    let assets = getAssets(version[0].label)
    vscode.window.showQuickPick(assets, { placeHolder: `选择模块 ${version[0].label}` }).then(function (selected) {
      let editor = vscode.window.activeTextEditor
      if (!editor) return false
      let libCdnUrl = PACKAGE_PREFIX_URL + selectedName + '/' + version[0].label + '/' + selected.label
      editor.insertSnippet(new vscode.SnippetString(libCdnUrl))
    })
  })
}

async function getLibs (e, picker) {
  picker.busy = true
  const result = await request(LIBS_SEARCH_URL + e)
  try {
    let libs = JSON.parse(result)
    if (libs.results) {
      let res = []
      libs.results.forEach(item => {
        res.push({ label: item.name })
      })
      picker.items = res
    }
  } catch (error) {
    console.log(error)
  }
  picker.busy = false
}

async function getVersionList (e) {
  const result = await request(LINKS_SEARCH_UEL + e)
  let versions = []
  try {
    let obj = JSON.parse(result)
    libAssets = obj.assets
    obj.assets.forEach(item => {
      versions.push({ label: item.version })
    })
  } catch (error) {
    console.log(error)
  }
  return versions
}

function getAssets (version) {
  const item = libAssets.find(el => el.version === version)
  let arr = []
  item.files.forEach(el => arr.push({ label: el }))
  return arr
}

function activate (context) {
  let disposable = vscode.commands.registerCommand('extension.StaticfileCDN', selectLibs)
  context.subscriptions.push(disposable)
}

exports.activate = activate

// this method is called when your extension is deactivated
function deactivate () {
  selectedName = ''
  libAssets = []
}

module.exports = {
  activate,
  deactivate
}
