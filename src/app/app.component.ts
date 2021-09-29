import { Component } from '@angular/core';
import html2canvas from "html2canvas";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'ZERO WASTE';
  subtitle = 'Unverpackt-Foodcoop Karlsruhe';
  saving = false;

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
      link.setAttribute('download', 'picgen.png');
      link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png",
        "image/octet-stream"));
      link.click();
    });
  }
}
