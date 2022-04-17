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
  filterBrightness = 0
  filterContrast = 0
  filterSaturation = 0
  filterBlack = 0
  filterWhite = 100
  balance = [1, 1, 1]
  unsharpMasking = 0

  constructor() { }
}
