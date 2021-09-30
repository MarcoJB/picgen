import {Component, ElementRef, HostListener, ViewChild} from '@angular/core';
import html2canvas from "html2canvas";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Überschrift'
  subtitle = 'Unterüberschrift'
  subtitleColor = "white"
  copyright = '© Greenpeace Karlsruhe'
  copyrightColor = "white"
  copyrightShadow = true
  logoColor = "logo_gpka_w"
  logoBackgroundColor = "#73be1e"
  saving = false
  scaleFactor = 1
  @ViewChild('mainImage')
  mainImage!: ElementRef<HTMLImageElement>
  mainImageSize = "FULL_HEIGHT"
  zoomFactor = 1
  mainImageHorizontalPositioning = "CENTER"
  mainImageVerticalPositioning = "CENTER"
  dragging = false
  dragStartPosition = {x: 0, y: 0}
  imageStartPosition = {x: 0, y: 0}

  ngOnInit() {
    this.calcScaleFactor();
  }

  @HostListener('window:resize', ['$event'])
  onResize(even:any) {
    this.calcScaleFactor()
  }

  calcScaleFactor() {
    this.scaleFactor = Math.min(1200, window.innerHeight*0.9) / 1200;
  }

  save() {
    this.saving = true;

    setTimeout(() => {
      this.saving = false;
      this.createImage()
    })
  }

  createImage() {
    // @ts-ignore
    html2canvas(document.querySelector("#previewInstagram")).then(canvas => {
      const link = document.createElement("a")
      link.setAttribute('download', 'picgen.png')
      link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png",
        "image/octet-stream"))
      link.click()
    });
  }

  loadImage(event: Event) {
    // @ts-ignore
    const file = event.target.files[0]
    const reader = new FileReader()


    reader.addEventListener("load", () => {
      if (reader.result !== null) {
        this.mainImage.nativeElement.src = reader.result.toString()
        setTimeout(() => this.resetImage())
      }
    }, false);

    if (file) {
      reader.readAsDataURL(file)
    }
  }

  resetImage() {
    this.resetImageSize(this.mainImage.nativeElement)
    this.resetHorizontalPositioning(this.mainImage.nativeElement)
    this.resetVerticalPositioning(this.mainImage.nativeElement)
  }

  resetImageSize(img: HTMLImageElement) {
    if (this.mainImageSize == "FULL_HEIGHT") {
      this.zoomFactor = 1200 / img.naturalHeight
    } else if (this.mainImageSize == "FULL_WIDTH") {
      this.zoomFactor = 1200 / img.naturalWidth
    }
  }

  resetHorizontalPositioning(img: HTMLImageElement) {
    switch (this.mainImageHorizontalPositioning) {
      case "LEFT":
        img.style.left = "0"
        break
      case "CENTER":
        img.style.left = (1200-this.zoomFactor*img.naturalWidth)/2 + "px"
        break
      case "RIGHT":
        img.style.left = (1200-this.zoomFactor*img.naturalWidth) + "px"
        break
    }
  }

  resetVerticalPositioning(img: HTMLImageElement) {
    switch (this.mainImageVerticalPositioning) {
      case "TOP":
        img.style.top = "0"
        break
      case "CENTER":
        img.style.top = (1200-this.zoomFactor*img.naturalHeight)/2 + "px"
        break
      case "BOTTOM":
        img.style.top = (1200-this.zoomFactor*img.naturalHeight) + "px"
        break
    }
  }

  activateDragging(event: MouseEvent) {
    this.dragging = true
    this.dragStartPosition.x = event.clientX
    this.dragStartPosition.y = event.clientY
    this.imageStartPosition.x = parseFloat(this.mainImage.nativeElement.style.left)
    this.imageStartPosition.y = parseFloat(this.mainImage.nativeElement.style.top)

    event.preventDefault()
  }

  drag(event: MouseEvent) {
    if (this.dragging) {
      const img = this.mainImage.nativeElement

      img.style.left = this.imageStartPosition.x + (event.clientX - this.dragStartPosition.x) / this.scaleFactor + "px"
      img.style.top = this.imageStartPosition.y + (event.clientY - this.dragStartPosition.y) / this.scaleFactor + "px"

      this.snapHorizontal()
      this.snapVertical()

      event.preventDefault()
    }
  }

  deactivateDragging() {
    this.dragging = false
  }

  zoom(event: WheelEvent) {
    const img = this.mainImage.nativeElement

    const imagePos = {
      x: event.layerX/this.zoomFactor,
      y: event.layerY/this.zoomFactor
    }

    if (event.deltaY < 0) {
      this.zoomFactor *= 1.05
    } else {
      this.zoomFactor /= 1.05
    }

    const newPosition = {
      x: this.zoomFactor*imagePos.x,
      y: this.zoomFactor*imagePos.y
    }

    img.style.left = parseFloat(img.style.left) - (newPosition.x - event.layerX) + "px"
    img.style.top = parseFloat(img.style.top) - (newPosition.y - event.layerY) + "px"

    // Snapping in zoom direction
    if (Math.abs(1200 - this.zoomFactor*img.naturalHeight) < 1) {
      this.mainImageSize = "FULL_HEIGHT"
      this.zoomFactor = 1200/img.naturalHeight
    } else if (Math.abs(1200 - this.zoomFactor*img.naturalWidth) < 1) {
      this.mainImageSize = "FULL_WIDTH"
      this.zoomFactor = 1200/img.naturalWidth
    } else {
      this.mainImageSize = "INDIVIDUAL"
    }

    this.snapHorizontal(1)
    this.snapVertical(1)
  }

  snapHorizontal(tolerance: number = 10) {
    const img = this.mainImage.nativeElement

    // Snapping in horizontal direction
    if (Math.abs(parseFloat(img.style.left)) < tolerance) {
      img.style.left = "0"
      this.mainImageHorizontalPositioning = "LEFT"
    } else if (Math.abs(parseFloat(img.style.left) - (1200-this.zoomFactor*img.naturalWidth)/2) < tolerance) {
      img.style.left = (1200-this.zoomFactor*img.naturalWidth)/2 + "px"
      this.mainImageHorizontalPositioning = "CENTER"
    } else if (Math.abs(parseFloat(img.style.left) - (1200-this.zoomFactor*img.naturalWidth)) < tolerance) {
      img.style.left = (1200-this.zoomFactor*img.naturalWidth) + "px"
      this.mainImageHorizontalPositioning = "RIGHT"
    } else {
      this.mainImageHorizontalPositioning = "INDIVIDUAL"
    }
  }

  snapVertical(tolerance: number = 10) {
    const img = this.mainImage.nativeElement

    // Snapping in vertical direction
    if (Math.abs(parseFloat(img.style.top)) < tolerance) {
      img.style.top = "0"
      this.mainImageVerticalPositioning = "TOP"
    } else if (Math.abs(parseFloat(img.style.top) - (1200 - this.zoomFactor * img.naturalHeight) / 2) < tolerance) {
      img.style.top = (1200 - this.zoomFactor * img.naturalHeight) / 2 + "px"
      this.mainImageVerticalPositioning = "CENTER"
    } else if (Math.abs(parseFloat(img.style.top) - (1200 - this.zoomFactor * img.naturalHeight)) < tolerance) {
      img.style.top = (1200 - this.zoomFactor * img.naturalHeight) + "px"
      this.mainImageVerticalPositioning = "BOTTOM"
    } else {
      this.mainImageVerticalPositioning = "INDIVIDUAL"
    }
  }
}
