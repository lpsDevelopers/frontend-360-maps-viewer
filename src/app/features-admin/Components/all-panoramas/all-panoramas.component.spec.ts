import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllPanoramasComponent } from './all-panoramas.component';

describe('AllPanoramasComponent', () => {
  let component: AllPanoramasComponent;
  let fixture: ComponentFixture<AllPanoramasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AllPanoramasComponent]
    });
    fixture = TestBed.createComponent(AllPanoramasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
