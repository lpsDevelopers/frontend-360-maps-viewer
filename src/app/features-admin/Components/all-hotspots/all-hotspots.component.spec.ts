import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllHotspotsComponent } from './all-hotspots.component';

describe('AllHotspotsComponent', () => {
  let component: AllHotspotsComponent;
  let fixture: ComponentFixture<AllHotspotsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AllHotspotsComponent]
    });
    fixture = TestBed.createComponent(AllHotspotsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
