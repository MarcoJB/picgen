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
  bgImage = 'https://www.unverpackt-foodcoop.de/images/IMG_4778.png'

  save() {
    // @ts-ignore
    html2canvas(document.querySelector("#mainImage")).then(canvas => {
      const link = document.createElement("a")
      link.setAttribute('download', 'picgen.png');
      link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png",
        "image/octet-stream"));
      link.click();
    });
  }
}
