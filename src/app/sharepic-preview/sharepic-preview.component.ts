import {Component, ElementRef, HostBinding, HostListener, Input, Output, OnInit, ViewChild, EventEmitter, AfterViewInit} from '@angular/core';
import {SharePic} from "../../datatypes/SharePic";
import html2canvas from "html2canvas";
import {ListItem} from "../../datatypes/ListItem";
import { GeneralService } from '../general.service';

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
  @ViewChild('mainImage') mainImage!: ElementRef<HTMLImageElement>
  @ViewChild('previewContainer') previewContainer!: ElementRef<HTMLDivElement>
  @ViewChild('preview') preview!: ElementRef<HTMLDivElement>
  dragStartPosition = {x: 0, y: 0}
  imageStartPosition = {x: 0, y: 0}
  sharePicHeight = 1200
  imageHeight = 1200
  exporting = false

  @HostBinding('class.grabbing') draggingElement: HTMLImageElement|null = null

  constructor(private generalService: GeneralService,
              private hostRef:ElementRef) { }

  ngOnInit() {
    setTimeout(() => {
      this.changeFormat()
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
    const img = this.mainImage.nativeElement

    if (this.sharePic.mainImageSize == "FULL_HEIGHT") {
      this.sharePic.mainImageHeight = this.imageHeight
    } else if (this.sharePic.mainImageSize == "FULL_WIDTH") {
      this.sharePic.mainImageHeight = 1200 / img.naturalWidth * img.naturalHeight
    }
  }

  resetHorizontalPositioning() {
    const img = this.mainImage.nativeElement

    switch (this.sharePic.mainImageHorizontalPositioning) {
      case "LEFT":
        this.sharePic.imagePosition.x = 0
        break
      case "CENTER":
        this.sharePic.imagePosition.x = (1200-this.sharePic.mainImageHeight/img.naturalHeight*img.naturalWidth)/2
        break
      case "RIGHT":
        this.sharePic.imagePosition.x = (1200-this.sharePic.mainImageHeight/img.naturalHeight*img.naturalWidth)
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

  activateDragging(event: MouseEvent, imageElement: HTMLImageElement) {
    this.grabStatusChange.emit(true)

    this.draggingElement = imageElement
    this.dragStartPosition.x = event.clientX
    this.dragStartPosition.y = event.clientY
    this.imageStartPosition.x = this.sharePic.imagePosition.x
    this.imageStartPosition.y = this.sharePic.imagePosition.y

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
    const img = this.mainImage.nativeElement

    const changeFactor = event.deltaY < 0 ? 1.05 : 1/1.05

    this.sharePic.mainImageHeight *= changeFactor

    this.sharePic.imagePosition.x -= (changeFactor - 1) * event.offsetX
    this.sharePic.imagePosition.y -= (changeFactor - 1) * event.offsetY

    // Snapping in zoom direction
    if (Math.abs(this.imageHeight - this.sharePic.mainImageHeight) < 1) {
      this.sharePic.mainImageSize = "FULL_HEIGHT"
      this.sharePic.mainImageHeight = this.imageHeight
    } else if (Math.abs(1200 - this.sharePic.mainImageHeight/img.naturalHeight*img.naturalWidth) < 1) {
      this.sharePic.mainImageSize = "FULL_WIDTH"
      this.sharePic.mainImageHeight = 1200/img.naturalWidth*img.naturalHeight
    } else {
      this.sharePic.mainImageSize = "INDIVIDUAL"
    }

    this.snapHorizontal(1)
    this.snapVertical(1)

    this.generalService.syncLocalSharePicSets()
  }

  snapHorizontal(tolerance: number = 20) {
    const img = this.mainImage.nativeElement

    // Snapping in horizontal direction
    if (Math.abs(this.sharePic.imagePosition.x) < tolerance) {
      this.sharePic.imagePosition.x = 0
      this.sharePic.mainImageHorizontalPositioning = "LEFT"
    } else if (Math.abs(this.sharePic.imagePosition.x - (1200-this.sharePic.mainImageHeight/img.naturalHeight*img.naturalWidth)/2) < tolerance) {
      this.sharePic.imagePosition.x = (1200-this.sharePic.mainImageHeight/img.naturalHeight*img.naturalWidth)/2
      this.sharePic.mainImageHorizontalPositioning = "CENTER"
    } else if (Math.abs(this.sharePic.imagePosition.x - (1200-this.sharePic.mainImageHeight/img.naturalHeight*img.naturalWidth)) < tolerance) {
      this.sharePic.imagePosition.x = (1200-this.sharePic.mainImageHeight/img.naturalHeight*img.naturalWidth)
      this.sharePic.mainImageHorizontalPositioning = "RIGHT"
    } else {
      this.sharePic.mainImageHorizontalPositioning = "INDIVIDUAL"
    }
  }

  snapVertical(tolerance: number = 20) {
    const img = this.mainImage.nativeElement

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
