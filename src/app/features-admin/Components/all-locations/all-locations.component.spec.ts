import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllLocationsComponent } from './all-locations.component';

describe('AllLocationsComponent', () => {
  let component: AllLocationsComponent;
  let fixture: ComponentFixture<AllLocationsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AllLocationsComponent]
    });
    fixture = TestBed.createComponent(AllLocationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
