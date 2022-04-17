import {Component, ElementRef, HostBinding, HostListener, Input, Output, OnInit, ViewChild, EventEmitter} from '@angular/core';
import {SharePic} from "../datatypes/SharePic";
import {ListItem} from "../datatypes/ListItem";
import {GeneralService} from '../general.service';
import GPU from 'gpu.js'

@Component({
  selector: 'app-sharepic-preview',
  templateUrl: './sharepic-preview.component.html',
  styleUrls: ['./sharepic-preview.component.css']
})
export class SharepicPreviewComponent implements OnInit { 
  @Input() sharePic!: SharePic
  @Input() noElevation: boolean = false
  @Input() outline: boolean = false
  @Output() grabStatusChange = new EventEmitter<boolean>()

  saving = false
  scaleFactor = 1
  @ViewChild('mainImage') mainImageCanvas!: ElementRef<HTMLCanvasElement>
  @ViewChild('previewContainer') previewContainer!: ElementRef<HTMLDivElement>
  @ViewChild('preview') preview!: ElementRef<HTMLDivElement>
  dragStartPosition = {x: 0, y: 0}
  imageStartPosition = {x: 0, y: 0}
  sharePicHeight = 1200
  imageHeight = 1200
  exporting = false
  touchStartPosition = {x: 0, y: 0}
  touchStartOffset = {x: 0, y: 0}
  touchStartDistance = 0
  activeTouches = 0
  imageStartHeight = 0
  image: HTMLImageElement
  canvas!: HTMLCanvasElement
  ctx!: CanvasRenderingContext2D | null
  gpu: any
  filtersKernel: any
  

  @HostBinding('class.grabbing') draggingElement: HTMLCanvasElement|null = null

  constructor(private generalService: GeneralService,
  private hostRef:ElementRef) {
    this.image = document.createElement("img")
  }

  ngOnInit() {
    setTimeout(() => {
      this.changeFormat()

      this.canvas = this.mainImageCanvas.nativeElement
      this.ctx = this.canvas.getContext("2d")

      this.image.src = this.sharePic.mainImage
      this.image.addEventListener("load", () => {
        this.mainImageCanvas.nativeElement.height = this.image.naturalHeight
        this.mainImageCanvas.nativeElement.width = this.image.naturalWidth
        
        //this.ctx?.drawImage(this.image, 0, 0)
        this.recreateKernel()
        this.resetImage()
        this.applyFilters()
      })
    })
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.changeFormat()
  }

  changeFormat() {
    this.sharePicHeight = this.sharePic.platform == "INSTAGRAM" ? 1200 : 600
    this.imageHeight = this.sharePicHeight - (this.sharePic.cropImage ? 430 : 0)

    if (this.sharePic.mainImage) {
      this.resetImage()
    }

    setTimeout(() => {
      this.calcScaleFactor()
    })
  }

  calcScaleFactor() {
    this.scaleFactor = Math.min(
      this.hostRef.nativeElement.offsetWidth / 1200,
      this.hostRef.nativeElement.offsetHeight / this.sharePicHeight,
      1
    )
  }

  resetImage() {
    this.resetImageSize()
    this.resetHorizontalPositioning()
    this.resetVerticalPositioning()
  }

  resetImageSize() {
    const img = this.mainImageCanvas.nativeElement

    if (this.sharePic.mainImageSize == "FULL_HEIGHT") {
      this.sharePic.mainImageHeight = this.imageHeight
    } else if (this.sharePic.mainImageSize == "FULL_WIDTH") {
      this.sharePic.mainImageHeight = 1200 / this.image.naturalWidth * this.image.naturalHeight
    }
  }

