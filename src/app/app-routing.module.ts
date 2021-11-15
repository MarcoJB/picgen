import { NgModule } from '@angular/core';
import { RouterModule, Routes, UrlSegment } from '@angular/router';
import {EditorComponent} from "./editor/editor.component";

const routes: Routes = [
  {
    matcher: (url: UrlSegment[]) => {
      return url.length === 1 && url[0].path.search(/^[a-z0-9]{8}$/i) === 0 ? ({consumed: url, posParams: {id: new UrlSegment(url[0].path, {})}}) : null
    },
    component: EditorComponent
  }, {
    path: "**",
    redirectTo: "",
    pathMatch: "full"
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
