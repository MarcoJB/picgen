import { identifierModuleUrl, sharedStylesheetJitUrl } from "@angular/compiler";
import { Injectable } from "@angular/core";
import { SharePic } from "src/datatypes/SharePic";
import { SharePicSet } from "src/datatypes/SharePicSet";
import { deserializeArray } from 'class-transformer';

@Injectable({
  providedIn: "root"
})
export class GeneralService {

  _darkMode: boolean
  get darkMode(): boolean {
    return this._darkMode
  }
  set darkMode(newDarkMode: boolean) {
    localStorage.setItem("darkMode", newDarkMode ? "1" : "")
    this._darkMode = newDarkMode
  }

  localSharePicSets: SharePicSet[]

  constructor() {
    if (localStorage.getItem("darkMode")) {
      this._darkMode = !!localStorage.getItem("darkMode")
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this._darkMode = true
    } else {
      this._darkMode = false
    }

    this.localSharePicSets = deserializeArray(SharePicSet, localStorage.getItem("localSharePicSets") || "[]")
  }

  init(): void {}

  createId(): string {
    const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let id = ""

    while (id.length < 8) {
      id += characters[Math.floor(Math.random() * 62)]
    }

    return id
  }

  getLocalSharePicSetById(id: string): SharePicSet|null {
    for (const sharePicSet of this.localSharePicSets) {
      if (sharePicSet.id === id) return sharePicSet
    }
    return null
  }

  syncLocalSharePicSets() {
    localStorage.setItem("localSharePicSets", JSON.stringify(this.localSharePicSets))
  }

  deleteLocalSharePicSet(event: MouseEvent, localSharePicSet: SharePicSet) {
    if (confirm("Dieses Sharepic Set wirklich löschen?")) {
      this.localSharePicSets.splice(this.localSharePicSets.indexOf(localSharePicSet), 1)
      this.syncLocalSharePicSets()
    }

    event.preventDefault()
    event.stopPropagation()
  }
}