  recreateKernel() {
    this.gpu = new GPU()

    this.gpu.addFunction(function rgb2hsv(r: number, g: number, b: number) {
      // @ts-ignore
      let h, s, v = Math.max(Math.max(r, g), b), c = v-Math.min(Math.min(r, g), b)

      if (c == 0) {
        h = 0
      } else if (v == r) {
        h = (g-b)/c
      } else if (v == g) {
        h = 2+(b-r)/c
      } else {
        h = 4+(r-g)/c
      }
      if (h < 0) h += 6
      h /= 6

      if (v == 0) {
        s = 0
      } else {
        s = c/v
      }

      return [h, s, v]
    }, {returnType: 'Array(3)'})

    this.gpu.addFunction(function hsv2rgb(h: number, s: number, v: number) {
      let r = v - v*s*Math.max(Math.min(Math.min((5+h*6)%6, 4-((5+h*6)%6)), 1), 0)
      let g = v - v*s*Math.max(Math.min(Math.min((3+h*6)%6, 4-((3+h*6)%6)), 1), 0)
      let b = v - v*s*Math.max(Math.min(Math.min((1+h*6)%6, 4-((1+h*6)%6)), 1), 0)

      return [r, g, b]
    }, {returnType: 'Array(3)'})

    this.gpu.addFunction(function hsv2hsl(h: number, s: number, v: number) {
      let l = (2 - s) * v / 2;

      if (l != 0) {
          if (l == 1) {
              s = 0
          } else if (l < 0.5) {
              s = s * v / (l * 2)
          } else {
              s = s * v / (2 - l * 2)
          }
      }

      return [h, s, l]
    }, {returnType: 'Array(3)'})

    this.gpu.addFunction(function hue2rgb(p: number, q: number, t: number) {
      if(t < 0) t += 1
      else if(t > 1) t -= 1
      if(t < 1/6) return p + (q - p) * 6 * t
      if(t < 1/2) return q
      if(t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    })

    this.gpu.addFunction(function hsl2rgb(h: number, s: number, l: number) {
      let r, g, b
  
      if(s == 0){
          r = g = b = l // achromatic
      }else{
          let q
          if (l < 0.5) q = l * (1 + s)
          else q = l + s - l * s

          let p = 2 * l - q
          // @ts-ignore
          r = hue2rgb(p, q, h + 1/3)
          // @ts-ignore
          g = hue2rgb(p, q, h)
          // @ts-ignore
          b = hue2rgb(p, q, h - 1/3)
      }
  
      return [r, g, b]
    }, {returnType: 'Array(3)'})

    this.gpu.addFunction(function rgb2xyz(r: number, g: number, b: number) {
      if (r > 0.04045) r = Math.pow((r + 0.055) / 1.055, 2.4)
      else r /= 12.92
      if (g > 0.04045) g = Math.pow((g + 0.055) / 1.055, 2.4)
      else g /= 12.92
      if (b > 0.04045) b = Math.pow((b + 0.055) / 1.055, 2.4)
      else b /= 12.92

      let x = r * 0.4124 + g * 0.3576 + b * 0.1805
      let y = r * 0.2126 + g * 0.7152 + b * 0.0722
      let z = r * 0.0193 + g * 0.1192 + b * 0.9505

      return [x, y, z]
    }, {returnType: 'Array(3)'})

    this.gpu.addFunction(function xyz2rgb(x: number, y: number, z: number) {
      let r = x *  3.2406 + y * -1.5372 + z * -0.4986
      let g = x * -0.9689 + y *  1.8758 + z *  0.0415
      let b = x *  0.0557 + y * -0.2040 + z *  1.0570

      if (r > 0.0031308) r = 1.055 * Math.pow(r, 1/2.4) - 0.055
      else r *= 12.92
      if (g > 0.0031308) g = 1.055 * Math.pow(g, 1/2.4) - 0.055
      else g *= 12.92
      if (b > 0.0031308) b = 1.055 * Math.pow(b, 1/2.4) - 0.055
      else b *= 12.92

      return [r, g, b]
    }, {returnType: 'Array(3)'})

    this.gpu.addFunction(function xyz2lab(x: number, y: number, z: number) {
      x /= 0.95
      z /= 1.08

      if (x > 0.008856) x = Math.pow(x, 1/3)
      else x = 7.787 * x + 16 / 116
      if (y > 0.008856) y = Math.pow(y, 1/3)
      else y = 7.787 * y + 16 / 116
      if (z > 0.008856) z = Math.pow(z, 1/3)
      else z = 7.787 * z + 16 / 116

      let l = 116 * y - 16
      let a = 500 * (x - y)
      let b = 200 * (y - z)

      return [l, a, b]
    }, {returnType: 'Array(3)'})

    this.gpu.addFunction(function lab2xyz(l: number, a: number, b: number) {
      let y = ( l + 16 ) / 116
      let x = a / 500 + y
      let z = y - b / 200

      if (Math.pow(y, 3) > 0.008856 ) y = Math.pow(y, 3)
      else y = (y - 16 / 116) / 7.787
      if (Math.pow(x, 3)  > 0.008856 ) x = Math.pow(x, 3)
      else x = ( x - 16 / 116 ) / 7.787
      if (Math.pow(z, 3)  > 0.008856 ) z = Math.pow(z, 3)
      else z = ( z - 16 / 116 ) / 7.787

      x = x * 0.95
      z = z * 1.08

      return [x, y, z]
    }, {returnType: 'Array(3)'})

    this.gpu.addFunction(function lab2lch(l: number, a: number, b: number) {
      let h = Math.atan2(b, a)

      if (h <= 0) h += 2*3.14159

      let c = Math.sqrt(a*a + b*b)

      return [l, c, h]
    }, {returnType: 'Array(3)'})

    this.gpu.addFunction(function lch2lab(l: number, c: number, h: number) {
      let a = Math.cos(h) * c
      let b = Math.sin(h) * c

      return [l, a, b]
    }, {returnType: 'Array(3)'})

    

    this.gpu.addFunction(function clamp01(value: number) {
      return Math.max(Math.min(value, 1), 0)
    })

    this.filtersKernel = this.gpu.createKernel(function(this: any, image: number[][][], brightness: number, saturation: number, 
      contrast: number, black: number, white: number, balanceRed: number, balanceGreen: number, balanceBlue: number, unsharpMaskingRadius: number, unsharpMaskingKernel: number[][]) {
      const pixel = image[this.thread.y][this.thread.x]
      let rgb = [pixel[0], pixel[1], pixel[2]]

      if (unsharpMaskingRadius > 0) {
        let avgRed = 0
        let avgGreen = 0
        let avgBlue = 0
        let divider = 0

        for (let y = -unsharpMaskingRadius; y <= unsharpMaskingRadius; y++) {
          if (this.thread.y + y >= 0 && this.thread.y + y < this.constants.sizeY) {
            for (let x = -unsharpMaskingRadius; x <= unsharpMaskingRadius; x++) {
              if (this.thread.x + x >= 0 && this.thread.x + x < this.constants.sizeX) {
                const currentPixel = image[this.thread.y + y][this.thread.x + x]
                avgRed += unsharpMaskingKernel[y+unsharpMaskingRadius][x+unsharpMaskingRadius]*currentPixel[0]
                avgGreen += unsharpMaskingKernel[y+unsharpMaskingRadius][x+unsharpMaskingRadius]*currentPixel[1]
                avgBlue += unsharpMaskingKernel[y+unsharpMaskingRadius][x+unsharpMaskingRadius]*currentPixel[2]

                divider += unsharpMaskingKernel[y+unsharpMaskingRadius][x+unsharpMaskingRadius]
              }
            }
          }
        }

        rgb[0] = avgRed/divider
        rgb[1] = avgGreen/divider
        rgb[2] = avgBlue/divider
      }

      if (brightness !== 1) {
        // @ts-ignore
        rgb[0] = clamp01(brightness * rgb[0])
        // @ts-ignore
        rgb[1] = clamp01(brightness * rgb[1])
        // @ts-ignore
        rgb[2] = clamp01(brightness * rgb[2])
      }

      
      if (brightness !== 0.25) {
        const a = 16/3*(4*contrast-1)
        const b = 8-32*contrast
        const c = 1/3*(32*contrast-5)
        // @ts-ignore
        rgb[0] = clamp01(a*Math.pow(rgb[0], 3) + b*Math.pow(rgb[0], 2) + c*rgb[0])
        // @ts-ignore
        rgb[1] = clamp01(a*Math.pow(rgb[1], 3) + b*Math.pow(rgb[1], 2) + c*rgb[1])
        // @ts-ignore
        rgb[2] = clamp01(a*Math.pow(rgb[2], 3) + b*Math.pow(rgb[2], 2) + c*rgb[2])
      }

      if (black !== 0 || white !== 1) {
        // @ts-ignore
        rgb[0] = clamp01((rgb[0]-black)/(white-black))
        // @ts-ignore
        rgb[1] = clamp01((rgb[1]-black)/(white-black))
        // @ts-ignore
        rgb[2] = clamp01((rgb[2]-black)/(white-black))
      }

      if (saturation !== 1) {
        // @ts-ignore
        const hsv = rgb2hsv(clamp01(rgb[0]), clamp01(rgb[1]), clamp01(rgb[2]))
        // @ts-ignore
        const hsl = hsv2hsl(clamp01(hsv[0]), clamp01(hsv[1]), clamp01(hsv[2]))
        hsl[1] *= saturation
        // @ts-ignore
        rgb = hsl2rgb(clamp01(hsl[0]), clamp01(hsl[1]), clamp01(hsl[2]))
      }

      if (balanceRed !== 1 || balanceGreen !== 1 || balanceBlue !== 1) {
        const grayAvg = (balanceRed+balanceGreen+balanceBlue)/3

        if (rgb[0] <= balanceRed) {
          rgb[0] *= grayAvg/balanceRed
        } else {
          rgb[0] = 1 - (1-rgb[0])*(1-grayAvg)/(1-balanceRed)
        }
        if (rgb[1] <= balanceGreen) {
          rgb[1] *= grayAvg/balanceGreen
        } else {
          rgb[1] = 1 - (1-rgb[1])*(1-grayAvg)/(1-balanceGreen)
        }
        if (rgb[2] <= balanceBlue) {
          rgb[2] *= grayAvg/balanceBlue
        } else {
          rgb[2] = 1 - (1-rgb[2])*(1-grayAvg)/(1-balanceBlue)
        }
      }

      // @ts-ignore
      this.color(clamp01(rgb[0]), clamp01(rgb[1]), clamp01(rgb[2]), pixel[3])
    }, {
      graphical: true,
      output: [this.image.naturalWidth, this.image.naturalHeight],
      constants: {
        sizeX: this.image.naturalWidth,
        sizeY: this.image.naturalHeight
      }
    })
  }

  calculateGaussianKernel(std: number) {
    const radius = Math.ceil(std)
    const kernel: number[][] = []
    for (let y = -radius; y <= radius; y++) {
      kernel[y+radius] = []
      for (let x = -radius; x <= radius; x++) {
        kernel[y+radius][x+radius] = Math.exp((-x*x-y*y)/(2*std))
      }
    }
    return kernel
  }

  applyFilters() {
    const startTime = Date.now()
    const unsharpMaskingStd = this.sharePic.unsharpMasking*this.sharePic.unsharpMasking

    this.filtersKernel(
      this.image, 
      this.sharePic.filterBrightness/100+1, 
      this.sharePic.filterSaturation/100+1, 
      0.375-Math.pow(this.sharePic.filterContrast/100+1,2)/8, 
      this.sharePic.filterBlack/100, 
      this.sharePic.filterWhite/100, 
      this.sharePic.balance[0], 
      this.sharePic.balance[1], 
      this.sharePic.balance[2],
      Math.ceil(unsharpMaskingStd),
      this.calculateGaussianKernel(unsharpMaskingStd)
    )

    this.ctx?.drawImage(this.filtersKernel.getCanvas(), 0, 0)

    console.log(Date.now()-startTime)

    this.generalService.syncLocalSharePicSets()
  }

  resetHorizontalPositioning() {
    const img = this.mainImageCanvas.nativeElement

    switch (this.sharePic.mainImageHorizontalPositioning) {
      case "LEFT":
        this.sharePic.imagePosition.x = 0
        break
      case "CENTER":
        this.sharePic.imagePosition.x = (1200-this.sharePic.mainImageHeight/this.image.naturalHeight*this.image.naturalWidth)/2
        break
      case "RIGHT":
        this.sharePic.imagePosition.x = (1200-this.sharePic.mainImageHeight/this.image.naturalHeight*this.image.naturalWidth)
        break
    }
  }

  resetVerticalPositioning() {
    switch (this.sharePic.mainImageVerticalPositioning) {
      case "TOP":
        this.sharePic.imagePosition.y = 0
        break
      case "CENTER":
        this.sharePic.imagePosition.y = (this.imageHeight-this.sharePic.mainImageHeight)/2
        break
      case "BOTTOM":
        this.sharePic.imagePosition.y = (this.imageHeight-this.sharePic.mainImageHeight)
        break
    }
  }

  selectColor(event: MouseEvent) {
    if (this.generalService.choosingBalanceColor) {
      this.generalService.choosingBalanceColor = false

      const canvas = document.createElement('canvas')
      canvas.width = this.image.naturalWidth
      canvas.height = this.image.naturalHeight
      const context = canvas.getContext('2d')
      if (context !== null) {
        context.drawImage(this.image, 0, 0)
        const colors = context.getImageData(Math.round(event.offsetX*this.image.naturalHeight/this.sharePic.mainImageHeight), Math.round(event.offsetY*this.image.naturalHeight/this.sharePic.mainImageHeight), 1, 1).data
        this.sharePic.balance = [colors[0]/255, colors[1]/255, colors[2]/255]
      }

      this.applyFilters()
    }
  }

  activateDragging(event: MouseEvent) {
    if (!this.generalService.choosingBalanceColor)  {
      this.grabStatusChange.emit(true)

      this.draggingElement = this.mainImageCanvas.nativeElement
      this.dragStartPosition.x = event.clientX
      this.dragStartPosition.y = event.clientY
      this.imageStartPosition.x = this.sharePic.imagePosition.x
      this.imageStartPosition.y = this.sharePic.imagePosition.y
    }

    event.preventDefault()  
  }

  @HostListener('window:mousemove', ['$event'])
  drag(event: MouseEvent) {
    if (this.draggingElement !== null) {
      const img = this.draggingElement

      this.sharePic.imagePosition.x = (event.clientX-this.dragStartPosition.x) / this.scaleFactor + this.imageStartPosition.x
      this.sharePic.imagePosition.y = (event.clientY-this.dragStartPosition.y) / this.scaleFactor + this.imageStartPosition.y
      this.snapHorizontal()
      this.snapVertical()

      event.preventDefault()
    }
  }

  @HostListener('mouseup', ['$event'])
  deactivateDragging(event: MouseEvent) {
    this.grabStatusChange.emit(false)

    this.draggingElement = null

    this.generalService.syncLocalSharePicSets()
  }

  zoom(event: WheelEvent) {
    const img = this.mainImageCanvas.nativeElement

    const changeFactor = event.deltaY < 0 ? 1.05 : 1/1.05

    this.sharePic.mainImageHeight *= changeFactor

    this.sharePic.imagePosition.x -= (changeFactor - 1) * event.offsetX
    this.sharePic.imagePosition.y -= (changeFactor - 1) * event.offsetY

    // Snapping in zoom direction
    if (Math.abs(this.imageHeight - this.sharePic.mainImageHeight) < 1) {
      this.sharePic.mainImageSize = "FULL_HEIGHT"
      this.sharePic.mainImageHeight = this.imageHeight
    } else if (Math.abs(1200 - this.sharePic.mainImageHeight/this.image.naturalHeight*this.image.naturalWidth) < 1) {
      this.sharePic.mainImageSize = "FULL_WIDTH"
      this.sharePic.mainImageHeight = 1200/this.image.naturalWidth*this.image.naturalHeight
    } else {
      this.sharePic.mainImageSize = "INDIVIDUAL"
    }

    this.snapHorizontal(1)
    this.snapVertical(1)

    this.generalService.syncLocalSharePicSets()
  }

  touchStartEnd(e: TouchEvent) {
    this.activeTouches = e.touches.length
    
    if (e.touches.length == 0) {
      this.generalService.syncLocalSharePicSets()
    } else if (e.touches.length == 1) {
      this.touchStartPosition.x = e.touches[0].clientX
      this.touchStartPosition.y = e.touches[0].clientY
    } else if (e.touches.length >= 2) {
      this.touchStartPosition.x = (e.touches[0].clientX + e.touches[1].clientX) / 2
      this.touchStartPosition.y = (e.touches[0].clientY + e.touches[1].clientY) / 2
      this.touchStartDistance = Math.sqrt((e.touches[0].clientX - e.touches[1].clientX)**2 + (e.touches[0].clientY - e.touches[1].clientY)**2)
    }

    // @ts-ignore
    const boundingRect = e.target.getBoundingClientRect();
    this.touchStartOffset.x = this.touchStartPosition.x - boundingRect.x
    this.touchStartOffset.y = this.touchStartPosition.y - boundingRect.y

    this.imageStartPosition.x = this.sharePic.imagePosition.x
    this.imageStartPosition.y = this.sharePic.imagePosition.y
    this.imageStartHeight = this.sharePic.mainImageHeight

    e.preventDefault()
  }

  touchMove(e: TouchEvent) {
    if (e.touches.length != this.activeTouches) return

    const img = this.image
    
    if (e.touches.length == 1) {
      const touchPositionX = e.touches[0].clientX
      const touchPositionY = e.touches[0].clientY

      this.sharePic.imagePosition.x = (touchPositionX-this.touchStartPosition.x) / this.scaleFactor + this.imageStartPosition.x
      this.sharePic.imagePosition.y = (touchPositionY-this.touchStartPosition.y) / this.scaleFactor + this.imageStartPosition.y
    } else if (e.touches.length >= 2) {
      const touchPositionX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const touchPositionY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const touchDistance = Math.sqrt((e.touches[0].clientX - e.touches[1].clientX)**2 + (e.touches[0].clientY - e.touches[1].clientY)**2)

      this.sharePic.imagePosition.x = (touchPositionX-this.touchStartPosition.x) / this.scaleFactor + this.imageStartPosition.x
      this.sharePic.imagePosition.y = (touchPositionY-this.touchStartPosition.y) / this.scaleFactor + this.imageStartPosition.y
  
      const changeFactor = touchDistance / this.touchStartDistance
      this.sharePic.imagePosition.x -= (changeFactor - 1) * this.touchStartOffset.x / this.scaleFactor
      this.sharePic.imagePosition.y -= (changeFactor - 1) * this.touchStartOffset.y / this.scaleFactor
      this.sharePic.mainImageHeight = this.imageStartHeight * changeFactor
  
      // Snapping in zoom direction
      if (Math.abs(this.imageHeight - this.sharePic.mainImageHeight) < 50) {
        this.sharePic.mainImageSize = "FULL_HEIGHT"
        this.sharePic.mainImageHeight = this.imageHeight
      } else if (Math.abs(1200 - this.sharePic.mainImageHeight/img.naturalHeight*img.naturalWidth) < 50) {
        this.sharePic.mainImageSize = "FULL_WIDTH"
        this.sharePic.mainImageHeight = 1200/img.naturalWidth*img.naturalHeight
      } else {
        this.sharePic.mainImageSize = "INDIVIDUAL"
      }
    }

    this.snapHorizontal()
    this.snapVertical()

    e.preventDefault()
  }

  getOffsetOfTouchEvent(e: TouchEvent) {
    // @ts-ignore
    const {x, y, width, height} = e.target.getBoundingClientRect();

    const offsets = [];

    for (const touch of Array.from(e.touches)) {
      offsets.push({
        // @ts-ignore
        x: (touch.clientX-x)/width*e.target.offsetWidth,
        // @ts-ignore
        y: (touch.clientY-y)/height*e.target.offsetHeight
      })
    }

    return offsets;
  }

  snapHorizontal(tolerance: number = 20) {
    const img = this.mainImageCanvas.nativeElement

    // Snapping in horizontal direction
    if (Math.abs(this.sharePic.imagePosition.x) < tolerance) {
      this.sharePic.imagePosition.x = 0
      this.sharePic.mainImageHorizontalPositioning = "LEFT"
    } else if (Math.abs(this.sharePic.imagePosition.x - (1200-this.sharePic.mainImageHeight/this.image.naturalHeight*this.image.naturalWidth)/2) < tolerance) {
      this.sharePic.imagePosition.x = (1200-this.sharePic.mainImageHeight/this.image.naturalHeight*this.image.naturalWidth)/2
      this.sharePic.mainImageHorizontalPositioning = "CENTER"
    } else if (Math.abs(this.sharePic.imagePosition.x - (1200-this.sharePic.mainImageHeight/this.image.naturalHeight*this.image.naturalWidth)) < tolerance) {
      this.sharePic.imagePosition.x = (1200-this.sharePic.mainImageHeight/this.image.naturalHeight*this.image.naturalWidth)
      this.sharePic.mainImageHorizontalPositioning = "RIGHT"
    } else {
      this.sharePic.mainImageHorizontalPositioning = "INDIVIDUAL"
    }
  }

  snapVertical(tolerance: number = 20) {
    const img = this.mainImageCanvas.nativeElement

    // Snapping in vertical direction
    if (Math.abs(this.sharePic.imagePosition.y) < tolerance) {
      this.sharePic.imagePosition.y = 0
      this.sharePic.mainImageVerticalPositioning = "TOP"
    } else if (Math.abs(this.sharePic.imagePosition.y - (this.imageHeight - this.sharePic.mainImageHeight) / 2) < tolerance) {
      this.sharePic.imagePosition.y = (this.imageHeight - this.sharePic.mainImageHeight) / 2
      this.sharePic.mainImageVerticalPositioning = "CENTER"
    } else if (Math.abs(this.sharePic.imagePosition.y - (this.imageHeight - this.sharePic.mainImageHeight)) < tolerance) {
      this.sharePic.imagePosition.y = (this.imageHeight - this.sharePic.mainImageHeight)
      this.sharePic.mainImageVerticalPositioning = "BOTTOM"
    } else {
      this.sharePic.mainImageVerticalPositioning = "INDIVIDUAL"
    }
  }

  text2html(text: string): ListItem[] {
    const items: ListItem[] = []

    text.split("\n").forEach(row => {
      if (row[0] == "-") {
        items.push(new ListItem(row.substr(1), true))
      } else {
        items.push(new ListItem(row, false))
      }
    })

    return items
  }

  rgbToHsl(r: number, g: number, b: number){
    r /= 255, g /= 255, b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = (max + min) / 2
    let s = h
    const l = h


    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
  }

  rgb2hsv(r: number, g: number, b: number): number[] {
    r /= 255
    g /= 255
    b /= 255
    let v=Math.max(r,g,b), c=v-Math.min(r,g,b)
    let h= c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c))
    return [(h<0?h+6:h)/6, v&&c/v, v]
  }

  hsv2rgb(h: number, s: number, v: number): number[] {                              
    let f= (n: number, k=(n+h*6)%6) => v - v*s*Math.max( Math.min(k,4-k,1), 0)    
    return [Math.floor(f(5)*256), Math.floor(f(3)*256), Math.floor(f(1)*256)]
  }

  rgb2hsl(r: number, g: number, b: number): number[] {
    r /= 255
    g /= 255
    b /= 255
    let v=Math.max(r,g,b), c=v-Math.min(r,g,b), f=(1-Math.abs(v+v-c-1)); 
    let h= c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c)); 
    return [(h<0?h+6:h)/6, f ? c/f : 0, (v+v-c)/2];
  }

  hsl2rgb(h: number, s: number, l: number): number[] {
    let a= s*Math.min(l,1-l)
    let f= (n:number,k=(n+h*12)%12) => l - a*Math.max(Math.min(k-3,9-k,1),-1)
    return [Math.floor(f(0)*256), Math.floor(f(8)*256), Math.floor(f(4)*256)]
  }   
}
