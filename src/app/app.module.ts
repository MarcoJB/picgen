import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {FormsModule} from "@angular/forms";
import { EditorComponent } from './editor/editor.component';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatSelectModule} from "@angular/material/select";
import {MatInputModule} from "@angular/material/input";
import {MatDividerModule} from "@angular/material/divider";
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatListModule} from "@angular/material/list";
import {SharepicPreviewComponent} from './sharepic-preview/sharepic-preview.component';
import {MatMenuModule} from '@angular/material/menu';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {StartComponent} from './start/start.component';
import {MatCardModule} from '@angular/material/card';
import {MatSliderModule} from '@angular/material/slider';

@NgModule({
  declarations: [
    AppComponent,
    EditorComponent,
    SharepicPreviewComponent,
    StartComponent
  ],
    imports: [
      BrowserModule,
      FormsModule,
      AppRoutingModule,
      BrowserAnimationsModule,
      MatToolbarModule,
      MatSidenavModule,
      MatSelectModule,
      MatInputModule,
      MatDividerModule,
      MatButtonToggleModule,
      MatSlideToggleModule,
      MatIconModule,
      MatButtonModule,
      MatProgressSpinnerModule,
      MatListModule,
      MatMenuModule,
      MatAutocompleteModule,
      MatCardModule,
      MatSliderModule
    ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
