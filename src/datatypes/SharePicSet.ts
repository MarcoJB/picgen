import { SharePic } from "./SharePic"
import { Type } from 'class-transformer';


export class SharePicSet {
  id: string
  
  @Type(() => SharePic)
  sharePics: SharePic[]

  constructor(id: string) {
    this.id = id
    this.sharePics = []
  }
}
