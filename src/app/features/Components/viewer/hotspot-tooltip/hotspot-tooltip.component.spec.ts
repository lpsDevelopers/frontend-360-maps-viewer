import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotspotTooltipComponent } from './hotspot-tooltip.component';

describe('HotspotTooltipComponent', () => {
  let component: HotspotTooltipComponent;
  let fixture: ComponentFixture<HotspotTooltipComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HotspotTooltipComponent]
    });
    fixture = TestBed.createComponent(HotspotTooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
