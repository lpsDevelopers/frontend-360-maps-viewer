import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenHotspotComponent } from './open-hotspot.component';

describe('OpenHotspotComponent', () => {
  let component: OpenHotspotComponent;
  let fixture: ComponentFixture<OpenHotspotComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OpenHotspotComponent]
    });
    fixture = TestBed.createComponent(OpenHotspotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
