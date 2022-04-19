import {Component, ElementRef, HostBinding, HostListener, Input, Output, OnInit, ViewChild, EventEmitter} from '@angular/core';
import {SharePic} from "../datatypes/SharePic";
import {ListItem} from "../datatypes/ListItem";
import {GeneralService} from '../general.service';

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
  preRenderCanvas: HTMLCanvasElement
  preRenderCtx: CanvasRenderingContext2D | null
  canvas!: HTMLCanvasElement
  ctx!: CanvasRenderingContext2D | null
  

  @HostBinding('class.grabbing') draggingElement: HTMLCanvasElement|null = null

  constructor(private generalService: GeneralService,
  private hostRef:ElementRef) {
    this.image = document.createElement("img")
    this.preRenderCanvas = document.createElement("canvas")
    this.preRenderCtx = this.preRenderCanvas.getContext("2d")
  }

  ngOnInit() {
    setTimeout(() => {
      this.changeFormat()

      this.canvas = this.mainImageCanvas.nativeElement
      this.ctx = this.canvas.getContext("2d")

      this.image.src = this.sharePic.mainImage
      this.image.addEventListener("load", () => {
        this.preRenderCanvas.height = this.image.naturalHeight
        this.preRenderCanvas.width = this.image.naturalWidth
        this.canvas.height = this.image.naturalHeight
        this.canvas.width = this.image.naturalWidth
        
        this.preRenderCtx?.drawImage(this.image, 0, 0)
        this.resetImage()

        this.applyBalanceFilter()
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
    if (this.sharePic.mainImageSize == "FULL_HEIGHT") {
      this.sharePic.mainImageHeight = this.imageHeight
    } else if (this.sharePic.mainImageSize == "FULL_WIDTH") {
      this.sharePic.mainImageHeight = 1200 / this.image.naturalWidth * this.image.naturalHeight
    }
  }

  applyFilters() {
    if (this.ctx !== null) {
      this.ctx.filter = `brightness(${this.sharePic.filterBrightness}) contrast(${this.sharePic.filterContrast}) saturate(${this.sharePic.filterSaturation})`
      this.ctx.drawImage(this.preRenderCanvas, 0, 0)
    }

    this.generalService.syncLocalSharePicSets()
  }

  resetHorizontalPositioning() {
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
      const x = Math.round(event.offsetX*this.image.naturalHeight/this.sharePic.mainImageHeight)
      const y = Math.round(event.offsetY*this.image.naturalHeight/this.sharePic.mainImageHeight)
      this.applyBalanceFilter(x, y)
      this.applyFilters()
    }
  }

  applyBalanceFilter(refX?: number, refY?: number) {
    if (this.preRenderCtx !== null) {
        this.preRenderCtx.drawImage(this.image, 0, 0)
        const imageData = this.preRenderCtx.getImageData(0, 0, this.image.naturalWidth, this.image.naturalHeight)
        const raw = imageData.data

        if (refX !== undefined && refY !== undefined) {
          const pointerIndex = (refY*this.image.naturalWidth + refX) * 4
          this.sharePic.filterBalance = [raw[pointerIndex], raw[pointerIndex+1], raw[pointerIndex+2]]
        }

        const grayAvg = this.sharePic.filterBalance.reduce((partialSum, a) => partialSum + a, 0) / 3

        for (let i = 0; i < raw.length; i += 4) {
          for (let color = 0; color < 3; color++) {
            if (raw[i+color] <= this.sharePic.filterBalance[color]) {
              raw[i+color] *= grayAvg/this.sharePic.filterBalance[color]
            } else {
              raw[i+color] = 255 - (255-raw[i+color])*(255-grayAvg)/(255-this.sharePic.filterBalance[color])
            }
          }
        }

        this.preRenderCtx.putImageData(imageData, 0, 0)
      }
  }
  
  @HostListener('window:click', ['$event'])
  onClick(e: MouseEvent) {
    if (this.generalService.choosingBalanceColor) {
      this.generalService.choosingBalanceColor = false
      e.preventDefault()
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

  touchStart(e: TouchEvent) {
    if (!this.generalService.choosingBalanceColor) {
      this.touchesChanged(e)
    } else {
      this.generalService.choosingBalanceColor = false

      // @ts-ignore
      const boundingRect = e.target.getBoundingClientRect();
      const touchOffsetX = Math.round((e.touches[0].clientX - boundingRect.x)*this.image.naturalHeight/this.sharePic.mainImageHeight/this.scaleFactor)
      const touchOffsetY = Math.round((e.touches[0].clientY - boundingRect.y)*this.image.naturalHeight/this.sharePic.mainImageHeight/this.scaleFactor)
      this.applyBalanceFilter(touchOffsetX, touchOffsetY)
      this.applyFilters()
    }

    e.preventDefault()
  }

  touchEnd(e: TouchEvent) {
    this.touchesChanged(e)

    e.preventDefault()
  }

  touchesChanged(e: TouchEvent) {
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
  }

  touchMove(e: TouchEvent) {
    if (e.touches.length != this.activeTouches) return
    
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
      } else if (Math.abs(1200 - this.sharePic.mainImageHeight/this.image.naturalHeight*this.image.naturalWidth) < 50) {
        this.sharePic.mainImageSize = "FULL_WIDTH"
        this.sharePic.mainImageHeight = 1200/this.image.naturalWidth*this.image.naturalHeight
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
}
