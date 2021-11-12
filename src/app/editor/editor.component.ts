import {Component, ElementRef, HostBinding, HostListener, OnInit, ViewChildren, QueryList} from '@angular/core';
import html2canvas from "html2canvas";
import {ListItem} from "../../datatypes/ListItem";
import {SharePic} from "../../datatypes/SharePic";
import { GeneralService } from '../general.service';
import { SharepicPreviewComponent } from '../sharepic-preview/sharepic-preview.component';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {
  smallScreen = window.innerWidth < 800
  sharePics: SharePic[] = []
  activeSharePic: number = 0
  fileDragging = false
  exporting = false
  @ViewChildren("SharePic") sharePicReferences!: QueryList<SharepicPreviewComponent>;

  @HostBinding('class.grabbing') grabbing: boolean = false

  constructor(public generalService: GeneralService) { }

  ngOnInit() {
    this.sharePics.push(new SharePic())
  }

  @HostListener('window:resize', ['$event'])
  onResize(even:any) {
    this.smallScreen = window.innerWidth < 800
  }

  @HostListener('window:dragenter', ['$event'])
  dragenter(event: DragEvent) {
    this.fileDragging = true
    event.preventDefault()
    event.stopPropagation()
  }

  @HostListener('window:dragleave', ['$event'])
  dragleave(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  @HostListener('window:dragover', ['$event'])
  dragover(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  @HostListener('window:drop', ['$event'])
  dropFile(event: DragEvent) {
    this.fileDragging = false
    event.preventDefault()
    event.stopPropagation()

    if (event.dataTransfer) {
      this.loadImage(event.dataTransfer.files[0])
    }
  }

  triggerChangeFormatEvent() {
    this.sharePicReferences.toArray().forEach((sharepicPrevieew: SharepicPreviewComponent) => {
      sharepicPrevieew.changeFormat()
    })
  }

  fileSelected(event: Event) {
    // @ts-ignore
    this.loadImage(event.target.files[0])
  }

  loadImage(image: File) {
    // this.mainImageFileName = image.name
    const reader = new FileReader()

    reader.addEventListener("load", () => {
      if (reader.result !== null) {
        this.sharePics[this.activeSharePic].mainImage = reader.result.toString()
        this.triggerChangeFormatEvent()
      }
    }, false)

    if (image) {
      reader.readAsDataURL(image)
    }
  }

  newSharePic() {
    this.sharePics.push(new SharePic())
    this.activeSharePic++
  }

  deleteSharePic() {
    this.sharePics.splice(this.activeSharePic, 1)

    if (this.sharePics.length == 0) {
      this.sharePics.push(new SharePic())
    } else if (this.activeSharePic >= this.sharePics.length) {
      this.activeSharePic = this.sharePics.length - 1
    }
  }

  exportActiveSharePic() {
    this.sharePicReferences.toArray()[this.activeSharePic].saving = true;
    this.exporting = true;

    setTimeout(() => {
      this.sharePicReferences.toArray()[this.activeSharePic].saving = false;
      this.createImage()
    }, 100)
  }

  createImage() {
    html2canvas(this.sharePicReferences.toArray()[this.activeSharePic].preview.nativeElement).then(canvas => {
      const link = document.createElement("a")
      link.setAttribute('download', this.sharePics[this.activeSharePic].exportName + '.jpg')
      link.setAttribute('href', canvas.toDataURL("image/jpeg", 0.8).replace("image/jpeg",
        "image/octet-stream"))
      link.click()
      this.exporting = false;
    });
  }
}
