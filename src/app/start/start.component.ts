import { Component, OnInit } from '@angular/core';
import { GeneralService } from '../general.service';

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.css']
})
export class StartComponent implements OnInit {
  newSharePicSetId: string;

  constructor(public generalService: GeneralService) {
    this.newSharePicSetId = generalService.createId()
  }

  ngOnInit(): void { }

}
