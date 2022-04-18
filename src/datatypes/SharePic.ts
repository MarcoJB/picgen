export class SharePic {
  platform = "INSTAGRAM"
  title = "Überschrift"
  subtitle = "Unterüberschrift"
  subtitleColor = "white"
  city = "Karlsruhe"
  copyright = '© Greenpeace Karlsruhe'
  copyrightColor = "black"
  logoScheme = "wg"
  mainImage: string = ""
  mainImageSize = "FULL_HEIGHT"
  mainImageHeight = 1200
  mainImageHorizontalPositioning = "CENTER"
  mainImageVerticalPositioning = "CENTER"
  imagePosition = {x: 0, y: 0}
  backgroundImage = ""
  cropImage = false
  text = ""
  exportName = "SharePic"

  constructor() { }
}
