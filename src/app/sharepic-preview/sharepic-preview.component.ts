import {Component, ElementRef, HostBinding, HostListener, Input, Output, OnInit, ViewChild, EventEmitter} from '@angular/core';
import {SharePic} from "../../datatypes/SharePic";
import html2canvas from "html2canvas";
import {ListItem} from "../../datatypes/ListItem";

@Component({
  selector: 'app-sharepic-preview',
  templateUrl: './sharepic-preview.component.html',
  styleUrls: ['./sharepic-preview.component.css']
})
export class SharepicPreviewComponent implements OnInit {
  @Input() sharePic!: SharePic
  @Output() grabStatusChange = new EventEmitter<boolean>();

  saving = false
  scaleFactor = 1
  @ViewChild('mainImage') mainImage!: ElementRef<HTMLImageElement>
  @ViewChild('container') container!: ElementRef<HTMLDivElement>
  @ViewChild('preview') preview!: ElementRef<HTMLDivElement>
  dragStartPosition = {x: 0, y: 0}
  imageHeight = 1200
  exporting = false

  @HostBinding('class.grabbing') draggingElement: HTMLImageElement|null = null

  constructor() { }

  ngOnInit() {
    setTimeout(() => {
      this.calcScaleFactor()
    })
  }

  @HostListener('window:changeFormat', ['$event'])
  onChangeFormat(even:any) {
    this.changeFormat()
  }

  changeFormat() {
    if (this.sharePic.platform == "INSTAGRAM") {
      this.imageHeight = this.sharePic.cropImage ? 770 : 1200
    } else {
      this.imageHeight = this.sharePic.cropImage ? 170 : 600
    }

    setTimeout(() => {
      this.calcScaleFactor()
      this.resetImage()
    })
  }

  calcScaleFactor() {
    // @ts-ignore
    this.scaleFactor = this.container.nativeElement.offsetWidth / 1200
  }

  save() {
    this.saving = true;
    this.exporting = true;

    setTimeout(() => {
      this.saving = false;
      this.createImage()
    }, 100)
  }

