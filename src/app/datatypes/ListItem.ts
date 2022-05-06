export class ListItem {
  text: string
  icon: boolean

  constructor(text: string, icon: boolean = false) {
    this.text = text
    this.icon = icon
  }
}
