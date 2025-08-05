import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GetHotspotComponent } from './get-hotspot.component';

describe('GetHotspotComponent', () => {
  let component: GetHotspotComponent;
  let fixture: ComponentFixture<GetHotspotComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GetHotspotComponent]
    });
    fixture = TestBed.createComponent(GetHotspotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