  createImage() {
    // @ts-ignore
    html2canvas(this.preview.nativeElement).then(canvas => {
      const link = document.createElement("a")
      link.setAttribute('download', 'picgen.png')
      link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png",
        "image/octet-stream"))
      link.click()
      this.exporting = false;
    });
  }

  resetImage() {
    this.resetImageSize(this.mainImage.nativeElement)
    this.resetHorizontalPositioning(this.mainImage.nativeElement)
    this.resetVerticalPositioning(this.mainImage.nativeElement)
  }

  resetImageSize(img: HTMLImageElement) {
    if (this.sharePic.mainImageSize == "FULL_HEIGHT") {
      this.sharePic.zoomFactor = this.imageHeight / img.naturalHeight
    } else if (this.sharePic.mainImageSize == "FULL_WIDTH") {
      this.sharePic.zoomFactor = 1200 / img.naturalWidth
    }
  }

  resetHorizontalPositioning(img: HTMLImageElement) {
    switch (this.sharePic.mainImageHorizontalPositioning) {
      case "LEFT":
        img.style.left = "0"
        break
      case "CENTER":
        img.style.left = (1200-this.sharePic.zoomFactor*img.naturalWidth)/2 + "px"
        break
      case "RIGHT":
        img.style.left = (1200-this.sharePic.zoomFactor*img.naturalWidth) + "px"
        break
    }
  }

  resetVerticalPositioning(img: HTMLImageElement) {
    switch (this.sharePic.mainImageVerticalPositioning) {
      case "TOP":
        img.style.top = "0"
        break
      case "CENTER":
        img.style.top = (this.imageHeight-this.sharePic.zoomFactor*img.naturalHeight)/2 + "px"
        break
      case "BOTTOM":
        img.style.top = (this.imageHeight-this.sharePic.zoomFactor*img.naturalHeight) + "px"
        break
    }
  }

  activateDragging(event: MouseEvent, imageElement: HTMLImageElement) {
    this.grabStatusChange.emit(true)

    this.draggingElement = imageElement
    this.dragStartPosition.x = event.clientX
    this.dragStartPosition.y = event.clientY
    this.sharePic.imagePosition.x = parseFloat(this.draggingElement.style.left)
    this.sharePic.imagePosition.y = parseFloat(this.draggingElement.style.top)

    event.preventDefault()
  }

  @HostListener('window:mousemove', ['$event'])
  drag(event: MouseEvent) {
    if (this.draggingElement !== null) {
      const img = this.draggingElement

      img.style.left = this.sharePic.imagePosition.x + (event.clientX - this.dragStartPosition.x) / this.scaleFactor + "px"
      img.style.top = this.sharePic.imagePosition.y + (event.clientY - this.dragStartPosition.y) / this.scaleFactor + "px"

      this.snapHorizontal()
      this.snapVertical()

      event.preventDefault()
    }
  }

  @HostListener('window:mouseup', ['$event'])
  deactivateDragging(event: MouseEvent) {
    this.grabStatusChange.emit(false)

    this.sharePic.imagePosition.x += this.sharePic.imagePosition.x + (event.clientX - this.dragStartPosition.x) / this.scaleFactor
    this.sharePic.imagePosition.y += this.sharePic.imagePosition.y + (event.clientY - this.dragStartPosition.y) / this.scaleFactor
    this.draggingElement = null
  }

  zoom(event: WheelEvent) {
    const img = this.mainImage.nativeElement

    const imagePos = {
      // @ts-ignore
      x: event.layerX/this.zoomFactor,
      // @ts-ignore
      y: event.layerY/this.zoomFactor
    }

    if (event.deltaY < 0) {
      this.sharePic.zoomFactor *= 1.05
    } else {
      this.sharePic.zoomFactor /= 1.05
    }

    const newPosition = {
      x: this.sharePic.zoomFactor*imagePos.x,
      y: this.sharePic.zoomFactor*imagePos.y
    }

    // @ts-ignore
    img.style.left = parseFloat(img.style.left) - (newPosition.x - event.layerX) + "px"
    // @ts-ignore
    img.style.top = parseFloat(img.style.top) - (newPosition.y - event.layerY) + "px"

    // Snapping in zoom direction
    if (Math.abs(this.imageHeight - this.sharePic.zoomFactor*img.naturalHeight) < 1) {
      this.sharePic.mainImageSize = "FULL_HEIGHT"
      this.sharePic.zoomFactor = this.imageHeight/img.naturalHeight
    } else if (Math.abs(1200 - this.sharePic.zoomFactor*img.naturalWidth) < 1) {
      this.sharePic.mainImageSize = "FULL_WIDTH"
      this.sharePic.zoomFactor = 1200/img.naturalWidth
    } else {
      this.sharePic.mainImageSize = "INDIVIDUAL"
    }

    this.snapHorizontal(1)
    this.snapVertical(1)
  }

  snapHorizontal(tolerance: number = 20) {
    const img = this.mainImage.nativeElement

    // Snapping in horizontal direction
    if (Math.abs(parseFloat(img.style.left)) < tolerance) {
      img.style.left = "0"
      this.sharePic.mainImageHorizontalPositioning = "LEFT"
    } else if (Math.abs(parseFloat(img.style.left) - (1200-this.sharePic.zoomFactor*img.naturalWidth)/2) < tolerance) {
      img.style.left = (1200-this.sharePic.zoomFactor*img.naturalWidth)/2 + "px"
      this.sharePic.mainImageHorizontalPositioning = "CENTER"
    } else if (Math.abs(parseFloat(img.style.left) - (1200-this.sharePic.zoomFactor*img.naturalWidth)) < tolerance) {
      img.style.left = (1200-this.sharePic.zoomFactor*img.naturalWidth) + "px"
      this.sharePic.mainImageHorizontalPositioning = "RIGHT"
    } else {
      this.sharePic.mainImageHorizontalPositioning = "INDIVIDUAL"
    }
  }

  snapVertical(tolerance: number = 20) {
    const img = this.mainImage.nativeElement

    // Snapping in vertical direction
    if (Math.abs(parseFloat(img.style.top)) < tolerance) {
      img.style.top = "0"
      this.sharePic.mainImageVerticalPositioning = "TOP"
    } else if (Math.abs(parseFloat(img.style.top) - (this.imageHeight - this.sharePic.zoomFactor * img.naturalHeight) / 2) < tolerance) {
      img.style.top = (this.imageHeight - this.sharePic.zoomFactor * img.naturalHeight) / 2 + "px"
      this.sharePic.mainImageVerticalPositioning = "CENTER"
    } else if (Math.abs(parseFloat(img.style.top) - (this.imageHeight - this.sharePic.zoomFactor * img.naturalHeight)) < tolerance) {
      img.style.top = (this.imageHeight - this.sharePic.zoomFactor * img.naturalHeight) + "px"
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
