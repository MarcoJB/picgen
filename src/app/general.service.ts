import { Injectable } from "@angular/core";

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

  constructor() {
    if (localStorage.getItem("darkMode")) {
      this._darkMode = !!localStorage.getItem("darkMode")
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this._darkMode = true
    } else {
      this._darkMode = false
    }
  }

  init(): void {}
}