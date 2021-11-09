import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharepicPreviewComponent } from './sharepic-preview.component';

describe('SharepicPreviewComponent', () => {
  let component: SharepicPreviewComponent;
  let fixture: ComponentFixture<SharepicPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SharepicPreviewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SharepicPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
