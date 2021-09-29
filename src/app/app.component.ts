import {Component, ElementRef, HostListener, ViewChild} from '@angular/core';
import html2canvas from "html2canvas";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Überschrift';
  subtitle = 'Unterüberschrift';
  copyright = '© Greenpeace Karlsruhe'
  logoColor = "logo_gpka_gw"
  saving = false;
  scaleFactor = 1;
  mainImageSource = "";
  @ViewChild('mainImage')
  mainImage!: ElementRef<HTMLImageElement>;
  mainImageHorizontalPositioning = "RIGHT";
  mainImageVerticalPositioning = "CENTER";

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
    const ratio = this.mainImage.nativeElement.naturalWidth / this.mainImage.nativeElement.naturalHeight

    if (ratio > 1) {
      this.mainImage.nativeElement.style.height = "1200px"
      this.mainImage.nativeElement.style.top = "0"

      switch (this.mainImageHorizontalPositioning) {
        case "LEFT":
          this.mainImage.nativeElement.style.left = "0"
          break
        case "CENTER":
          this.mainImage.nativeElement.style.left = "-" + (ratio-1)*600 + "px"
          break
        case "RIGHT":
          this.mainImage.nativeElement.style.left = "-" + (ratio-1)*1200 + "px"
          break
      }

    }
  }
}
