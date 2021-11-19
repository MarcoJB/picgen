import {Component, ElementRef, HostBinding, HostListener, OnInit, ViewChildren, QueryList} from '@angular/core';
import html2canvas from "html2canvas";
import {ListItem} from "../../datatypes/ListItem";
import {SharePic} from "../../datatypes/SharePic";
import { GeneralService } from '../general.service';
import { SharepicPreviewComponent } from '../sharepic-preview/sharepic-preview.component';
import { Router, ActivatedRoute } from '@angular/router'
import { SharePicSet } from 'src/datatypes/SharePicSet';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {
  smallScreen = window.innerWidth < 800
  sharePicSet!: SharePicSet
  activeSharePic: number = 0
  fileDragging = false
  exporting = false
  @ViewChildren("SharePic") sharePicReferences!: QueryList<SharepicPreviewComponent>;

  @HostBinding('class.grabbing') grabbing: boolean = false

  constructor(public generalService: GeneralService,
    private route: ActivatedRoute,
    private router: Router) {
    
    const sharePicSetId = this.route.snapshot.paramMap.get('id')
    // @ts-ignore
    const sharePicSet = this.generalService.getLocalSharePicSetById(sharePicSetId)
    if (sharePicSet !== null) {
      this.sharePicSet = sharePicSet
    } else {
      // @ts-ignore
      this.sharePicSet = new SharePicSet(sharePicSetId)
      this.sharePicSet.sharePics.push(new SharePic())
      this.generalService.localSharePicSets.push(this.sharePicSet)
      this.generalService.syncLocalSharePicSets()
    }

    const pageParam = parseInt(this.route.snapshot.paramMap.get('page')||"0")
    if (!isNaN(pageParam) && pageParam <= this.sharePicSet.sharePics.length) {
      this.switchActiveSharePic(pageParam-1, false)
    }
  }

  ngOnInit() { }

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

  switchActiveSharePic(activeSharePic: number, relative: boolean = true) {
    if (relative) {
      activeSharePic += this.activeSharePic
    }

    if (activeSharePic < 0) activeSharePic = 0
    else if (activeSharePic >= this.sharePicSet.sharePics.length) activeSharePic = this.sharePicSet.sharePics.length-1

    this.activeSharePic = activeSharePic
    if (this.activeSharePic == 0) {
      this.router.navigate([this.sharePicSet.id]);
    } else {
      this.router.navigate([this.sharePicSet.id, activeSharePic+1]);
    }
  }

  triggerChangeFormatEvent() {
    this.sharePicReferences.toArray().forEach((sharepicPreview: SharepicPreviewComponent) => {
      sharepicPreview.changeFormat()
    })
  }

  fileSelected(event: Event) {
    // @ts-ignore
    this.loadImage(event.target.files[0])
  }

  loadImage(image: File) {
    const reader = new FileReader()

    reader.addEventListener("load", () => {
      if (reader.result !== null) {
        this.sharePicSet.sharePics[this.activeSharePic].mainImage = reader.result.toString()
        this.triggerChangeFormatEvent()
        this.generalService.syncLocalSharePicSets()
      }
    }, false)

    if (image) {
      reader.readAsDataURL(image)
    }
  }

  newSharePic() {
    this.sharePicSet.sharePics.push(new SharePic())
    this.switchActiveSharePic(+1)
  }

  deleteSharePic() {
    // if sharepic unmodified or confirmation is given
    if (JSON.stringify(this.sharePicSet.sharePics[this.activeSharePic]) == JSON.stringify(new SharePic())
          || confirm("Willst du dieses Bild wirklich löschen?")) {
      this.sharePicSet.sharePics.splice(this.activeSharePic, 1)

      if (this.sharePicSet.sharePics.length == 0) {
        this.sharePicSet.sharePics.push(new SharePic())
      } else if (this.activeSharePic >= this.sharePicSet.sharePics.length) {
        this.switchActiveSharePic(-1)
      }
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
      link.setAttribute('download', this.sharePicSet.sharePics[this.activeSharePic].exportName + '.jpg')
      link.setAttribute('href', canvas.toDataURL("image/jpeg", 0.8).replace("image/jpeg",
        "image/octet-stream"))
      link.click()
      this.exporting = false;
    });
  }
}
