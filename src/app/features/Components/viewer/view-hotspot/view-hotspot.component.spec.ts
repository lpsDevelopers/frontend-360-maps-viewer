import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewHotspotComponent } from './view-hotspot.component';

describe('ViewHotspotComponent', () => {
  let component: ViewHotspotComponent;
  let fixture: ComponentFixture<ViewHotspotComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ViewHotspotComponent]
    });
    fixture = TestBed.createComponent(ViewHotspotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
